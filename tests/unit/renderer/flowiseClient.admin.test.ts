/**
 * @license
 * Copyright 2026 Projecto / Ideas fork
 * SPDX-License-Identifier: Apache-2.0
 *
 * @vitest-environment node
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cloneMarketplaceTemplate,
  createApiKey,
  deleteApiKey,
  listApiKeys,
  listDocumentStores,
  listMarketplaceTemplates,
  marketplaceTemplateHasScheduleInput,
  parseFlowiseApiKey,
  parseFlowiseDocumentStore,
  parseFlowiseMarketplaceTemplate,
} from '@/renderer/services/flowise/client';

describe('OpenIdeas typed admin client', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('parses API keys and lists them through /api/v1/apikey', async () => {
    expect(parseFlowiseApiKey({ id: 'k1', keyName: 'prod' })?.keyName).toBe('prod');
    expect(parseFlowiseApiKey({ keyName: 'missing-id' })).toBeNull();

    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([{ id: 'k1', keyName: 'prod', apiKey: 'sk-test' }]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    vi.stubGlobal('fetch', fetchSpy);

    const keys = await listApiKeys('/canvas-island');
    expect(keys).toEqual([expect.objectContaining({ id: 'k1', keyName: 'prod' })]);
    expect((fetchSpy.mock.calls[0] as [string])[0]).toBe('/canvas-island/api/v1/apikey');
  });

  it('creates and revokes API keys on /api/v1/apikey', async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify([{ id: 'k2', keyName: 'ci' }]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchSpy);

    await createApiKey('/canvas-island', { keyName: 'ci' });
    await deleteApiKey('/canvas-island', 'k2');

    expect((fetchSpy.mock.calls[0] as [string, RequestInit])[0]).toBe('/canvas-island/api/v1/apikey');
    expect((fetchSpy.mock.calls[0] as [string, RequestInit])[1]?.method).toBe('POST');
    expect((fetchSpy.mock.calls[1] as [string])[0]).toBe('/canvas-island/api/v1/apikey/k2');
    expect((fetchSpy.mock.calls[1] as [string, RequestInit])[1]?.method).toBe('DELETE');
  });

  it('lists document stores through /api/v1/document-store/store', async () => {
    expect(parseFlowiseDocumentStore({ id: 's1', name: 'docs' })?.name).toBe('docs');
    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: [{ id: 's1', name: 'docs' }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    vi.stubGlobal('fetch', fetchSpy);

    const stores = await listDocumentStores('/canvas-island');
    expect(stores).toEqual([expect.objectContaining({ id: 's1', name: 'docs' })]);
    expect((fetchSpy.mock.calls[0] as [string])[0]).toBe('/canvas-island/api/v1/document-store/store');
  });

  it('lists marketplace templates and clones them onto chatflows', async () => {
    const template = {
      id: 'tpl-1',
      templateName: 'Translator',
      type: 'AgentflowV2',
      flowData: JSON.stringify({
        nodes: [{ id: 'start-0', data: { name: 'startAgentflow', inputs: { startInputType: 'chatInput' } } }],
        edges: [],
      }),
    };
    expect(parseFlowiseMarketplaceTemplate(template)?.kind).toBe('AGENTFLOW');
    expect(marketplaceTemplateHasScheduleInput(template)).toBe(false);

    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify([template]), { status: 200, headers: { 'Content-Type': 'application/json' } })
      )
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 'flow-9', name: 'Translator', type: 'AGENTFLOW' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );
    vi.stubGlobal('fetch', fetchSpy);

    const listed = await listMarketplaceTemplates('/canvas-island');
    expect(listed[0]?.templateName).toBe('Translator');
    expect((fetchSpy.mock.calls[0] as [string])[0]).toBe('/canvas-island/api/v1/marketplaces/templates');
    expect((fetchSpy.mock.calls[1] as [string])[0]).toBe('/canvas-island/api/v1/marketplaces/custom');

    const cloned = await cloneMarketplaceTemplate('/canvas-island', listed[0]);
    expect(cloned.id).toBe('flow-9');
    const [url, init] = fetchSpy.mock.calls[2] as [string, RequestInit];
    expect(url).toBe('/canvas-island/api/v1/chatflows');
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual(
      expect.objectContaining({ name: 'Translator', type: 'AGENTFLOW' })
    );
  });
});
