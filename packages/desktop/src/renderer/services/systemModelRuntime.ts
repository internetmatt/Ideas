/**
 * Projecto / PAIR system model defaults for Ideas.
 *
 * When `__PROJECTO_INTEGRATIONS__` is present, the Default Model button reads
 * "Projecto", chat/voice/image/video resolve from the injected catalog, and
 * PAIR (`http://127.0.0.1:8787/v1`) is the local fallback.
 */

import type { IProvider } from '@/common/config/storage';

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
