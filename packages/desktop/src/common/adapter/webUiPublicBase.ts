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

const COWORK_MOUNT = '/apps/agent-workspace/cowork';

type InjectedWindow = Window & {
  __PROJECTO_INTEGRATIONS__?: { apiBase?: unknown };
  __WHITELABEL__?: { urls?: { apiBase?: unknown } };
};

function injectedApiBase(): string {
  if (typeof window === 'undefined') return '';
  const w = window as InjectedWindow;
  const raw = w.__PROJECTO_INTEGRATIONS__?.apiBase ?? w.__WHITELABEL__?.urls?.apiBase;
  if (typeof raw !== 'string' || !raw.trim()) return '';
  const value = raw.trim();
  try {
    const url = new URL(value, window.location.origin);
    if (url.origin === window.location.origin) {
      return url.pathname.replace(/\/$/, '');
    }
  } catch {
    // path-only
  }
  return value.replace(/\/$/, '');
}

export function getWebUiPublicBase(): string {
  const injected = injectedApiBase();
  if (injected) return injected;
  if (typeof window === 'undefined') return '';
  const path = window.location?.pathname || '';
  if (path === COWORK_MOUNT || path.startsWith(`${COWORK_MOUNT}/`)) {
    return COWORK_MOUNT;
  }
  return '';
}
