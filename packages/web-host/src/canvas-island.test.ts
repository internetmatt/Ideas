/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it } from 'vitest';
import {
  CANVAS_ISLAND_MOUNT,
  canvasIslandRedirect,
  isCanvasIslandUrl,
  isFlowiseAssetStolenByIdeas,
  isFlowiseSpaLeakPath,
  isIslandAuthDocumentRequest,
  islandUpstreamHeaders,
  parseFlowiseOrigin,
  rewriteFlowiseIslandPayload,
  rewriteIslandLocation,
  sanitizeIslandResponseHeaders,
  stripCanvasIslandPath,
  widenFrameAncestorsForIsland,
} from './canvas-island.js';
import { mergeCookieHeaders } from './flowiseSession.js';

describe('canvas-island helpers', () => {
  it('detects and strips the island mount', () => {
    expect(isCanvasIslandUrl('/canvas-island/v2/agentcanvas/abc')).toBe(true);
    expect(stripCanvasIslandPath('/canvas-island/v2/agentcanvas/abc')).toBe('/v2/agentcanvas/abc');
  });
});

describe('islandUpstreamHeaders', () => {
  it('marks OpenIdeas island fetches as internal so the canvas is not 401', () => {
    const headers = islandUpstreamHeaders({ accept: 'application/json' }, parseFlowiseOrigin('http://127.0.0.1:3010'));
    expect(headers['x-request-from']).toBe('internal');
    expect(headers.host).toBe('127.0.0.1:3010');
    expect(headers['accept-encoding']).toBe('identity');
  });

  it('merges the service session cookie for product-test auth', () => {
    const headers = islandUpstreamHeaders(
      { cookie: 'browser=1' },
      parseFlowiseOrigin('http://127.0.0.1:3010'),
      'token=svc; connect.sid=abc'
    );
    expect(String(headers.cookie)).toContain('browser=1');
    expect(String(headers.cookie)).toContain('token=svc');
  });
});

describe('sanitizeIslandResponseHeaders', () => {
  it('strips frame-busting headers so Ideas can embed the island', () => {
    const headers = sanitizeIslandResponseHeaders({
      'content-length': '12',
      'x-frame-options': 'SAMEORIGIN',
      'content-security-policy': "frame-ancestors 'self'",
      'content-type': 'text/html',
    });
    expect(headers['x-frame-options']).toBeUndefined();
    expect(headers['content-security-policy']).toBeUndefined();
    expect(headers['content-length']).toBeUndefined();
    expect(headers['cache-control']).toBe('no-store');
    expect(headers['content-type']).toBe('text/html');
  });
});

describe('mergeCookieHeaders', () => {
  it('lets browser cookies override the service session', () => {
    expect(mergeCookieHeaders('token=browser', 'token=service; refreshToken=r')).toBe('token=browser; refreshToken=r');
  });
});

describe('widenFrameAncestorsForIsland', () => {
  const fleetPolicy = 'frame-ancestors http://127.0.0.1:3011 http://localhost:3011 http://127.0.0.1:4715 http://localhost:4715';

  it("adds 'self' so the island frames on any Ideas host port, keeping the fleet origins", () => {
    expect(widenFrameAncestorsForIsland(fleetPolicy)).toBe(
      "frame-ancestors 'self' http://127.0.0.1:3011 http://localhost:3011 http://127.0.0.1:4715 http://localhost:4715"
    );
  });

  it("leaves policies that already allow 'self' or * alone", () => {
    expect(widenFrameAncestorsForIsland("frame-ancestors 'self'")).toBe("frame-ancestors 'self'");
    expect(widenFrameAncestorsForIsland('frame-ancestors *')).toBe('frame-ancestors *');
  });

  it("replaces 'none' rather than producing an invalid source list", () => {
    expect(widenFrameAncestorsForIsland("frame-ancestors 'none'")).toBe("frame-ancestors 'self'");
  });

  it('only touches the frame-ancestors directive and passes other headers through', () => {
    expect(widenFrameAncestorsForIsland("default-src 'self'; frame-ancestors http://localhost:3011; img-src *")).toBe(
      "default-src 'self'; frame-ancestors 'self' http://localhost:3011; img-src *"
    );
    expect(widenFrameAncestorsForIsland("default-src 'self'")).toBe("default-src 'self'");
    expect(widenFrameAncestorsForIsland(undefined)).toBeUndefined();
    expect(widenFrameAncestorsForIsland([fleetPolicy, "frame-ancestors 'self'"])).toEqual([
      "frame-ancestors 'self' http://127.0.0.1:3011 http://localhost:3011 http://127.0.0.1:4715 http://localhost:4715",
      "frame-ancestors 'self'",
    ]);
  });
});

