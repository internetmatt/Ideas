/**
 * Same-origin public prefix for WebUI fetch/WS.
 *
 * Standalone :3011 is served at `/`, so this is empty and `/api/*` + `/ws`
 * stay on aioncore (including `/#/login`).
 *
 * Under Projecto cowork the page origin is :4715; without a prefix those
 * calls hit Projecto Express. Prefer the injected apiBase, then the cowork
 * pathname.
 */

export const COWORK_MOUNT = '/apps/agent-workspace/cowork';
export const DEFAULT_IDEAS_WEBUI_ORIGIN = 'http://127.0.0.1:3011';
export const DEFAULT_IDEAS_HOST_ORIGIN = 'http://127.0.0.1:4715';
/** Ideas DMG / Projector shell: Ideas login on the Projecto Ideas plane. */
export const DEFAULT_IDEAS_COWORK_LOGIN_PATH = `${COWORK_MOUNT}/?plane=ideas#/login`;

type ProcessEnv = Record<string, string | undefined>;

type InjectedWindow = Window & {
  __PROJECTO_INTEGRATIONS__?: { apiBase?: unknown; ideasOrigin?: unknown };
  __WHITELABEL__?: { urls?: { apiBase?: unknown; ideasOrigin?: unknown } };
  __IDEAS_INTEGRATIONS__?: { ideasOrigin?: unknown };
};

function injectedWindow(): InjectedWindow | null {
  if (typeof window === 'undefined') return null;
  return window as InjectedWindow;
}

function injectedApiBase(): string {
  const w = injectedWindow();
  if (!w) return '';
  const raw = w.__PROJECTO_INTEGRATIONS__?.apiBase ?? w.__WHITELABEL__?.urls?.apiBase;
  if (typeof raw !== 'string' || !raw.trim()) return '';
  const value = raw.trim();
  try {
    const url = new URL(value, w.location.origin);
    if (url.origin === w.location.origin) {
      return url.pathname.replace(/\/$/, '');
    }
  } catch {
    // path-only
  }
  return value.replace(/\/$/, '');
}

function isLoopbackOrigin(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:'
      ? url.hostname === '127.0.0.1' || url.hostname === 'localhost'
      : false;
  } catch {
    return false;
  }
}

export function isProjectoCoworkHost(): boolean {
  if (typeof window === 'undefined') return false;
  const path = window.location?.pathname || '';
  return path === COWORK_MOUNT || path.startsWith(`${COWORK_MOUNT}/`);
}

/** Ideas WebUI origin that owns login + `/canvas-island`. */
export function ideasWebUiOrigin(): string {
  const w = injectedWindow();
  const raw =
    w?.__IDEAS_INTEGRATIONS__?.ideasOrigin ??
    w?.__PROJECTO_INTEGRATIONS__?.ideasOrigin ??
    w?.__WHITELABEL__?.urls?.ideasOrigin;
  if (typeof raw === 'string' && isLoopbackOrigin(raw.trim())) {
    return raw.trim().replace(/\/$/, '');
  }
  if (typeof window !== 'undefined') {
    const port = window.location?.port;
    if (port === '3011' || port === '3012') {
      return window.location.origin;
    }
  }
  return DEFAULT_IDEAS_WEBUI_ORIGIN;
}

export function getWebUiPublicBase(): string {
  const injected = injectedApiBase();
  if (injected) return injected;
  if (typeof window === 'undefined') return '';
  if (isProjectoCoworkHost()) return COWORK_MOUNT;
  return '';
}

/** Prefix a same-origin WebUI path so cowork fetch hits Ideas via :4715, not Projecto Express. */
export function webUiPath(path: string): string {
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${getWebUiPublicBase()}${suffix}`;
}

function joinOriginAndHome(origin: string, home: string): string {
  if (/:\/\//.test(home)) return home;
  const base = origin.replace(/\/$/, '');
  return home.startsWith('/') ? `${base}${home}` : `${base}/${home}`;
}

/**
 * Packaged Ideas.app loads the Projecto Ideas plane (login + canvas island)
 * instead of a second local aioncore. Dev builds keep the local renderer unless
 * `AIONUI_ATTACH_HOST=1`. Explicit `AIONUI_START_URL` wins. Set
 * `AIONUI_ATTACH_HOST=0` to force a packaged app onto its bundled renderer.
 */
export function resolveIdeasHostShellUrl(
  env: ProcessEnv = typeof process === 'undefined' ? {} : process.env,
  options: { isPackaged?: boolean } = {},
): string | null {
  const explicit = env.AIONUI_START_URL?.trim();
  if (explicit) return explicit;
  const attachFlag = env.AIONUI_ATTACH_HOST?.trim().toLowerCase();
  if (attachFlag === '0' || attachFlag === 'false' || attachFlag === 'off') {
    return null;
  }
  const attach =
    attachFlag === '1' ||
    attachFlag === 'true' ||
    attachFlag === 'on' ||
    (options.isPackaged === true && (attachFlag === undefined || attachFlag === ''));
  if (!attach) return null;
  const origin = (env.PROJECTO_PUBLIC_ORIGIN || env.PROJECTO_BACKEND_URL || DEFAULT_IDEAS_HOST_ORIGIN).replace(
    /\/$/,
    ''
  );
  const home = env.PROJECTO_AGENT_WORKSPACE_HOME?.trim() || DEFAULT_IDEAS_COWORK_LOGIN_PATH;
  return joinOriginAndHome(origin, home);
}
