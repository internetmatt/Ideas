/**
 * Optional OpenIdeas service session for `/canvas-island`.
 *
 * Product testing (and headless agents) need chatflow APIs without making every
 * tester complete organization-setup + sign-in inside the iframe first. When
 * AIONUI_FLOWISE_EMAIL / AIONUI_FLOWISE_PASSWORD are set, the island proxy
 * logs in to the sidecar and attaches the session cookie upstream.
 */

import http from 'node:http';

type FlowiseOrigin = {
  hostname: string;
  port: number;
};

type CachedSession = {
  cookieHeader: string;
  expiresAtMs: number;
};

let cached: CachedSession | null = null;
let inflight: Promise<string | null> | null = null;

export function flowiseServiceCredentials(): { email: string; password: string } | null {
  const email = (process.env.AIONUI_FLOWISE_EMAIL || process.env.OPENIDEAS_EMAIL || '').trim();
  const password = (process.env.AIONUI_FLOWISE_PASSWORD || process.env.OPENIDEAS_PASSWORD || '').trim();
  if (!email || !password) return null;
  return { email, password };
}

function parseSetCookieHeaders(raw: string | string[] | undefined): string[] {
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

function cookiePair(setCookie: string): string | null {
  const pair = setCookie.split(';', 1)[0]?.trim();
  return pair && pair.includes('=') ? pair : null;
}

function tokenExpiryMs(setCookies: string[]): number {
  // Prefer JWT exp when present; otherwise refresh hourly.
  for (const line of setCookies) {
    const pair = cookiePair(line);
    if (!pair?.startsWith('token=')) continue;
    const jwt = pair.slice('token='.length);
    const payload = jwt.split('.')[1];
    if (!payload) continue;
    try {
      const json = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { exp?: number };
      if (typeof json.exp === 'number') return json.exp * 1000 - 60_000;
    } catch {
      // fall through
    }
  }
  return Date.now() + 60 * 60 * 1000;
}

function loginToFlowise(origin: FlowiseOrigin, email: string, password: string): Promise<string | null> {
  const body = JSON.stringify({ email, password });
  return new Promise((resolve) => {
    const req = http.request(
      {
        hostname: origin.hostname,
        port: origin.port,
        path: '/api/v1/auth/login',
        method: 'POST',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          'content-length': Buffer.byteLength(body),
          'x-request-from': 'internal',
        },
      },
      (res) => {
        const setCookies = parseSetCookieHeaders(res.headers['set-cookie']);
        const pairs = setCookies.map(cookiePair).filter((p): p is string => Boolean(p));
        res.resume();
        if ((res.statusCode ?? 500) >= 400 || pairs.length === 0) {
          resolve(null);
          return;
        }
        const cookieHeader = pairs.join('; ');
        cached = { cookieHeader, expiresAtMs: tokenExpiryMs(setCookies) };
        resolve(cookieHeader);
      }
    );
    req.on('error', () => resolve(null));
    req.end(body);
  });
}

/**
 * Returns a Cookie header value for OpenIdeas, or null when unset/unavailable.
 */
export async function resolveFlowiseServiceCookie(origin: FlowiseOrigin): Promise<string | null> {
  const creds = flowiseServiceCredentials();
  if (!creds) return null;
  if (cached && cached.expiresAtMs > Date.now()) return cached.cookieHeader;
  if (inflight) return inflight;
  inflight = loginToFlowise(origin, creds.email, creds.password).finally(() => {
    inflight = null;
  });
  return inflight;
}

/** Test helper — clears cached service session. */
export function resetFlowiseServiceSessionForTests(): void {
  cached = null;
  inflight = null;
}

/**
 * Merge a browser Cookie header with the service session (browser wins on key clash).
 */
export function mergeCookieHeaders(
  existing: string | undefined,
  serviceCookie: string | undefined
): string | undefined {
  if (!serviceCookie) return existing;
  if (!existing?.trim()) return serviceCookie;
  const map = new Map<string, string>();
  for (const part of `${serviceCookie}; ${existing}`.split(';')) {
    const trimmed = part.trim();
    if (!trimmed.includes('=')) continue;
    const eq = trimmed.indexOf('=');
    const key = trimmed.slice(0, eq);
    const value = trimmed.slice(eq + 1);
    if (!map.has(key)) map.set(key, value);
  }
  // Re-apply existing last so browser cookies override service ones.
  for (const part of existing.split(';')) {
    const trimmed = part.trim();
    if (!trimmed.includes('=')) continue;
    const eq = trimmed.indexOf('=');
    map.set(trimmed.slice(0, eq), trimmed.slice(eq + 1));
  }
  return [...map.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
}
