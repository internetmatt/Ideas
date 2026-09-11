/**
 * @license
 * Copyright 2026 Projecto / Ideas fork
 * SPDX-License-Identifier: Apache-2.0
 *
 * OpenIdeas (FlowiseAI upstream) reads `localStorage.isDarkMode` on boot.
 * The same-origin `/canvas-island` iframe shares Ideas' origin, so writing
 * that key before the frame loads keeps Sign In / admin pages on the Ideas
 * appearance instead of the default light theme.
 */

export type OpenIdeasAppearance = 'dark' | 'light';

const DARK_MODE_STORAGE_KEY = 'isDarkMode';

export function syncOpenIdeasIslandTheme(appearance: OpenIdeasAppearance): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(DARK_MODE_STORAGE_KEY, appearance === 'dark' ? 'true' : 'false');
  } catch {
    /* private mode / quota — the iframe still gets color-scheme + ?theme= */
  }
}

/**
 * Append `theme=dark|light` for hosts that read the query, and keep an
 * existing query string intact.
 */
export function withOpenIdeasThemeParam(url: string, appearance: OpenIdeasAppearance): string {
  try {
    if (url.startsWith('/') && !url.startsWith('//')) {
      const parsed = new URL(url, 'http://ideas.local');
      parsed.searchParams.set('theme', appearance);
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
    const parsed = new URL(url);
    parsed.searchParams.set('theme', appearance);
    return parsed.toString();
  } catch {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}theme=${appearance}`;
  }
}
