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

export const CANVAS_ISLAND_MOUNT = '/canvas-island';

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
 * Flowise RR 6.3 treats a string basename as the location and the canvas goes blank.
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
    out = out.replace(
      /,\s*\{store:([A-Za-z_$][\w$]*),children:([A-Za-z_$][\w$]*)\.jsx\(([A-Za-z_$][\w$]*),\{children:/g,
      `,{store:$1,children:$2.jsx($3,{basename:"${mount}",children:`
    );
    out = out.replaceAll('"/assets/', `"${mount}/assets/`);
    out = out.replaceAll("'/assets/", `'${mount}/assets/`);
    // replaceState / window.open use root-absolute paths and drop the mount.
    for (const route of ['/v2/agentcanvas', '/agentcanvas', '/canvas', '/v2/marketplace', '/chatflows']) {
      out = out.replaceAll(`\`${route}/\${`, `\`${mount}${route}/\${`);
      out = out.replaceAll(`"${route}/`, `"${mount}${route}/`);
      out = out.replaceAll(`'${route}/`, `'${mount}${route}/`);
    }
  }
  if (isHtml) {
    out = out.replace(/<script\b[^>]*\bsrc=["']https:\/\/r\.wdfl\.co\/[^"']*["'][^>]*>\s*<\/script>/gi, '');
    out = out.replace(/(src|href)=(["'])\/(?!\/)/gi, `$1=$2${mount}/`);
    if (!/<base\b/i.test(out)) {
      out = out.replace(/<head([^>]*)>/i, `<head$1><base href="${mount}/">`);
    }
  }
  return out;
}

function rewriteIslandLocation(location: string): string {
  if (!location.startsWith('/') || location.startsWith('//') || location.startsWith(CANVAS_ISLAND_MOUNT)) {
    return location;
  }
  return `${CANVAS_ISLAND_MOUNT}${location}`;
}

export function forwardToFlowiseIsland(
  req: IncomingMessage,
  res: ServerResponse,
  origin: FlowiseOrigin,
  upstreamPath = stripCanvasIslandPath(req.url || '/')
): void {
  const headers = { ...req.headers, host: `${origin.hostname}:${origin.port}`, 'accept-encoding': 'identity' };
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
      proxyRes.headers.location = rewriteIslandLocation(location);
    }
    if (!shouldRewriteIslandBody(contentType, upstreamPath)) {
      res.writeHead(proxyRes.statusCode ?? 502, proxyRes.headers);
      proxyRes.pipe(res);
      return;
    }

    const chunks: Buffer[] = [];
    proxyRes.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    proxyRes.on('end', () => {
      const body = rewriteFlowiseIslandPayload(Buffer.concat(chunks).toString('utf8'), contentType, upstreamPath);
      const headersOut = { ...proxyRes.headers };
      delete headersOut['content-length'];
      delete headersOut['content-encoding'];
      headersOut['cache-control'] = 'no-store';
      res.writeHead(proxyRes.statusCode ?? 502, headersOut);
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
}
