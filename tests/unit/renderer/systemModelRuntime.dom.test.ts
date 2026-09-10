import { afterEach, describe, expect, it } from 'vitest';
import {
  mergeProjectoProviders,
  PROJECTO_DEFAULT_LABEL,
  resolveDefaultModelButtonLabel,
  resolveModalityDefault,
} from '@/renderer/services/systemModelRuntime';

afterEach(() => {
  delete window.__PROJECTO_INTEGRATIONS__;
});

describe('systemModelRuntime', () => {
  it('keeps the upstream Default Model label without Projecto', () => {
    expect(resolveDefaultModelButtonLabel('Default Model')).toBe('Default Model');
  });

  it('labels the default button Projecto and falls back to PAIR', () => {
    window.__PROJECTO_INTEGRATIONS__ = {
      whitelabel: 'projecto',
      defaultVendor: 'vllm',
      defaultModel: 'gemma4:e4b',
      pair: { id: 'PAIR', label: 'PAIR (Projecto local)', baseUrl: 'http://127.0.0.1:8787/v1' },
      defaultsByModality: {
        chat: { vendor: 'vllm', model: 'gemma4:e4b' },
        voice: { vendor: 'projecto-gateway', model: 'gemma4:e4b' },
        image: { vendor: 'pair', model: 'gemma4:e4b' },
        video: { vendor: 'pair', model: 'gemma4:e4b' },
      },
      models: [
        { id: 'vllm', label: 'vLLM', vendor: 'vllm', modality: 'chat' },
        { id: 'PAIR', label: 'PAIR (Projecto local)', vendor: 'pair', modality: 'chat', fallback: true },
      ],
    };

    expect(resolveDefaultModelButtonLabel('Default Model')).toBe(PROJECTO_DEFAULT_LABEL);
    expect(resolveModalityDefault('chat')).toEqual({
      vendor: 'vllm',
      model: 'gemma4:e4b',
      fallbackVendor: 'pair',
    });
    expect(resolveModalityDefault('image').vendor).toBe('pair');

    const merged = mergeProjectoProviders([]);
    expect(merged.map((provider) => provider.id)).toEqual(['projecto:vllm', 'projecto:PAIR']);
    expect(merged[0].models).toEqual(['gemma4:e4b']);
    expect(merged[1].base_url).toBe('http://127.0.0.1:8787/v1');
  });
});
