/**
 * Projecto white-label overlay.
 *
 * AionUi ships a consumer product surface (novelty themes, IM channel
 * connectors). Projecto embeds the same fork as a tenant-facing panel, where
 * those surfaces are noise at best and a support burden at worst.
 *
 * This module is the single seam for narrowing that surface. It filters rather
 * than deletes upstream code, so the fork keeps rebasing cleanly onto the
 * revision pinned in `packages/agent-workspace-contracts/upstreams.json`.
 *
 * Allowlists are deliberate: a theme or channel added upstream stays hidden in
 * a branded build until it is named here, so nothing leaks in on a version bump.
 */

import { DARK_THEME_ID, LIGHT_THEME_ID, SYSTEM_THEME_ID } from '@/common/theme/constants';

declare global {
  interface Window {
    /** Injected by the Projecto shell before the renderer boots. */
    __PROJECTO_INTEGRATIONS__?: {
      flowiseUrl?: string;
      ideasHostedUrl?: string;
      ideas?: { hostedUrl?: string };
      /** Profile id — see WHITELABEL_PROFILES. */
      whitelabel?: string;
      /** Visible product name (e.g. "OfficeCLI AI"). */
      productName?: string;
      /** CLI product name — defaults to `${productName} CLI` when absent. */
      cliName?: string;
      /** Core binary name — the shipped executable, e.g. "ideacore". */
      coreName?: string;
      /** document.title already rewritten by Projecto inject; kept for JS readers. */
      documentTitle?: string;
      /** Phase 4 — Projecto skills registry (read-only). */
      skillsRegistryUrl?: string;
      /** Shared assistants ≡ avatars registry. */
      sharedAgentsUrl?: string;
      /** Projecto web login when local AionUI login is disabled. */
      projectoLoginUrl?: string;
      defaultVendor?: string;
      defaultModel?: string;
      models?: Array<{
        id: string;
        label: string;
        vendor: string;
        modality?: 'chat' | 'voice' | 'image' | 'video';
        baseUrl?: string;
        fallback?: boolean;
      }>;
      pair?: { id?: string; label?: string; baseUrl?: string };
      defaultsByModality?: Partial<
        Record<'chat' | 'voice' | 'image' | 'video', { vendor?: string; model?: string }>
      >;
      iglooUrl?: string;
      /** Phase 1 — verified identity from Projecto JWT (never WP creds). */
      identity?: {
        sub?: string;
        email?: string;
        tenant_id?: string;
        tenant_role?: string;
        roles?: string[];
      };
      projectContext?: Record<string, unknown> | null;
    };
  }
}

export type WhitelabelProfile = {
  id: string;
  /**
   * Ids kept in the UI. `undefined` keeps everything upstream ships; an empty
   * array removes the surface entirely.
   */
  themes?: readonly string[];
  channels?: readonly string[];
  /** Phase 3 — hide third-party provider configuration UI when true. */
  hideProviderConfig?: boolean;
  /**
   * Renames for backend-supplied assistant names, applied at display time.
   * Distinct from the brand tokens: these are third-party CLIs the host ships
   * under its own fork name (Projecto vendors gemini-cli as Pollux), so the
   * upstream name is wrong for this build even though it is not "AionUi".
   */
  assistantAliases?: Readonly<Record<string, string>>;
  /**
   * Builtin skills to hide, by name. These ship inside aioncore, so a
   * whitelabeled build cannot remove them from the backend — it can only
   * decline to surface them. Used for skills that are wrong for this
   * audience (e.g. non-English social-recruiting skills).
   */
  skillDenylist?: readonly string[];
};

/** Upstream AionUi, unfiltered. */
export const AIONUI_PROFILE: WhitelabelProfile = { id: 'aionui' };

/**
 * Projecto tenant panel: neutral themes only, and no IM channels — Projecto
 * owns messaging and tenant identity, so per-user bot credentials configured
 * inside an embedded panel would sit outside that boundary.
 */
