/**
 * Ensure OpenIdeas (Flowise sidecar) is reachable for the Ideas canvas island.
 *
 * Product rule for WebUI / future DMG·EXE: when Ideas is up, OpenIdeas should
 * be up too. Today the engine still lives on :3010 (Projecto apple-container
 * or a future bundled binary). This module pings it and optionally heals.
 */

import { spawn } from 'node:child_process';
import http from 'node:http';
import { parseFlowiseOrigin, type FlowiseOrigin } from './canvas-island.js';

export type OpenIdeasEnsureResult = {
  ok: boolean;
  origin: FlowiseOrigin;
  healed: boolean;
  detail: string;
};

export type OpenIdeasEnsureOptions = {
  origin?: FlowiseOrigin;
  /** Total wait budget after an optional heal attempt. Default 90s. */
  timeoutMs?: number;
  /** Skip heal commands; ping only. */
  pingOnly?: boolean;
  /** Injected heal (tests). Default: apple-container `projecto-flowise`. */
  heal?: () => Promise<{ attempted: boolean; detail: string }>;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function openIdeasPingUrl(origin: FlowiseOrigin): string {
  return `http://${origin.hostname}:${origin.port}/api/v1/ping`;
}

export function pingOpenIdeas(origin: FlowiseOrigin, timeoutMs = 4000): Promise<boolean> {
  const url = openIdeasPingUrl(origin);
  return new Promise((resolve) => {
    const req = http.get(url, { headers: { 'x-request-from': 'internal', accept: 'application/json' } }, (res) => {
      res.resume();
      resolve((res.statusCode ?? 500) >= 200 && (res.statusCode ?? 500) < 300);
    });
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      resolve(false);
    });
    req.on('error', () => resolve(false));
  });
}

function runCommand(command: string, args: string[], timeoutMs: number): Promise<{ code: number | null; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn(command, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    child.stderr?.on('data', (chunk) => {
      stderr += String(chunk);
    });
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      resolve({ code: null, stderr: stderr || 'timed out' });
    }, timeoutMs);
    child.on('error', (err) => {
      clearTimeout(timer);
      resolve({ code: null, stderr: err.message });
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ code, stderr });
    });
  });
}

/**
 * Default heal for local Ideas / Projecto desktops: restart the apple-container
 * named `projecto-flowise`. No-op when `container` is missing (CI / Linux CI).
 */
export async function healOpenIdeasAppleContainer(): Promise<{ attempted: boolean; detail: string }> {
  if (process.env.AIONUI_OPENIDEAS_HEAL === '0') {
    return { attempted: false, detail: 'heal disabled (AIONUI_OPENIDEAS_HEAL=0)' };
  }
  const custom = process.env.AIONUI_OPENIDEAS_HEAL_CMD?.trim();
  if (custom) {
    const result = await runCommand('sh', ['-c', custom], 120_000);
    return {
      attempted: true,
      detail: result.code === 0 ? `heal cmd ok: ${custom}` : `heal cmd failed (${result.code}): ${result.stderr.trim() || custom}`,
    };
  }

  const start = await runCommand('container', ['start', 'projecto-flowise'], 60_000);
  if (start.code === 0) {
    return { attempted: true, detail: 'container start projecto-flowise' };
  }
  // Already running but wedged — stop then start.
  await runCommand('container', ['stop', 'projecto-flowise'], 60_000);
  const restart = await runCommand('container', ['start', 'projecto-flowise'], 90_000);
  return {
    attempted: true,
    detail:
      restart.code === 0
        ? 'container stop+start projecto-flowise'
        : `container restart failed: ${restart.stderr.trim() || start.stderr.trim() || 'unknown'}`,
  };
}

export async function ensureOpenIdeas(opts: OpenIdeasEnsureOptions = {}): Promise<OpenIdeasEnsureResult> {
  const origin = opts.origin ?? parseFlowiseOrigin();
  const timeoutMs = opts.timeoutMs ?? Number(process.env.AIONUI_OPENIDEAS_ENSURE_TIMEOUT_MS || 90_000);
  const now = opts.now ?? Date.now;
  const wait = opts.sleep ?? sleep;

  if (await pingOpenIdeas(origin)) {
    return { ok: true, origin, healed: false, detail: 'already reachable' };
  }

  let healed = false;
  let healDetail = 'no heal';
  if (!opts.pingOnly) {
    const heal = opts.heal ?? healOpenIdeasAppleContainer;
    const result = await heal();
    healed = result.attempted;
    healDetail = result.detail;
  }

  const deadline = now() + timeoutMs;
  while (now() < deadline) {
    if (await pingOpenIdeas(origin)) {
      return { ok: true, origin, healed, detail: healed ? healDetail : 'became reachable' };
    }
    await wait(1500);
  }

  return {
    ok: false,
    origin,
    healed,
    detail: healed ? `still unreachable after heal (${healDetail})` : 'unreachable (heal skipped or unavailable)',
  };
}
