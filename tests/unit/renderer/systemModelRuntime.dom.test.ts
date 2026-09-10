/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { afterEach, describe, expect, it } from 'vitest';
import {
  builtInSystemProviderSeeds,
  pickPreferredSystemSeed,
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
