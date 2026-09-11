/**
 * Sync Ideas :3011 with Projecto / Igloo identity + the Projecto LLM catalog.
 *
 * Raw WebUI never sits behind the :4715 cowork proxy, so it has to pull the
 * same `__PROJECTO_INTEGRATIONS__` payload itself. Loopback operators inherit
 * the Projecto identity; login bounces to `/api/auth/continue` (Igloo when
 * that gateway is up) and PAIR is the offline model fallback.
 */

export const PAIR_DEFAULT_BASE = 'http://127.0.0.1:8787/v1';
export const DEFAULT_PROJECTO_ORIGIN = 'http://127.0.0.1:4715';
export const DEFAULT_IGLOO_ORIGIN = 'http://127.0.0.1:9000';

export type ProjectoModelModality = 'chat' | 'voice' | 'image' | 'video';

export type ProjectoModelPreset = {
  id: string;
  label: string;
  vendor: string;
  modality: ProjectoModelModality;
  baseUrl?: string;
  fallback?: boolean;
};

export type ProjectoIntegrationsPayload = {
  whitelabel: string;
  productName: string;
  documentTitle: string;
  flowiseUrl?: string;
  channelsUrl?: string;
  skillsRegistryUrl?: string;
  sharedAgentsUrl?: string;
  agentsInvokeUrl?: string;
  machineAgentsDispatchUrl?: string;
  defaultVendor: string;
  defaultModel: string;
  models: ProjectoModelPreset[];
  pair: { id: 'PAIR'; label: string; baseUrl: string };
  defaultsByModality: Record<ProjectoModelModality, { vendor: string; model: string }>;
  iglooUrl?: string;
  projectoLoginUrl: string;
  identity?: { sub?: string; email?: string; tenant_id?: string; tenant_role?: string; roles?: string[] } | null;
  canvasIsland?: boolean;
};

const PROJECTO_VENDORS: Array<{ id: string; label: string }> = [
  { id: 'codex', label: 'Codex CLI' },
  { id: 'claude', label: 'Claude Code CLI' },
  { id: 'cursor', label: 'Cursor Agent CLI' },
  { id: 'gemini', label: 'Gemini CLI' },
  { id: 'copilot', label: 'GitHub Copilot CLI' },
  { id: 'antigravity', label: 'Antigravity CLI' },
  { id: 'lm-studio', label: 'LM Studio' },
  { id: 'llamacpp', label: 'llama.cpp (local GGUF)' },
  { id: 'vllm', label: 'vLLM' },
  { id: 'projecto-gateway', label: 'Projecto Inference Gateway' },
  { id: 'ollama', label: 'Ollama' },
];

export function projectoSyncEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const raw = env.AIONUI_PROJECTO_SYNC?.trim();
  if (raw === '0' || raw === 'false') return false;
  if (raw === '1' || raw === 'true') return true;
  // Vitest workers do not always set VITEST=true; never probe live :4715 in tests.
  if (env.VITEST || env.VITEST_WORKER_ID || env.NODE_ENV === 'test') return false;
  return true;
}

export function resolveProjectoOrigin(env: NodeJS.ProcessEnv = process.env): string {
  return (env.PROJECTO_ORIGIN || env.AIONUI_PROJECTO_ORIGIN || DEFAULT_PROJECTO_ORIGIN).replace(/\/$/, '');
}

export function resolveIglooOrigin(env: NodeJS.ProcessEnv = process.env): string {
  return (env.IGLOO_GATEWAY_URL || env.PROJECTO_IGLOO_URL || DEFAULT_IGLOO_ORIGIN).replace(/\/$/, '');
}

export function pairBaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  return (env.PROJECTO_PAIR_BASE_URL || env.PAIR_BASE_URL || PAIR_DEFAULT_BASE).replace(/\/$/, '');
}

export function buildLocalProjectoCatalog(args: {
  projectoOrigin: string;
  iglooOrigin?: string;
  loginOrigin?: string;
  includeIdentity?: boolean;
}): ProjectoIntegrationsPayload {
  const origin = args.projectoOrigin.replace(/\/$/, '');
  const loginOrigin = (args.loginOrigin || origin).replace(/\/$/, '');
  const defaultModel = process.env.VLLM_DEFAULT_MODEL?.trim() || process.env.PROJECTO_VLLM_MODEL?.trim() || 'gemma4:e4b';
  const defaultVendor = process.env.PROJECTO_DEFAULT_VENDOR?.trim() || 'vllm';
  const pair = { id: 'PAIR' as const, label: 'PAIR (Projecto local)', baseUrl: pairBaseUrl() };
  const models: ProjectoModelPreset[] = PROJECTO_VENDORS.map((vendor) => ({
    id: vendor.id,
    label: vendor.label,
    vendor: vendor.id,
    modality: 'chat',
  }));
  models.push({
    id: pair.id,
    label: pair.label,
    vendor: 'pair',
    modality: 'chat',
    baseUrl: pair.baseUrl,
    fallback: true,
  });
  return {
    whitelabel: 'projecto',
    productName: 'Ideas',
    documentTitle: 'Projecto · Ideas',
    flowiseUrl: `${origin}/apps/agent-workspace/flows`,
    channelsUrl: `${origin}/apps/agent-workspace/channels`,
    skillsRegistryUrl: `${origin}/api/projecto/skills/registry`,
    sharedAgentsUrl: `${origin}/api/projecto/agents`,
    agentsInvokeUrl: `${origin}/api/agents/invoke`,
    machineAgentsDispatchUrl: `${origin}/api/orchestrator/machine-agents/dispatch`,
    defaultVendor,
    defaultModel,
    models,
    pair,
    defaultsByModality: {
      chat: { vendor: defaultVendor, model: defaultModel },
      voice: { vendor: 'projecto-gateway', model: defaultModel },
      image: { vendor: 'pair', model: defaultModel },
      video: { vendor: 'pair', model: defaultModel },
    },
    iglooUrl: args.iglooOrigin,
    projectoLoginUrl: `${loginOrigin}/api/auth/continue`,
    identity: args.includeIdentity
      ? { sub: 'projecto-operator', email: 'operator@projecto.local', tenant_role: 'owner' }
      : null,
    canvasIsland: true,
  };
}

