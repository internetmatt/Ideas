import { afterEach, describe, expect, it, vi } from 'vitest';
import { OrcaRuntimeClient } from '@/renderer/services/orca-runtime/client';

describe('OrcaRuntimeClient', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('reads health from the Projecto orca-runtime proxy', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      expect(String(input)).toBe('http://127.0.0.1:4715/api/projecto/orca-runtime/health');
      return {
        ok: true,
        json: async () => ({ ok: true, live: true, ready: true }),
      };
    });
    vi.stubGlobal('fetch', fetchMock);

    const client = new OrcaRuntimeClient('http://127.0.0.1:4715');
    await expect(client.health()).resolves.toEqual({ ok: true, live: true, ready: true });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('creates a pairing offer on the same proxy', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        ok: true,
        offer: {
          v: 2,
          endpoint: 'ws://127.0.0.1:4715/api/projecto/orca-runtime/ws',
          deviceToken: 'tok',
          publicKeyB64: 'pk',
          scope: 'runtime',
        },
      }),
    }));
    vi.stubGlobal('fetch', fetchMock);

    const client = new OrcaRuntimeClient('http://127.0.0.1:4715');
    await expect(client.createPairing()).resolves.toMatchObject({ deviceToken: 'tok', scope: 'runtime' });
  });
});
