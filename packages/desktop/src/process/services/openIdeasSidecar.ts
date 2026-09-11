/**
 * Own the packaged OpenIdeas (Flowise) runtime used by the Ideas desktop app.
 *
 * The runtime is produced by the OpenIdeas repository and staged under
 * resources/bundled-openideas/<platform>-<arch> before electron-builder runs.
 */

import { spawn, type ChildProcess } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import { join, resolve } from 'node:path';
import { pingOpenIdeas, type OpenIdeasEnsureResult } from '@aionui/web-host';

const OPENIDEAS_PORT = 3010;
const READY_TIMEOUT_MS = 90_000;

export type OpenIdeasRuntime = {
  directory: string;
  executable: string;
  entrypoint: string;
};

export type OpenIdeasSpawnSpec = {
  command: string;
  args: string[];
  cwd: string;
  env: NodeJS.ProcessEnv;
};

export type OpenIdeasStartResult = OpenIdeasEnsureResult & {
  sessionCookies?: string[];
};

type DesktopCredentials = {
  email: string;
  password: string;
};

type RuntimeResolveOptions = {
  env?: NodeJS.ProcessEnv;
  resourcesPath?: string;
  platform?: NodeJS.Platform;
  arch?: string;
  pathExists?: (path: string) => boolean;
};

function runtimeKey(platform: NodeJS.Platform, arch: string): string {
  return `${platform}-${arch}`;
}

/** Resolve an explicitly supplied or electron-builder-packaged runtime. */
export function resolveOpenIdeasRuntime(options: RuntimeResolveOptions = {}): OpenIdeasRuntime | null {
  const env = options.env ?? process.env;
  const platform = options.platform ?? process.platform;
  const arch = options.arch ?? process.arch;
  const pathExists = options.pathExists ?? existsSync;
  const override = env.AIONUI_OPENIDEAS_RUNTIME_DIR?.trim();
  const directory = override
    ? resolve(override)
    : options.resourcesPath
      ? join(options.resourcesPath, 'bundled-openideas', runtimeKey(platform, arch))
      : null;
  if (!directory) return null;

  const executable = join(directory, 'bin', platform === 'win32' ? 'node.exe' : 'node');
  const entrypoint = join(directory, 'server', 'bin', 'run');
  if (!pathExists(executable) || !pathExists(entrypoint)) return null;
  return { directory, executable, entrypoint };
}

/** Build the loopback-only process contract shared with the OpenIdeas exporter. */
export function buildOpenIdeasSpawnSpec(runtime: OpenIdeasRuntime, dataDirectory: string): OpenIdeasSpawnSpec {
  return {
    command: runtime.executable,
    args: [runtime.entrypoint, 'start'],
    cwd: runtime.directory,
    env: {
      ...process.env,
      HOST: '127.0.0.1',
      PORT: String(OPENIDEAS_PORT),
      APP_URL: `http://127.0.0.1:${OPENIDEAS_PORT}`,
      DATABASE_PATH: dataDirectory,
      SECRETKEY_PATH: dataDirectory,
      BLOB_STORAGE_PATH: join(dataDirectory, 'storage'),
      FLOWISE_DESKTOP_EMBEDDED: 'true',
      IFRAME_ORIGINS: '*',
      CORS_ORIGINS: 'null',
      CORS_ALLOW_CREDENTIALS: 'true',
      SECURE_COOKIES: 'false',
    },
  };
}

function desktopCredentials(dataDirectory: string): DesktopCredentials {
  const authFile = join(dataDirectory, '.ideas-desktop-auth.json');
  try {
    const parsed = JSON.parse(readFileSync(authFile, 'utf8')) as Partial<DesktopCredentials>;
    if (parsed.email && parsed.password) return { email: parsed.email, password: parsed.password };
  } catch {
    // First launch, or a damaged bootstrap file: create a new local-only secret.
  }

  const credentials = {
    email: 'ideas-desktop@local.invalid',
    password: randomBytes(32).toString('base64url'),
  };
  mkdirSync(dataDirectory, { recursive: true });
  writeFileSync(authFile, `${JSON.stringify(credentials)}\n`, { mode: 0o600 });
  return credentials;
}