describe('rewriteFlowiseIslandPayload', () => {
  it('injects basename for automatic-runtime jsx under Provider store', () => {
    const input = ',{store:e,children:jsx(n,{children:jsx(App,{})';
    const out = rewriteFlowiseIslandPayload(input, 'application/javascript', '/assets/index.js');
    expect(out).toContain(`children:jsx(n,{basename:"${CANVAS_ISLAND_MOUNT}",children:`);
  });

  it('injects basename for classic member jsx under Provider store', () => {
    const input = ',{store:e,children:l.jsx(n,{children:l.jsx(App,{})';
    const out = rewriteFlowiseIslandPayload(input, 'application/javascript', '/assets/index.js');
    expect(out).toContain(`children:l.jsx(n,{basename:"${CANVAS_ISLAND_MOUNT}",children:`);
  });

  it('injects basename for /*#__PURE__*/jsx and createElement forms', () => {
    const pure = ',{store:e,children:/*#__PURE__*/jsx(n,{children:App';
    const created = ',{store:e,children:react.createElement(n,{children:App';
    expect(rewriteFlowiseIslandPayload(pure, 'application/javascript', '/assets/index.js')).toContain(
      `basename:"${CANVAS_ISLAND_MOUNT}"`
    );
    expect(rewriteFlowiseIslandPayload(created, 'application/javascript', '/assets/index.js')).toContain(
      `basename:"${CANVAS_ISLAND_MOUNT}"`
    );
  });

  it('injects basename when BrowserRouter survives minify', () => {
    const input = 'jsx(BrowserRouter,{children:jsx(App,{})';
    const out = rewriteFlowiseIslandPayload(input, 'text/javascript', '/assets/index-abc.js');
    expect(out).toContain(`jsx(BrowserRouter,{basename:"${CANVAS_ISLAND_MOUNT}",children:`);
  });

  it('does not rewrite useRoutes config.basename (location arg)', () => {
    const input = 'useRoutes(r,ik.basename),ik={basename:""}';
    const out = rewriteFlowiseIslandPayload(input, 'application/javascript', '/assets/index.js');
    expect(out).toContain('ik={basename:""}');
    expect(out).not.toContain(`ik={basename:"${CANVAS_ISLAND_MOUNT}"}`);
  });

  it('prefixes root /assets paths for the island', () => {
    const out = rewriteFlowiseIslandPayload('src:"/assets/index.js"', 'application/javascript', '/assets/index.js');
    expect(out).toBe(`src:"${CANVAS_ISLAND_MOUNT}/assets/index.js"`);
  });

  it('rewrites root-absolute assets on the island HTML', () => {
    const html = rewriteFlowiseIslandPayload(
      '<html><head><title>Flowise - Build AI Agents, Visually</title></head><body><script src="/assets/index.js"></script></body></html>',
      'text/html',
      '/v2/agentcanvas/abc'
    );
    expect(html).toContain('src="/canvas-island/assets/index.js"');
    expect(html).toContain(`<base href="/canvas-island/">`);
    expect(html).toContain('<title>OpenIdeas</title>');
    expect(html).toContain('data-ideas-island-shell');
    expect(html).toContain('.MuiDrawer-root');
    expect(html).toContain('header.MuiAppBar-root');
    expect(html).not.toContain('[class*="ChatPopUp"]');
  });

  it('prefixes window.open templates but leaves RR route paths alone', () => {
    const js = rewriteFlowiseIslandPayload(
      [
        'e(`/v2/agentcanvas/${id}`)',
        '{path:"/v2/agentcanvas/:id"}',
        'window.location.href="/login"',
        'const Ua=Pxe.VITE_API_BASE_URL||window.location.origin',
      ].join(';'),
      'application/javascript',
      '/assets/index.js'
    );
    expect(js).toContain('e(`/canvas-island/v2/agentcanvas/${id}`)');
    expect(js).toContain('{path:"/v2/agentcanvas/:id"}');
    expect(js).toContain('window.location.href="/canvas-island/login"');
    expect(js).toContain('window.location.origin+"/canvas-island"');
  });

  it('injects BrowserRouter basename for automatic-runtime jsx', () => {
    const js = rewriteFlowiseIslandPayload(
      ',{store:e,children:jsx(n,{children:jsx(App,{})};jsx(BrowserRouter,{children:App',
      'application/javascript',
      '/assets/index.js'
    );
    expect(js).toContain('children:jsx(n,{basename:"/canvas-island",children:');
    expect(js).toContain('jsx(BrowserRouter,{basename:"/canvas-island",children:');
  });
  it('does not rewrite useRoutes config.basename', () => {
    const js = rewriteFlowiseIslandPayload(
      'useRoutes(r,ik.basename);ik={basename:""}',
      'application/javascript',
      '/assets/index.js'
    );
    expect(js).toContain('ik={basename:""}');
    expect(js).not.toContain('ik={basename:"/canvas-island"}');
  });

  it('rewrites Vite mapDeps relative assets so preload hits the island', () => {
    const js = rewriteFlowiseIslandPayload(
      [
        '__vite__mapDeps.viteFileDeps=["assets/Canvas-BegG6ueo.js","assets/style-DI6oCUg0.css"]',
        'const Mlt=function(e){return"/"+e}',
        'src="/assets/index-ByFv94x0.js"',
      ].join(';'),
      'application/javascript',
      '/assets/index.js'
    );
    expect(js).toContain('"canvas-island/assets/Canvas-BegG6ueo.js"');
    expect(js).toContain('"canvas-island/assets/style-DI6oCUg0.css"');
    expect(js).toContain('src="/canvas-island/assets/index-ByFv94x0.js"');
    expect(js).toContain('return"/"+e');
  });

  it('does not double-prefix already-island absolute assets', () => {
    const js = rewriteFlowiseIslandPayload(
      'href="/canvas-island/assets/style.css";deps=["assets/Chunk.js"]',
      'application/javascript',
      '/assets/index.js'
    );
    expect(js).toContain('href="/canvas-island/assets/style.css"');
    expect(js).not.toContain('/canvas-island/canvas-island/');
    expect(js).toContain('"canvas-island/assets/Chunk.js"');
  });
});

