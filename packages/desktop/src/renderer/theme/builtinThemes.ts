/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Theme } from '@/common/theme/types';
import { LIGHT_THEME_ID, DARK_THEME_ID } from '@/common/theme/constants';
import { applyWhitelabelAllowlist, getWhitelabelProfile } from '@renderer/services/whitelabel';
import { defaultThemeCover } from '@renderer/pages/settings/AppearanceSettings/themeCovers';

const T0 = 0;

// Only the official themes ship built in: Light, Dark, and "follow system"
// (the System sentinel is resolved to Light/Dark in resolveActiveTheme, not listed here).
// The former decorative community skins were deprecated and removed; a persisted
// activeId that still points at one resolves to Light via resolveActiveTheme.
const ALL_BUILTIN_THEMES: Theme[] = [
  {
    id: LIGHT_THEME_ID,
    name: 'Light',
    appearance: 'light',
    cover: defaultThemeCover,
    builtin: true,
    created_at: T0,
    updated_at: T0,
  },
  { id: DARK_THEME_ID, name: 'Dark', appearance: 'dark', builtin: true, created_at: T0, updated_at: T0 },
];

/**
 * Filtered at the source so a removed theme is gone from resolution and
 * persistence too, not merely hidden in the picker — a branded build must not
 * re-apply a novelty theme a user selected before the profile was applied.
 */
export const BUILTIN_THEMES: Theme[] = applyWhitelabelAllowlist(
  ALL_BUILTIN_THEMES,
  getWhitelabelProfile().themes,
  (theme) => theme.id
);

export const BUILTIN_THEME_IDS = new Set(BUILTIN_THEMES.map((t) => t.id));
