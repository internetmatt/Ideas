import type { WebHostOptions, WebHostHandle } from './types.js';

export type { AppMetadata, BackendBinaryResolver, WebHostOptions, WebHostHandle } from './types.js';
export { startStaticServer, stopStaticServer } from './static-server.js';
export type { StaticServerOptions, StaticServerHandle } from './static-server.js';

// Backend launcher exports (M4)
export {
  BackendStartupCancelledError,
  BackendLifecycleManager,
  buildSpawnArgs,
  buildSpawnEnv,
  findAvailablePort,
  startBackend,
  stopBackend,
} from './backend-launcher.js';
export type { BackendDirConfig, BackendLaunchOptions, BackendHandle, BackendStartOptions } from './backend-launcher.js';

export {
  ensureOpenIdeas,
  healOpenIdeasAppleContainer,
  openIdeasPingUrl,
  pingOpenIdeas,
} from './openideas-ensure.js';
export type { OpenIdeasEnsureOptions, OpenIdeasEnsureResult } from './openideas-ensure.js';

/**
 * Start WebHost (main entry point).
 *
 * Orchestrates backend-launcher + static-server. web-host itself holds no
 * persistent configuration — callers (Electron main process, `bun run webui`
 * CLI) are responsible for resolving port / allowRemote from their own source
 * of truth (Electron ProcessConfig, CLI flags, env vars).
 */
export async function startWebHost(opts: WebHostOptions): Promise<WebHostHandle> {
  const { startBackend } = await import('./backend-launcher.js');
  const { startStaticServer } = await import('./static-server.js');
  const { ensureOpenIdeas } = await import('./openideas-ensure.js');

  // 1. Start backend (M4)
  let backendHandle;
  if (opts.backend.kind === 'ownBackend') {
    backendHandle = await startBackend({
      app: opts.app,
      resolveBackend: opts.backend.resolveBackend,
      dataDir: opts.dataDir,
      logDir: opts.logDir,
      dirs: opts.dirs,
    });
  } else {
    // useExistingBackend: create a fake handle
    backendHandle = {
      port: opts.backend.port,
      stop: async () => {
        // no-op: external backend
      },
    };
  }

  let staticHandle;
  try {
    // 2. Start static-server (M5)
    staticHandle = await startStaticServer({
      staticDir: opts.staticDir,
      backendPort: backendHandle.port,
      port: opts.port,
      allowRemote: opts.allowRemote ?? false,
    });
  } catch (err) {
    // If static-server fails, clean up backend
    await backendHandle.stop();
    throw err;
  }

  // 3. Canvas / OpenIdeas — Ideas is ready only when the island upstream is up
  // (or we exhausted ensure). Skip with AIONUI_OPENIDEAS_ENSURE=0 for unit hosts.
  let openIdeas;
  if (process.env.AIONUI_OPENIDEAS_ENSURE !== '0') {
    try {
      openIdeas = await ensureOpenIdeas();
      if (openIdeas.ok) {
        console.log(
          `[webui] OpenIdeas online at http://${openIdeas.origin.hostname}:${openIdeas.origin.port} (${openIdeas.detail})`
        );
      } else {
        console.warn(
          `[webui] OpenIdeas offline at http://${openIdeas.origin.hostname}:${openIdeas.origin.port}: ${openIdeas.detail}`
        );
      }
    } catch (err) {
      console.warn('[webui] OpenIdeas ensure failed:', err instanceof Error ? err.message : err);
      openIdeas = undefined;
    }
  }

  // 4. Return combined handle
  return {
    port: staticHandle.port,
    backendPort: backendHandle.port,
    url: staticHandle.url,
    localUrl: staticHandle.localUrl,
    networkUrl: staticHandle.networkUrl,
    lanIP: staticHandle.lanIP,
    openIdeas,
    async stop() {
      await staticHandle.stop();
      await backendHandle.stop();
    },
  };
}
