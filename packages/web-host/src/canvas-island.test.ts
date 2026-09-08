/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it } from 'vitest';
import {
  CANVAS_ISLAND_MOUNT,
  isCanvasIslandUrl,
  rewriteFlowiseIslandPayload,
  stripCanvasIslandPath,
} from './canvas-island';

describe('canvas-island helpers', () => {
  it('detects and strips the island mount', () => {
    expect(isCanvasIslandUrl('/canvas-island/v2/agentcanvas/abc')).toBe(true);
    expect(stripCanvasIslandPath('/canvas-island/v2/agentcanvas/abc')).toBe('/v2/agentcanvas/abc');
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
});
