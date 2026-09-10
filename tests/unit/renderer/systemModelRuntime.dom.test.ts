/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { afterEach, describe, expect, it } from 'vitest';
import {
  builtInSystemProviderSeeds,
  mergeProjectoProviders,
  pickPreferredSystemSeed,
  PROJECTO_DEFAULT_LABEL,
  resolveDefaultModelButtonLabel,
  resolveModalityDefault,
  resolveSystemProviderSeeds,
  systemSeedToDeepLinkPrefill,
  systemSeedToProvider,
  type SystemProviderSeed,
} from '@/renderer/services/systemModelRuntime';

describe('systemModelRuntime', () => {
  afterEach(() => {
    delete window.__PROJECTO_INTEGRATIONS__;
    delete window.__IDEAS_INTEGRATIONS__;
  });

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

  it('returns no seeds when host has not opted in', () => {
    expect(resolveSystemProviderSeeds()).toEqual([]);
  });

  it('builds Ideas-first seeds when defaultSystemModelSource is ideas', () => {
    window.__PROJECTO_INTEGRATIONS__ = { defaultSystemModelSource: 'ideas' };
    const seeds = builtInSystemProviderSeeds();
    expect(seeds.map((s) => s.source)).toEqual(['ideas', 'pair']);
    expect(seeds[0]?.base_url).toContain('ideus.ai');
    expect(seeds[1]?.base_url).toContain('127.0.0.1');
  });

  it('prefers explicit systemProviders from Ideas Admin inject', () => {
    window.__IDEAS_INTEGRATIONS__ = {
      systemProviders: [
        {
          id: 'tenant-llm',
          name: 'Tenant LLM',
          source: 'custom',
          base_url: 'https://llm.example.com/v1',
          api_key: 'sk-test',
          models: ['gpt-test'],
        },
      ],
    };
    const seeds = resolveSystemProviderSeeds();
    expect(seeds).toHaveLength(1);
    expect(seeds[0]?.id).toBe('tenant-llm');
    expect(systemSeedToProvider(seeds[0] as SystemProviderSeed)).toMatchObject({
      id: 'tenant-llm',
      base_url: 'https://llm.example.com/v1',
      api_key: 'sk-test',
      models: ['gpt-test'],
    });
  });

  it('maps seeds to AddPlatformModal deep-link prefill', () => {
    const seed: SystemProviderSeed = {
      id: 'ideas-system-pair',
      name: 'PAIR',
      source: 'pair',
      base_url: 'http://127.0.0.1:8787/v1',
      api_key: 'local',
    };
    expect(systemSeedToDeepLinkPrefill(seed)).toEqual({
      base_url: 'http://127.0.0.1:8787/v1',
      api_key: 'local',
      platform: 'PAIR',
    });
    expect(pickPreferredSystemSeed([seed])?.id).toBe('ideas-system-pair');
  });
});
