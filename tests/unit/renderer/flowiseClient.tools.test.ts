/**
 * @license
 * Copyright 2026 Projecto / Ideas fork
 * SPDX-License-Identifier: Apache-2.0
 *
 * @vitest-environment node
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createTool,
  deleteTool,
  listTools,
  parseFlowiseTool,
  parseFlowiseToolList,
  updateTool,
} from '@/renderer/services/flowise/client';

describe('OpenIdeas typed tools client', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('parses tool rows and ignores invalid entries', () => {
    expect(parseFlowiseTool({ id: 'tool-1', name: 'search' })?.name).toBe('search');
    expect(parseFlowiseTool({ name: 'missing-id' })).toBeNull();
    expect(parseFlowiseToolList([{ id: 'tool-1', name: 'search' }, { id: '' }])).toHaveLength(1);
  });

  it('lists tools only through /api/v1/tools', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([{ id: 'tool-1', name: 'search', description: 'Find things' }]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    vi.stubGlobal('fetch', fetchSpy);

    const tools = await listTools('http://127.0.0.1:3010');

    expect(tools).toEqual([
      expect.objectContaining({ id: 'tool-1', name: 'search', description: 'Find things' }),
    ]);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url] = fetchSpy.mock.calls[0] as [string];
    expect(url).toBe('http://127.0.0.1:3010/api/v1/tools');
  });

  it('creates, updates, and deletes tools on /api/v1/tools', async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 'tool-2', name: 'new-tool' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 'tool-2', name: 'renamed' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchSpy);

    await createTool('http://127.0.0.1:3010', { name: 'new-tool' });
    await updateTool('http://127.0.0.1:3010', 'tool-2', { name: 'renamed' });
    await deleteTool('http://127.0.0.1:3010', 'tool-2');

    expect((fetchSpy.mock.calls[0] as [string, RequestInit])[0]).toBe('http://127.0.0.1:3010/api/v1/tools');
    expect((fetchSpy.mock.calls[0] as [string, RequestInit])[1]?.method).toBe('POST');
    expect((fetchSpy.mock.calls[1] as [string])[0]).toBe('http://127.0.0.1:3010/api/v1/tools/tool-2');
    expect((fetchSpy.mock.calls[1] as [string, RequestInit])[1]?.method).toBe('PUT');
    expect((fetchSpy.mock.calls[2] as [string])[0]).toBe('http://127.0.0.1:3010/api/v1/tools/tool-2');
    expect((fetchSpy.mock.calls[2] as [string, RequestInit])[1]?.method).toBe('DELETE');
  });
});
