/**
 * Same-origin OpenIdeas (Flowise) island.
 *
 * Ideas WebUI owns `/` and `/api/*` (aioncore). The canvas iframe must not
 * point at :3010 — that is cross-origin, and the Ideas service worker plus
 * CORS/iframe ancestors keep breaking it. Proxy `/canvas-island/` to the
 * sidecar and rewrite Flowise's root `/assets` + `window.location.origin` API
 * fallback so the island stays under this prefix.
 */

import http, { type IncomingMessage, type ServerResponse } from 'node:http';
import { mergeCookieHeaders, resolveFlowiseServiceCookie } from './flowiseSession.js';

export const CANVAS_ISLAND_MOUNT = '/canvas-island';

/** Flowise UI paths. Ideas uses HashRouter, so these are never Ideas routes. */
const FLOWISE_SPA_PREFIXES = [
  '/v2',
  '/canvas',
  '/agentcanvas',
  '/chatflows',
  '/agentflows',
  '/marketplaces',
  '/marketplace',
  '/document-stores',
  '/credentials',
  '/tools',
  '/assistants',
  '/executions',
  '/evaluators',
  '/variables',
  '/apikey',
  '/account',
  '/users',
  '/roles',
  '/workspace',
  '/signin',
  '/register',
  '/unauthorized',
  '/rate-limited',
  '/forgot-password',
  '/reset-password',
  '/verify',
  '/organization-setup',
  '/license-expired',
  '/login-activity',
  '/execution',
  '/chatbot',
  '/confirm-email-change',
];

export type FlowiseOrigin = {
  hostname: string;
  port: number;
};

export function parseFlowiseOrigin(raw?: string): FlowiseOrigin {
  const fallback = 'http://127.0.0.1:3010';
  try {
    const url = new URL(raw || process.env.AIONUI_FLOWISE_URL || process.env.PROJECTO_FLOWISE_URL || fallback);
    const port = url.port ? Number(url.port) : url.protocol === 'https:' ? 443 : 80;
    return { hostname: url.hostname, port: port || 3010 };
  } catch {
    return { hostname: '127.0.0.1', port: 3010 };
  }
}

export function isCanvasIslandUrl(url: string): boolean {
  const path = url.split('?')[0].split('#')[0];
  return path === CANVAS_ISLAND_MOUNT || path.startsWith(`${CANVAS_ISLAND_MOUNT}/`);
}

export function stripCanvasIslandPath(url: string): string {
  const q = url.indexOf('?');
  const path = q === -1 ? url : url.slice(0, q);
  const query = q === -1 ? '' : url.slice(q);
  if (path !== CANVAS_ISLAND_MOUNT && !path.startsWith(`${CANVAS_ISLAND_MOUNT}/`)) {
    return url;
  }
  const rest = path.slice(CANVAS_ISLAND_MOUNT.length) || '/';
  return `${rest}${query}`;
}

