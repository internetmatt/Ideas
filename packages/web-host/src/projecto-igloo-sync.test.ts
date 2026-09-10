import { describe, expect, it } from 'vitest';
import {
  buildLocalProjectoCatalog,
  ideasLoginRedirectUrl,
  PAIR_DEFAULT_BASE,
  projectoSyncEnabled,
  resolveProjectoIntegrations,
} from './projecto-igloo-sync.js';

describe('projecto-igloo-sync', () => {
  it('stays off under Vitest unless AIONUI_PROJECTO_SYNC=1', () => {
    expect(projectoSyncEnabled({ VITEST: 'true' })).toBe(false);
    expect(projectoSyncEnabled({ NODE_ENV: 'test' })).toBe(false);
    expect(projectoSyncEnabled({ VITEST: 'true', AIONUI_PROJECTO_SYNC: '1' })).toBe(true);
    expect(projectoSyncEnabled({ AIONUI_PROJECTO_SYNC: '0' })).toBe(false);
  });

  it('builds the full Projecto vendor catalog with PAIR fallback', () => {
    const payload = buildLocalProjectoCatalog({
      projectoOrigin: 'http://127.0.0.1:4715',
      iglooOrigin: 'http://127.0.0.1:9000',
      includeIdentity: true,
    });
    const ids = payload.models.map((model) => model.id);
    expect(ids).toEqual(
      expect.arrayContaining(['vllm', 'projecto-gateway', 'ollama', 'codex', 'PAIR'])
    );
    expect(payload.pair).toEqual({
      id: 'PAIR',
      label: 'PAIR (Projecto local)',
      baseUrl: PAIR_DEFAULT_BASE,
    });
    expect(payload.identity).toEqual({
      sub: 'projecto-operator',
      email: 'operator@projecto.local',
      tenant_role: 'owner',
    });
    expect(payload.defaultsByModality.chat.model).toBe('gemma4:e4b');
    expect(payload.projectoLoginUrl).toBe('http://127.0.0.1:4715/api/auth/continue');
  });

  it('points login continue back at Ideas :3011', () => {
    const payload = buildLocalProjectoCatalog({
      projectoOrigin: 'http://127.0.0.1:4715',
      loginOrigin: 'http://127.0.0.1:9000',
    });
    const url = ideasLoginRedirectUrl(payload, 'http://127.0.0.1:3011');
    expect(url).toContain('http://127.0.0.1:9000/api/auth/continue');
    expect(url).toContain(encodeURIComponent('http://127.0.0.1:3011/#/guid'));
  });

  it('prefers the live Projecto ideas-integrations payload when present', async () => {
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input);
      if (url.endsWith('/api/projecto/ideas-integrations')) {
        return new Response(
          JSON.stringify({
            whitelabel: 'projecto',
            productName: 'Ideas',
            defaultVendor: 'vllm',
            defaultModel: 'gemma4:e4b',
            models: [{ id: 'PAIR', label: 'PAIR (Projecto local)', vendor: 'pair', modality: 'chat', fallback: true }],
            pair: { id: 'PAIR', label: 'PAIR (Projecto local)', baseUrl: 'http://10.0.0.59:8787/v1' },
            projectoLoginUrl: 'http://127.0.0.1:4715/api/auth/continue',
            identity: { sub: 'matt', email: 'matt@projecto.local' },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        );
      }
      return new Response('nope', { status: 404 });
    };
    const payload = await resolveProjectoIntegrations({
      allowRemote: false,
      env: {
        AIONUI_PROJECTO_SYNC: '1',
        PROJECTO_ORIGIN: 'http://127.0.0.1:4715',
        IGLOO_GATEWAY_URL: 'http://127.0.0.1:9000',
      },
      fetchImpl,
    });
    expect(payload?.identity).toEqual({ sub: 'matt', email: 'matt@projecto.local' });
    expect(payload?.pair.baseUrl).toBe('http://10.0.0.59:8787/v1');
    expect(payload?.models.some((model) => model.id === 'PAIR')).toBe(true);
  });
});
