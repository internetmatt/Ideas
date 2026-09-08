/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { afterEach, describe, expect, it } from 'vitest';
import {
  buildFlowiseEmbedUrl,
  CANVAS_ISLAND_MOUNT,
  DEFAULT_FLOWISE_URL,
  resolveFlowiseUrl,
} from '@/renderer/services/flowise/resolveFlowiseUrl';

describe('resolveFlowiseUrl / buildFlowiseEmbedUrl', () => {
  afterEach(() => {
    // node tests have no window; keep the desktop fallback.
  });

  it('falls back to the default base URL outside the browser WebUI', () => {
    expect(resolveFlowiseUrl()).toBe(DEFAULT_FLOWISE_URL);
    expect(DEFAULT_FLOWISE_URL).toBe('http://127.0.0.1:3010');
  });

  it('honors an explicit remote override', () => {
    expect(resolveFlowiseUrl('http://flowise.example:3010/')).toBe('http://flowise.example:3010');
  });

  it('scopes embed URLs to a flow and conversation', () => {
    expect(
      buildFlowiseEmbedUrl({
        baseUrl: 'http://flowise.example:3010',
        flowId: 'flow-1',
        conversationId: 'conv-9',
      })
    ).toBe('http://flowise.example:3010/v2/agentcanvas/flow-1?conversationId=conv-9');
  });

  it('maps loopback :3010 onto the same-origin island in WebUI', () => {
    const previous = globalThis.window;
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      writable: true,
      value: { location: { search: '' } },
    });
    try {
      expect(resolveFlowiseUrl('http://127.0.0.1:3010')).toBe(CANVAS_ISLAND_MOUNT);
      expect(resolveFlowiseUrl('http://localhost:3010/')).toBe(CANVAS_ISLAND_MOUNT);
      expect(buildFlowiseEmbedUrl({ baseUrl: 'http://127.0.0.1:3010', flowId: 'flow-1' })).toBe(
        '/canvas-island/v2/agentcanvas/flow-1'
      );
    } finally {
      if (previous === undefined) {
        Reflect.deleteProperty(globalThis, 'window');
      } else {
        Object.defineProperty(globalThis, 'window', { configurable: true, writable: true, value: previous });
      }
    }
  });
});
