/**
 * Projecto / PAIR catalog presets plus Ideas Admin system-provider seeds.
 *
 * When `__PROJECTO_INTEGRATIONS__` is present, the Default Model button can
 * read "Projecto", chat/voice/image/video resolve from the injected catalog,
 * and PAIR (`http://127.0.0.1:8787/v1`) is the local fallback.
 *
 * Ideas Admin and Projecto can also inject default LLM credentials through
 * `window.__PROJECTO_INTEGRATIONS__.systemProviders` (or `__IDEAS_INTEGRATIONS__`).
 * Two first-class connection targets:
 *   - pair   → Projecto + PAIR local inference (OpenAI-compatible)
 *   - ideas  → Ideas-hosted OpenRouter wrapper at ideus.ai
 */

import type { IProvider } from '@/common/config/storage';
import { getPlatformByValue } from '@/renderer/utils/model/modelPlatforms';

export const PAIR_DEFAULT_BASE = 'http://127.0.0.1:8787/v1';
export const PROJECTO_DEFAULT_LABEL = 'Projecto';

export type ProjectoModelModality = 'chat' | 'voice' | 'image' | 'video';

export type ProjectoModelPreset = {
  id: string;
  label: string;
  vendor: string;
  modality?: ProjectoModelModality;
  baseUrl?: string;
  fallback?: boolean;
};

type ProjectoIntegrations = {
  whitelabel?: string;
  productName?: string;
  defaultVendor?: string;
  defaultModel?: string;
  models?: ProjectoModelPreset[];
  pair?: { id?: string; label?: string; baseUrl?: string };
  defaultsByModality?: Partial<Record<ProjectoModelModality, { vendor?: string; model?: string }>>;
  identity?: { sub?: string; email?: string };
};

function integrations(): ProjectoIntegrations | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.__PROJECTO_INTEGRATIONS__ as ProjectoIntegrations | undefined;
}

export function isProjectoModelHost(integ: ProjectoIntegrations | undefined = integrations()): boolean {
  if (!integ) return false;
  if (integ.whitelabel === 'projecto') return true;
  return Boolean(integ.models?.length || integ.pair || integ.defaultVendor);
}

export function resolveDefaultModelButtonLabel(fallback: string, integ: ProjectoIntegrations | undefined = integrations()): string {
  if (!isProjectoModelHost(integ)) return fallback;
  const name = integ?.productName?.trim();
  return name && name.toLowerCase() !== 'ideas' ? name : PROJECTO_DEFAULT_LABEL;
}

export function resolvePairBase(integ: ProjectoIntegrations | undefined = integrations()): string {
  return integ?.pair?.baseUrl?.trim() || PAIR_DEFAULT_BASE;
}

export function resolveModalityDefault(
  modality: ProjectoModelModality,
  integ: ProjectoIntegrations | undefined = integrations()
): { vendor: string; model: string; fallbackVendor: 'pair' } {
  const byModality = integ?.defaultsByModality?.[modality];
  const vendor = byModality?.vendor?.trim() || integ?.defaultVendor?.trim() || (modality === 'chat' ? 'vllm' : 'pair');
  const model = byModality?.model?.trim() || integ?.defaultModel?.trim() || 'gemma4:e4b';
  return { vendor, model, fallbackVendor: 'pair' };
}

export function projectoPresetProviders(integ: ProjectoIntegrations | undefined = integrations()): IProvider[] {
  if (!isProjectoModelHost(integ)) return [];
  const pairBase = resolvePairBase(integ);
  const models = integ?.models?.length
    ? integ.models
    : [
        {
          id: 'PAIR',
          label: 'PAIR (Projecto local)',
          vendor: 'pair',
          modality: 'chat' as const,
          baseUrl: pairBase,
          fallback: true,
        },
      ];
  const chatDefault = resolveModalityDefault('chat', integ);
  return models.map((preset, index) => {
    const isPair = preset.id === 'PAIR' || preset.vendor === 'pair';
    const modelId = isPair ? chatDefault.model : preset.id === chatDefault.vendor ? chatDefault.model : preset.id;
    return {
      id: `projecto:${preset.id}`,
      platform: 'custom',
      name: preset.label || preset.id,
      base_url: preset.baseUrl || (isPair ? pairBase : ''),
      api_key: '',
      models: [modelId],
      enabled: true,
      // First catalog entry (usually vLLM / Projecto default) sorts ahead of PAIR.
      sortHint: index,
    } as IProvider & { sortHint?: number };
  });
}

export function mergeProjectoProviders(existing: IProvider[], integ: ProjectoIntegrations | undefined = integrations()): IProvider[] {
  const presets = projectoPresetProviders(integ);
  if (presets.length === 0) return existing;
  const seen = new Set(existing.map((provider) => provider.id));
  const extras = presets.filter((provider) => !seen.has(provider.id));
  return [...extras, ...existing];
}

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