export const PROJECTO_PROFILE: WhitelabelProfile = {
  id: 'projecto',
  themes: [LIGHT_THEME_ID, DARK_THEME_ID, SYSTEM_THEME_ID, 'discourse-horizon', 'glittering-input-field'],
  channels: [],
  hideProviderConfig: true,
  // Projecto ships a vendored gemini-cli fork as Pollux; surfacing the
  // upstream name would point users at a CLI this build does not run.
  assistantAliases: { 'Gemini CLI': 'Pollux CLI' },
  // Chinese-language social-recruiting skills shipped by upstream; not
  // applicable to this deployment and untranslated in the UI.
  skillDenylist: ['xiaohongshu-recruiter', 'x-recruiter', 'weixin-file-send'],
};

/**
 * Ideas / work tenant panel. Same allowlist as Projecto (host owns messaging
 * and IdP), but a distinct profile id so experience contracts can inject
 * `whitelabel: "ideas"` without falling back to unfiltered upstream AionUi.
 */
export const IDEAS_PROFILE: WhitelabelProfile = {
  ...PROJECTO_PROFILE,
  id: 'ideas',
};

export const WHITELABEL_PROFILES: Readonly<Record<string, WhitelabelProfile>> = {
  [AIONUI_PROFILE.id]: AIONUI_PROFILE,
  [PROJECTO_PROFILE.id]: PROJECTO_PROFILE,
  [IDEAS_PROFILE.id]: IDEAS_PROFILE,
};

/**
 * Host-shell profiles that trust injected identity and bounce local login to
 * the host IdP. Standalone Ideas (`AIONUI_PRODUCT_NAME=Ideas` with no profile)
 * keeps the full upstream surface and local operator login.
 */
export const isHostOwnedWhitelabel = (id: string | undefined | null): boolean =>
  id === PROJECTO_PROFILE.id || id === IDEAS_PROFILE.id;

/**
 * Unknown ids fall back to upstream rather than silently hiding surfaces — but
 * they no longer do it quietly. Brand name is AIONUI_PRODUCT_NAME / productName;
 * this is the profile id (`projecto`, `ideas`, `aionui`).
 */
export const resolveWhitelabelProfile = (id: string | undefined | null): WhitelabelProfile => {
  if (id && !WHITELABEL_PROFILES[id]) {
    console.warn(
      `[whitelabel] unknown profile id "${id}" — falling back to "${AIONUI_PROFILE.id}". ` +
        `Known ids: ${Object.keys(WHITELABEL_PROFILES).join(', ')}. ` +
        `Set the brand name with AIONUI_PRODUCT_NAME, not the profile id.`
    );
  }
  return (id && WHITELABEL_PROFILES[id]) || AIONUI_PROFILE;
};