describe('isFlowiseAssetStolenByIdeas', () => {
  it('forwards island-referer /assets leaks to Flowise', () => {
    expect(
      isFlowiseAssetStolenByIdeas('/assets/Canvas-BegG6ueo.js', 'http://127.0.0.1:3011/canvas-island/chatflows')
    ).toBe(true);
    expect(isFlowiseAssetStolenByIdeas('/assets/main.js', 'http://127.0.0.1:3011/#/settings')).toBe(false);
    expect(isFlowiseAssetStolenByIdeas('/api/v1/ping', 'http://127.0.0.1:3011/canvas-island/')).toBe(false);
  });
});

describe('canvas island routing helpers', () => {
  it('recognizes Flowise SPA paths that Ideas HashRouter never owns', () => {
    expect(isFlowiseSpaLeakPath('/v2/agentcanvas/abc')).toBe(true);
    expect(isFlowiseSpaLeakPath('/chatflows')).toBe(true);
    expect(isFlowiseSpaLeakPath('/apikey')).toBe(true);
    expect(isFlowiseSpaLeakPath('/document-stores')).toBe(true);
    expect(isFlowiseSpaLeakPath('/marketplaces')).toBe(true);
    expect(isFlowiseSpaLeakPath('/account')).toBe(true);
    expect(isFlowiseSpaLeakPath('/api/v1/ping')).toBe(false);
    expect(isFlowiseSpaLeakPath('/login')).toBe(false);
    expect(canvasIslandRedirect('/v2/agentcanvas/abc?x=1')).toBe('/canvas-island/v2/agentcanvas/abc?x=1');
  });

  it('keeps island API paths on the OpenIdeas proxy, not Ideas /api/v1', () => {
    expect(isCanvasIslandUrl('/canvas-island/api/v1/apikey')).toBe(true);
    expect(isCanvasIslandUrl('/canvas-island/api/v1/document-store/store')).toBe(true);
    expect(isCanvasIslandUrl('/canvas-island/api/v1/marketplaces/templates')).toBe(true);
    expect(stripCanvasIslandPath('/canvas-island/api/v1/apikey')).toBe('/api/v1/apikey');
    expect(stripCanvasIslandPath('/canvas-island/api/v1/document-store/store')).toBe('/api/v1/document-store/store');
    expect(stripCanvasIslandPath('/canvas-island/api/v1/marketplaces/templates')).toBe('/api/v1/marketplaces/templates');
    expect(isFlowiseSpaLeakPath('/canvas-island/api/v1/apikey')).toBe(false);
  });

  it('only steals GET /login when the island iframe issued it', () => {
    expect(isIslandAuthDocumentRequest('GET', '/login', 'http://127.0.0.1:3011/canvas-island/')).toBe(true);
    expect(isIslandAuthDocumentRequest('POST', '/login', 'http://127.0.0.1:3011/canvas-island/')).toBe(false);
    expect(isIslandAuthDocumentRequest('GET', '/login', 'http://127.0.0.1:3011/#/login')).toBe(false);
  });

  it('rewrites absolute 3010 Location headers onto the island', () => {
    const origin = parseFlowiseOrigin('http://127.0.0.1:3010');
    expect(rewriteIslandLocation('http://127.0.0.1:3010/v2/agentcanvas', origin)).toBe('/canvas-island/v2/agentcanvas');
    expect(rewriteIslandLocation('/chatflows', origin)).toBe('/canvas-island/chatflows');
  });
});
