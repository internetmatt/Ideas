/**
 * Ideas runtime system-model resolution.
 *
 * Ideas Admin (separate monorepo) and Projecto inject default LLM credentials
 * through `window.__PROJECTO_INTEGRATIONS__.systemProviders` (or the Ideas
 * alias). Local Cloud Agent / whitelabel stacks can also seed via env that
 * web-host turns into the same injection shape.
 *
 * Two first-class connection targets:
 *   - pair   → Projecto + PAIR local inference (OpenAI-compatible)
 *   - ideas  → Ideas-hosted OpenRouter wrapper at ideus.ai
 */

import type { IProvider } from '@/common/config/storage';
import { getPlatformByValue } from '@/renderer/utils/model/modelPlatforms';

export type SystemModelSource = 'pair' | 'ideas' | 'custom';

export type SystemProviderSeed = {
  /** Stable id so re-seed is idempotent. */
  id: string;
  name: string;
  source: SystemModelSource;
  base_url: string;
  api_key?: string;
  models?: string[];
  /** When true, hide raw provider edit UI later (Ideas Admin owned). */
  locked?: boolean;
  platform?: string;
};

type IntegrationsBag = {
  systemProviders?: SystemProviderSeed[];
  /** Preferred source when multiple seeds exist. */
  defaultSystemModelSource?: SystemModelSource;
  pairBaseUrl?: string;
  ideasBaseUrl?: string;
  ideasApiKey?: string;
  pairApiKey?: string;
};

declare global {
  interface Window {
    /** Ideas Admin alias — merged over Projecto inject when both exist. */
    __IDEAS_INTEGRATIONS__?: IntegrationsBag;
  }
}

const PAIR_DEFAULT_BASE = 'http://127.0.0.1:8787/v1';
const IDEAS_DEFAULT_BASE = 'https://api.ideus.ai/v1';
const IDEAS_DEFAULT_MODELS = ['openai/gpt-4o-mini', 'anthropic/claude-sonnet-4'];

function readIntegrations(): IntegrationsBag {
  if (typeof window === 'undefined') return {};
  const projecto = window.__PROJECTO_INTEGRATIONS__;
  const ideas = window.__IDEAS_INTEGRATIONS__;
  return { ...projecto, ...ideas };
}

function pairPresetBase(): string {
  return getPlatformByValue('PAIR')?.base_url || PAIR_DEFAULT_BASE;
}

function ideasPresetBase(): string {
  return getPlatformByValue('Ideas')?.base_url || IDEAS_DEFAULT_BASE;
}

/** Built-in seeds when host only sets source + optional key/url overrides. */
export function builtInSystemProviderSeeds(integrations: IntegrationsBag = readIntegrations()): SystemProviderSeed[] {
  const preferred = integrations.defaultSystemModelSource;
  const seeds: SystemProviderSeed[] = [
    {
      id: 'ideas-system-pair',
      name: 'PAIR (Projecto local)',
      source: 'pair',
      base_url: integrations.pairBaseUrl?.trim() || pairPresetBase(),
      api_key: integrations.pairApiKey?.trim() || '',
      models: [],
      locked: true,
      platform: 'custom',
    },
    {
      id: 'ideas-system-ideus',
      name: 'Ideas Runtime (ideus.ai)',
      source: 'ideas',
      base_url: integrations.ideasBaseUrl?.trim() || ideasPresetBase(),
      api_key: integrations.ideasApiKey?.trim() || '',
      models: IDEAS_DEFAULT_MODELS,
      locked: true,
      platform: 'custom',
    },
  ];
  if (!preferred) return seeds;
  return [...seeds.filter((s) => s.source === preferred), ...seeds.filter((s) => s.source !== preferred)];
}

export function resolveSystemProviderSeeds(): SystemProviderSeed[] {
  const integrations = readIntegrations();
  if (Array.isArray(integrations.systemProviders) && integrations.systemProviders.length > 0) {
    return integrations.systemProviders.filter((s) => typeof s?.id === 'string' && typeof s?.base_url === 'string');
  }
  // Only auto-offer built-ins when host opted into a source or supplied keys/urls.
  if (
    integrations.defaultSystemModelSource ||
    integrations.ideasApiKey ||
    integrations.pairApiKey ||
    integrations.ideasBaseUrl ||
    integrations.pairBaseUrl
  ) {
    return builtInSystemProviderSeeds(integrations);
  }
  return [];
}

export function systemSeedToProvider(seed: SystemProviderSeed): IProvider {
  return {
    id: seed.id,
    name: seed.name,
    platform: seed.platform || 'custom',
    base_url: seed.base_url.replace(/\/$/, ''),
    api_key: seed.api_key || '',
    models: seed.models?.filter(Boolean) ?? [],
  };
}

/** Prefill payload for AddPlatformModal (same shape as deep-link). */
export function systemSeedToDeepLinkPrefill(seed: SystemProviderSeed): {
  base_url: string;
  api_key: string;
  platform: string;
} {
  return {
    base_url: seed.base_url,
    api_key: seed.api_key || '',
    platform: seed.source === 'pair' ? 'PAIR' : seed.source === 'ideas' ? 'Ideas' : 'custom',
  };
}

export function pickPreferredSystemSeed(seeds: SystemProviderSeed[] = resolveSystemProviderSeeds()): SystemProviderSeed | null {
  if (seeds.length === 0) return null;
  const preferred = readIntegrations().defaultSystemModelSource;
  if (preferred) {
    const match = seeds.find((s) => s.source === preferred);
    if (match) return match;
  }
  return seeds[0] ?? null;
}