/** Cast because the root tsconfig does not pull in `vite/client` types. */
const buildTimeProfileId = (): string | undefined =>
  (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.VITE_AIONUI_WHITELABEL;

const readConfiguredProfileId = (): string | undefined => {
  if (typeof window === 'undefined') return buildTimeProfileId();
  const query = new URLSearchParams(window.location.search).get('whitelabel');
  return query || window.__PROJECTO_INTEGRATIONS__?.whitelabel || buildTimeProfileId();
};

let cached: WhitelabelProfile | null = null;

/** Resolved once — the profile is fixed for the lifetime of the window. */
export const getWhitelabelProfile = (): WhitelabelProfile => {
  cached ??= resolveWhitelabelProfile(readConfiguredProfileId());
  return cached;
};

/** Test seam: profile resolution is otherwise cached for the window's lifetime. */
export const resetWhitelabelProfileCache = (): void => {
  cached = null;
};

/** Applies an allowlist while preserving upstream ordering. */
export const applyWhitelabelAllowlist = <T>(
  items: readonly T[],
  allowed: readonly string[] | undefined,
  idOf: (item: T) => string
): T[] => (allowed === undefined ? [...items] : items.filter((item) => allowed.includes(idOf(item))));

/**
 * Visible product name for branded chrome (e.g. the login title). Prefers the
 * name injected by the Projecto shell over the upstream AionUi default, so a
 * host embedding this fork can rebrand without patching renderer strings.
 */
export const resolveBrandProductName = (fallback: string): string => {
  if (typeof window === 'undefined') return fallback;
  const injected = window.__PROJECTO_INTEGRATIONS__?.productName?.trim();
  return injected || fallback;
};

/**
 * The three brand tokens upstream ships, and what a whitelabeled build calls
 * them. They are genuinely distinct products, not one name in three places:
 *
 *   product  the app / web UI            AionUi   -> e.g. "Ideas"
 *   cli      the command-line product    Aion CLI -> e.g. "OpenIdea CLI"
 *   core     the shipped core binary     AionCore -> e.g. "ideacore"
 *
 * `core` matters because it appears in install and diagnostic copy that tells
 * people which executable to look for; a whitelabeled build ships a binary
 * under its own name, so the message must match what is actually on disk.
 */
export interface BrandNames {
  product: string;
  cli: string;
  core: string;
}

export const UPSTREAM_BRAND: BrandNames = {
  product: 'AionUi',
  cli: 'Aion CLI',
  core: 'AionCore',
};

/** Resolved brand names; falls back to upstream for anything not injected. */
export const resolveBrandNames = (): BrandNames => {
  if (typeof window === 'undefined') return UPSTREAM_BRAND;
  const injected = window.__PROJECTO_INTEGRATIONS__;
  const product = injected?.productName?.trim() || UPSTREAM_BRAND.product;
  return {
    product,
    // A host that rebrands the product but not the CLI still gets a coherent
    // CLI name rather than the upstream one leaking through.
    cli: injected?.cliName?.trim() || (product === UPSTREAM_BRAND.product ? UPSTREAM_BRAND.cli : `${product} CLI`),
    core: injected?.coreName?.trim() || UPSTREAM_BRAND.core,
  };
};

/**
 * Rebrands upstream tokens inside DATA strings — names that arrive from the
 * backend rather than from i18n, so the translation post-processor never sees
 * them. The generated CLI assistant is the live case: aioncore persists it as
 * `name: "Aion CLI"` (source "generated", preset_agent_type "aionrs"), and it
 * rendered unbranded in an otherwise fully branded UI.
 *
 * Display-side only: the stored record keeps its upstream name, so nothing is
 * migrated and un-whitelabeled builds are unaffected.
 */
export const brandDataString = (value: string | null | undefined): string => {
  if (!value) return value ?? '';
  const brand = resolveBrandNames();
  // Aliases are profile-driven, so they apply even on an unbranded build —
  // an early return on brand alone would silently skip them.
  const alias = (v: string): string => getWhitelabelProfile().assistantAliases?.[v] ?? v;
  if (isUpstreamBrand(brand)) return alias(value);
  const rebranded = value
    .replace(new RegExp(`\\b${UPSTREAM_BRAND.cli}\\b`, 'g'), brand.cli)
    .replace(new RegExp(`\\b${UPSTREAM_BRAND.core}\\b`, 'g'), brand.core)
    .replace(new RegExp(`\\b${UPSTREAM_BRAND.product}\\b`, 'g'), brand.product);
  // Exact-match aliases run last so they see the already-rebranded string.
  return alias(rebranded);
};

/** Whether a builtin skill should be surfaced under the active profile. */
export const isSkillVisible = (skillName: string): boolean =>
  !getWhitelabelProfile().skillDenylist?.includes(skillName);

/** True when nothing is rebranded — lets callers skip work entirely. */
export const isUpstreamBrand = (b: BrandNames): boolean =>
  b.product === UPSTREAM_BRAND.product && b.cli === UPSTREAM_BRAND.cli && b.core === UPSTREAM_BRAND.core;
