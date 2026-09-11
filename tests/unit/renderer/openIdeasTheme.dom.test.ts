/**
 * @license
 * Copyright 2026 Projecto / Ideas fork
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it } from 'vitest';

import { syncOpenIdeasIslandTheme } from '@/renderer/services/flowise/openIdeasTheme';

describe('syncOpenIdeasIslandTheme', () => {
  it('writes OpenIdeas isDarkMode for the same-origin island', () => {
    syncOpenIdeasIslandTheme('dark');
    expect(window.localStorage.getItem('isDarkMode')).toBe('true');
    syncOpenIdeasIslandTheme('light');
    expect(window.localStorage.getItem('isDarkMode')).toBe('false');
  });
});
