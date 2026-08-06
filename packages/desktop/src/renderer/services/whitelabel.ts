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
      /** Profile id — see WHITELABEL_PROFILES. */
      whitelabel?: string;
      /** Visible product name (e.g. "OfficeCLI AI"). */
      productName?: string;
      /** document.title already rewritten by Projecto inject; kept for JS readers. */
      documentTitle?: string;
      /** Phase 4 — Projecto skills registry (read-only). */
      skillsRegistryUrl?: string;
      /** Shared assistants ≡ avatars registry. */
      sharedAgentsUrl?: string;
      /** Projecto web login when local AionUI login is disabled. */
      projectoLoginUrl?: string;
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
};

export const WHITELABEL_PROFILES: Readonly<Record<string, WhitelabelProfile>> = {
  [AIONUI_PROFILE.id]: AIONUI_PROFILE,
  [PROJECTO_PROFILE.id]: PROJECTO_PROFILE,
};

/** Unknown ids fall back to upstream rather than silently hiding surfaces. */
export const resolveWhitelabelProfile = (id: string | undefined | null): WhitelabelProfile =>
  (id && WHITELABEL_PROFILES[id]) || AIONUI_PROFILE;

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