export function isFlowiseSpaLeakPath(url: string): boolean {
  const path = url.split('?')[0].split('#')[0];
  return FLOWISE_SPA_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

export function canvasIslandRedirect(url: string): string {
  const q = url.indexOf('?');
  const path = (q === -1 ? url : url.slice(0, q)).split('#')[0];
  const query = q === -1 ? '' : url.slice(q);
  if (path === CANVAS_ISLAND_MOUNT || path.startsWith(`${CANVAS_ISLAND_MOUNT}/`)) {
    return `${path}${query}`;
  }
  const rest = path.startsWith('/') ? path : `/${path}`;
  return `${CANVAS_ISLAND_MOUNT}${rest}${query}`;
}

/**
 * GET /login is aioncore. Flowise's island also uses /login as a document URL;
 * only steal the document when the iframe already lived under the mount.
 */
export function isIslandAuthDocumentRequest(method: string, url: string, referer: string | undefined): boolean {
  if (method !== 'GET' && method !== 'HEAD') return false;
  const path = url.split('?')[0].split('#')[0];
  if (path !== '/login' && path !== '/login/') return false;
  if (!referer) return false;
  try {
    return new URL(referer).pathname.startsWith(CANVAS_ISLAND_MOUNT);
  } catch {
    return referer.includes(CANVAS_ISLAND_MOUNT);
  }
}

export function isFlowiseApiStolenByIdeas(url: string, referer: string | undefined): boolean {
  const path = url.split('?')[0];
  if (!path.startsWith('/api/v1')) return false;
  if (!referer) return false;
  try {
    return new URL(referer).pathname.startsWith(CANVAS_ISLAND_MOUNT);
  } catch {
    return referer.includes(CANVAS_ISLAND_MOUNT);
  }
}

export function shouldRewriteIslandBody(contentType: string, requestPath: string): boolean {
  const ct = contentType.toLowerCase();
  return (
    ct.includes('text/html') ||
    /javascript|ecmascript/.test(ct) ||
    /\.m?js(\?|$)/i.test(requestPath) ||
    /\.html(\?|$)/i.test(requestPath)
  );
}

/**
 * Keep Flowise under `/canvas-island`. Do not rewrite `ik={basename:""}` —
 * that value is also `useRoutes(..., config.basename)`. Setting it while
 * BrowserRouter already has basename `/canvas-island` blanks the canvas.
 * Do not prefix `path:"/v2/agentcanvas/:id"` — RR matches those after basename.
 */
export function rewriteFlowiseIslandPayload(content: string, contentType: string, requestPath: string): string {
  const mount = CANVAS_ISLAND_MOUNT;
  const ct = contentType.toLowerCase();
  const isJs = /javascript|ecmascript/.test(ct) || /\.m?js(\?|$)/i.test(requestPath);
  const isHtml = ct.includes('text/html') || /\.html(\?|$)/i.test(requestPath);
  let out = content;
  if (isJs) {
    out = out.replaceAll(
      '.VITE_API_BASE_URL||window.location.origin',
      `.VITE_API_BASE_URL||(window.location.origin+"${mount}")`
    );
    out = out.replaceAll(
      '.VITE_UI_BASE_URL||window.location.origin',
      `.VITE_UI_BASE_URL||(window.location.origin+"${mount}")`
    );
    // Flowise boots as <Provider store={...}><BrowserRouter>...</BrowserRouter></Provider>.
    // Vite may emit `jsx` / `jsxs` / `R.jsx` / `/*#__PURE__*/jsx` / `createElement`.
    // Without basename, RR sees `/canvas-island/v2/agentcanvas/:id` and matches nothing → blank iframe.
    // Do NOT rewrite Flowise `config.basename` (passed to useRoutes as location) — that blanks the canvas.
    out = out.replace(
      /,\s*\{store:([A-Za-z_$][\w$]*),children:(?:\/\*#__PURE__\*\/)?((?:[A-Za-z_$][\w$]*\.)?(?:jsxs?|createElement))\(([A-Za-z_$][\w$]*),\{children:/g,
      `,{store:$1,children:$2($3,{basename:"${mount}",children:`
    );
    out = out.replace(
      /((?:\/\*#__PURE__\*\/)?(?:[A-Za-z_$][\w$]*\.)?(?:jsxs?|createElement))\(BrowserRouter,\{(?!basename:)/g,
      `$1(BrowserRouter,{basename:"${mount}",`
    );
    out = out.replaceAll('"/assets/', `"${mount}/assets/`);
    out = out.replaceAll("'/assets/", `'${mount}/assets/`);
    for (const route of [
      '/v2/agentcanvas',
      '/agentcanvas',
      '/canvas',
      '/v2/marketplace',
      '/chatflows',
      '/marketplace',
    ]) {
      out = out.replaceAll(`\`${route}/\${`, `\`${mount}${route}/\${`);
    }
    out = out.replaceAll('window.location.href="/login"', `window.location.href="${mount}/login"`);
    out = out.replaceAll("window.location.href='/login'", `window.location.href="${mount}/login"`);
    out = out.replaceAll('window.location.href="/signin"', `window.location.href="${mount}/signin"`);
  }
  if (isHtml) {
    out = out.replace(/<script\b[^>]*\bsrc=["']https:\/\/r\.wdfl\.co\/[^"']*["'][^>]*>\s*<\/script>/gi, '');
    out = out.replace(/(src|href)=(["'])\/(?!\/)/gi, `$1=$2${mount}/`);
    if (!/<base\b/i.test(out)) {
      out = out.replace(/<head([^>]*)>/i, `<head$1><base href="${mount}/">`);
    }
    out = out.replace(/<title>[^<]*<\/title>/i, '<title>OpenIdeas</title>');
  }
  return out;
}

export function rewriteIslandLocation(location: string, origin?: FlowiseOrigin): string {
  if (origin) {
    try {
      const resolved = new URL(location, `http://${origin.hostname}:${origin.port}`);
      const loopback = (host: string) => host === '127.0.0.1' || host === 'localhost' || host === '::1';
      const sameHost =
        resolved.hostname === origin.hostname || (loopback(resolved.hostname) && loopback(origin.hostname));
      const port = resolved.port || (resolved.protocol === 'https:' ? '443' : '80');
      if (sameHost && port === String(origin.port)) {
        return canvasIslandRedirect(`${resolved.pathname}${resolved.search}${resolved.hash}`);
      }
    } catch {
      // relative Location
    }
  }
  if (!location.startsWith('/') || location.startsWith('//') || location.startsWith(CANVAS_ISLAND_MOUNT)) {
    return location;
  }
  return `${CANVAS_ISLAND_MOUNT}${location}`;
}

/**
 * Strip headers that block same-origin Ideas from embedding the island iframe.
 * OpenIdeas ships `frame-ancestors 'self'` / `X-Frame-Options: SAMEORIGIN`; those
 * are correct for :3010 directly, but break `/canvas-island` when the browser
 * origin string differs (localhost vs 127.0.0.1) or a parent tunnel host is used.
 */
export function sanitizeIslandResponseHeaders(headers: http.OutgoingHttpHeaders): http.OutgoingHttpHeaders {
  const headersOut = { ...headers };
  delete headersOut['content-length'];
  delete headersOut['content-encoding'];
  delete headersOut['x-frame-options'];
  delete headersOut['content-security-policy'];
  delete headersOut['Content-Security-Policy'];
  delete headersOut['X-Frame-Options'];
  headersOut['cache-control'] = 'no-store';
  return headersOut;
}

/**
 * The island iframe is same-origin Ideas, already authenticated. OpenIdeas
 * still 401s `/api/v1/chatflows` without this header, which leaves the canvas blank.
 */
export function islandUpstreamHeaders(
  reqHeaders: IncomingMessage['headers'],
  origin: FlowiseOrigin,
  serviceCookie?: string | null
): http.OutgoingHttpHeaders {
  const cookie = mergeCookieHeaders(
    typeof reqHeaders.cookie === 'string' ? reqHeaders.cookie : undefined,
    serviceCookie || undefined
  );
  return {
    ...reqHeaders,
    host: `${origin.hostname}:${origin.port}`,
    'accept-encoding': 'identity',
    'x-request-from': 'internal',
    ...(cookie ? { cookie } : {}),
  };
}

export function forwardToFlowiseIsland(
  req: IncomingMessage,
  res: ServerResponse,
  origin: FlowiseOrigin,
  upstreamPath = stripCanvasIslandPath(req.url || '/')
): void {
  const start = (serviceCookie: string | null) => {
    const headers = islandUpstreamHeaders(req.headers, origin, serviceCookie);
    const options: http.RequestOptions = {
      hostname: origin.hostname,
      port: origin.port,
      path: upstreamPath,
      method: req.method,
      headers,
    };

    const proxy = http.request(options, (proxyRes) => {
      const contentType = String(proxyRes.headers['content-type'] || '');
      const location = proxyRes.headers.location;
      if (typeof location === 'string') {
        proxyRes.headers.location = rewriteIslandLocation(location, origin);
      }
      if (!shouldRewriteIslandBody(contentType, upstreamPath)) {
        res.writeHead(proxyRes.statusCode ?? 502, sanitizeIslandResponseHeaders(proxyRes.headers));
        proxyRes.pipe(res);
        return;
      }

      const chunks: Buffer[] = [];
      proxyRes.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
      proxyRes.on('end', () => {
        const body = rewriteFlowiseIslandPayload(Buffer.concat(chunks).toString('utf8'), contentType, upstreamPath);
        res.writeHead(proxyRes.statusCode ?? 502, sanitizeIslandResponseHeaders(proxyRes.headers));
        res.end(body);
      });
    });

    proxy.on('error', () => {
      if (!res.headersSent) {
        res.writeHead(502, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
        res.end(
          `<!doctype html><html><head><meta charset="utf-8"/><title>Canvas unavailable</title></head><body><p>OpenIdeas sidecar is not reachable on ${origin.hostname}:${origin.port}.</p></body></html>`
        );
      } else {
        res.destroy();
      }
    });
    req.pipe(proxy);
  };

  void resolveFlowiseServiceCookie(origin).then(start, () => start(null));
}
