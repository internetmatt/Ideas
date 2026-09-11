/**
 * @license
 * Copyright 2026 Projecto / Ideas fork
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it } from 'vitest';

import { openIdeasSettingsPath, parseOpenIdeasSettingsPage } from '@/renderer/services/flowise/openIdeasPages';
import { withOpenIdeasThemeParam } from '@/renderer/services/flowise/openIdeasTheme';

describe('openIdeasTheme', () => {
  it('appends theme on relative and absolute URLs', () => {
    expect(withOpenIdeasThemeParam('/canvas-island/login', 'dark')).toBe('/canvas-island/login?theme=dark');
    expect(withOpenIdeasThemeParam('/canvas-island/chatflows?x=1', 'light')).toBe(
      '/canvas-island/chatflows?x=1&theme=light'
    );
    expect(withOpenIdeasThemeParam('http://127.0.0.1:3010/agentflows', 'dark')).toBe(
      'http://127.0.0.1:3010/agentflows?theme=dark'
    );
  });
});

describe('openIdeasPages', () => {
  it('defaults unknown pages and builds settings paths', () => {
    expect(parseOpenIdeasSettingsPage('nope')).toBe('chatflows');
    expect(parseOpenIdeasSettingsPage('credentials')).toBe('credentials');
    expect(openIdeasSettingsPath('agentflows')).toBe('/settings/openideas/agentflows');
  });
});