function requestOpenIdeas(
  path: string,
  body?: unknown
): Promise<{ status: number; body: unknown; setCookies: string[] }> {
  const encoded = body === undefined ? undefined : JSON.stringify(body);
  return new Promise((resolveRequest, rejectRequest) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: OPENIDEAS_PORT,
        path,
        method: 'POST',
        headers: {
          accept: 'application/json',
          'x-request-from': 'internal',
          ...(encoded ? { 'content-type': 'application/json', 'content-length': Buffer.byteLength(encoded) } : {}),
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        res.on('end', () => {
          const raw = Buffer.concat(chunks).toString('utf8');
          let responseBody: unknown = raw;
          try {
            responseBody = raw ? JSON.parse(raw) : null;
          } catch {
            // Keep non-JSON error text for diagnostics.
          }
          const setCookie = res.headers['set-cookie'];
          resolveRequest({
            status: res.statusCode ?? 500,
            body: responseBody,
            setCookies: Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [],
          });
        });
      }
    );
    req.setTimeout(10_000, () => req.destroy(new Error('OpenIdeas session bootstrap timed out')));
    req.on('error', rejectRequest);
    if (encoded) req.write(encoded);
    req.end();
  });
}

async function bootstrapDesktopSession(dataDirectory: string): Promise<string[]> {
  const credentials = desktopCredentials(dataDirectory);
  const resolution = await requestOpenIdeas('/api/v1/auth/resolve');
  const redirect = (resolution.body as { redirectUrl?: unknown } | null)?.redirectUrl;
  if (redirect === '/organization-setup') {
    const registered = await requestOpenIdeas('/api/v1/account/register', {
      user: { name: 'Ideas Desktop', email: credentials.email, credential: credentials.password },
    });
    if (registered.status >= 400) {
      throw new Error(`OpenIdeas account bootstrap failed (${registered.status}): ${JSON.stringify(registered.body)}`);
    }
  }

  const login = await requestOpenIdeas('/api/v1/auth/login', credentials);
  if (login.status >= 400 || login.setCookies.length === 0) {
    throw new Error(`OpenIdeas desktop login failed (${login.status})`);
  }
  return login.setCookies;
}

async function waitForReady(child: ChildProcess, timeoutMs: number): Promise<boolean> {
  let stopped = false;
  const markStopped = () => {
    stopped = true;
  };
  child.once('error', markStopped);
  child.once('close', markStopped);
  const deadline = Date.now() + timeoutMs;
  try {
    while (Date.now() < deadline && child.exitCode === null) {
      if (stopped) return false;
      // Polling is deliberately sequential so only one health request is active.
      // eslint-disable-next-line no-await-in-loop
      if (await pingOpenIdeas({ hostname: '127.0.0.1', port: OPENIDEAS_PORT })) return true;
      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 1_500));
    }
    return false;
  } finally {
    child.removeListener('error', markStopped);
    child.removeListener('close', markStopped);
  }
}

export class OpenIdeasSidecarManager {
  private child: ChildProcess | null = null;

  async start(options: { dataDirectory: string; resourcesPath?: string }): Promise<OpenIdeasStartResult> {
    const origin = { hostname: '127.0.0.1', port: OPENIDEAS_PORT };
    if (await pingOpenIdeas(origin)) {
      return { ok: true, origin, healed: false, detail: 'using existing OpenIdeas service' };
    }

    const runtime = resolveOpenIdeasRuntime({ resourcesPath: options.resourcesPath });
    if (!runtime) {
      return { ok: false, origin, healed: false, detail: 'bundled OpenIdeas runtime is unavailable' };
    }

    const spec = buildOpenIdeasSpawnSpec(runtime, options.dataDirectory);
    const child = spawn(spec.command, spec.args, {
      cwd: spec.cwd,
      env: spec.env,
      stdio: ['ignore', 'ignore', 'pipe'],
      windowsHide: true,
    });
    this.child = child;
    child.stderr?.on('data', (chunk) => console.warn(`[OpenIdeas] ${String(chunk).trimEnd()}`));

    const ok = await waitForReady(child, Number(process.env.AIONUI_OPENIDEAS_ENSURE_TIMEOUT_MS || READY_TIMEOUT_MS));
    if (!ok) {
      return {
        ok: false,
        origin,
        healed: true,
        detail: 'bundled OpenIdeas runtime did not become ready',
      };
    }

    try {
      const sessionCookies = await bootstrapDesktopSession(options.dataDirectory);
      return {
        ok: true,
        origin,
        healed: true,
        detail: 'started bundled OpenIdeas runtime and desktop session',
        sessionCookies,
      };
    } catch (error) {
      return {
        ok: false,
        origin,
        healed: true,
        detail: `bundled OpenIdeas runtime started but session bootstrap failed: ${String(error)}`,
      };
    }
  }

  async stop(): Promise<void> {
    const child = this.child;
    this.child = null;
    if (!child || child.exitCode !== null) return;

    await new Promise<void>((resolveStop) => {
      const timeout = setTimeout(() => {
        child.kill('SIGKILL');
        resolveStop();
      }, 5_000);
      child.once('close', () => {
        clearTimeout(timeout);
        resolveStop();
      });
      child.kill('SIGTERM');
    });
  }
}
