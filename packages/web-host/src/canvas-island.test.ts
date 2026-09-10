import { describe, expect, it } from 'vitest';
import {
  canvasIslandRedirect,
  isFlowiseSpaLeakPath,
  isIslandAuthDocumentRequest,
  islandUpstreamHeaders,
  parseFlowiseOrigin,
  rewriteFlowiseIslandPayload,
  rewriteIslandLocation,
} from './canvas-island.js';
  widenFrameAncestorsForIsland,

describe('islandUpstreamHeaders', () => {
  it('marks OpenIdeas island fetches as internal so the canvas is not 401', () => {
    const headers = islandUpstreamHeaders({ accept: 'application/json' }, parseFlowiseOrigin('http://127.0.0.1:3010'));
    expect(headers['x-request-from']).toBe('internal');
    expect(headers.host).toBe('127.0.0.1:3010');
    expect(headers['accept-encoding']).toBe('identity');
  });
});

describe('rewriteFlowiseIslandPayload', () => {
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

  it('rewrites root-absolute assets on the island HTML', () => {
    const html = rewriteFlowiseIslandPayload(
      '<html><head><title>Flowise - Build AI Agents, Visually</title></head><body><script src="/assets/index.js"></script></body></html>',
      'text/html',
      '/v2/agentcanvas/abc'
    );
    expect(html).toContain('src="/canvas-island/assets/index.js"');
    expect(html).toContain('<base href="/canvas-island/">');
    expect(html).toContain('<title>OpenIdeas</title>');
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
});
  it('recognizes Flowise SPA paths that Ideas HashRouter never owns', () => {
    expect(isFlowiseSpaLeakPath('/v2/agentcanvas/abc')).toBe(true);
    expect(isFlowiseSpaLeakPath('/chatflows')).toBe(true);
    expect(isFlowiseSpaLeakPath('/api/v1/ping')).toBe(false);
    expect(isFlowiseSpaLeakPath('/login')).toBe(false);
    expect(canvasIslandRedirect('/v2/agentcanvas/abc?x=1')).toBe('/canvas-island/v2/agentcanvas/abc?x=1');
  });

  it('only steals GET /login when the island iframe issued it', () => {
    expect(isIslandAuthDocumentRequest('GET', '/login', 'http://127.0.0.1:3011/canvas-island/')).toBe(true);
    expect(isIslandAuthDocumentRequest('POST', '/login', 'http://127.0.0.1:3011/canvas-island/')).toBe(false);
    expect(isIslandAuthDocumentRequest('GET', '/login', 'http://127.0.0.1:3011/#/login')).toBe(false);
  });

  it('rewrites absolute 3010 Location headers onto the island', () => {
    const origin = parseFlowiseOrigin('http://127.0.0.1:3010');
    expect(rewriteIslandLocation('http://127.0.0.1:3010/v2/agentcanvas', origin)).toBe(
      '/canvas-island/v2/agentcanvas'
    );
    expect(rewriteIslandLocation('/chatflows', origin)).toBe('/canvas-island/chatflows');
  });
});