export function ideasLoginRedirectUrl(payload: ProjectoIntegrationsPayload, ideasOrigin: string): string {
  const returnTo = `${ideasOrigin.replace(/\/$/, '')}/#/guid`;
  const login = new URL(payload.projectoLoginUrl);
  if (!login.pathname.endsWith('/continue')) {
    login.searchParams.set('login', '1');
  }
  login.searchParams.set('return', returnTo);
  return login.toString();
}

async function probeOk(url: string, timeoutMs = 400): Promise<boolean> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    return res.ok;
  } catch {
    return false;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function normalizeIdeasIntegrations(raw: unknown, fallback: ProjectoIntegrationsPayload): ProjectoIntegrationsPayload {
  if (!isRecord(raw)) return fallback;
  const models = Array.isArray(raw.models) ? (raw.models as ProjectoModelPreset[]) : fallback.models;
  const pair =
    isRecord(raw.pair) && typeof raw.pair.baseUrl === 'string'
      ? { id: 'PAIR' as const, label: String(raw.pair.label || fallback.pair.label), baseUrl: String(raw.pair.baseUrl) }
      : fallback.pair;
  return {
    ...fallback,
    ...raw,
    whitelabel: typeof raw.whitelabel === 'string' ? raw.whitelabel : fallback.whitelabel,
    productName: typeof raw.productName === 'string' ? raw.productName : fallback.productName,
    defaultVendor: typeof raw.defaultVendor === 'string' ? raw.defaultVendor : fallback.defaultVendor,
    defaultModel: typeof raw.defaultModel === 'string' ? raw.defaultModel : fallback.defaultModel,
    models: models.length > 0 ? models : fallback.models,
    pair,
    projectoLoginUrl:
      typeof raw.projectoLoginUrl === 'string' ? raw.projectoLoginUrl : fallback.projectoLoginUrl,
    identity: isRecord(raw.identity) ? (raw.identity as ProjectoIntegrationsPayload['identity']) : fallback.identity,
    canvasIsland: true,
  };
}

export async function resolveProjectoIntegrations(args: {
  allowRemote?: boolean;
  env?: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
}): Promise<ProjectoIntegrationsPayload | null> {
  const env = args.env ?? process.env;
  if (!projectoSyncEnabled(env)) return null;

  const projectoOrigin = resolveProjectoOrigin(env);
  const iglooOrigin = resolveIglooOrigin(env);
  const fetchImpl = args.fetchImpl ?? fetch;
  const includeIdentity = args.allowRemote !== true;

  const fallback = buildLocalProjectoCatalog({
    projectoOrigin,
    iglooOrigin,
    includeIdentity,
  });

  const ideasUrl = `${projectoOrigin}/api/projecto/ideas-integrations`;
  try {
    const res = await fetchImpl(ideasUrl, { signal: AbortSignal.timeout(800) });
    if (res.ok) {
      const json = (await res.json()) as unknown;
      const loginOrigin = (await probeOk(`${iglooOrigin}/health`)) ? iglooOrigin : projectoOrigin;
      const normalized = normalizeIdeasIntegrations(json, { ...fallback, projectoLoginUrl: `${loginOrigin}/api/auth/continue` });
      if (includeIdentity && !normalized.identity?.sub && !normalized.identity?.email) {
        normalized.identity = fallback.identity;
      }
      normalized.iglooUrl = iglooOrigin;
      return normalized;
    }
  } catch {
    /* Projecto catalog endpoint may be on an older :4715 — fall through. */
  }

  const projectoUp = await probeOk(`${projectoOrigin}/health`);
  if (!projectoUp) return null;

  const iglooUp = await probeOk(`${iglooOrigin}/health`);
  return buildLocalProjectoCatalog({
    projectoOrigin,
    iglooOrigin,
    loginOrigin: iglooUp ? iglooOrigin : projectoOrigin,
    includeIdentity,
  });
}
