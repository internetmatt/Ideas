/**
 * @license
 * Copyright 2026 Projecto / Ideas fork
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it } from 'vitest';
import {
  CANVAS_SETTINGS_PAGES,
  canvasSettingsNavigateTo,
  isCanvasSettingsPage,
} from '@/renderer/services/flowise/canvasSettings';

describe('canvas settings pages', () => {
  it('drops catalog tabs so Canvas is not a nested OpenIdeas index', () => {
    expect(CANVAS_SETTINGS_PAGES).not.toContain('tools');
    expect(CANVAS_SETTINGS_PAGES).not.toContain('chatflows');
    expect(CANVAS_SETTINGS_PAGES).not.toContain('agentflows');
    expect(CANVAS_SETTINGS_PAGES).not.toContain('assistants');
    expect(CANVAS_SETTINGS_PAGES).not.toContain('apikey');
    expect(CANVAS_SETTINGS_PAGES).not.toContain('document-stores');
    expect(CANVAS_SETTINGS_PAGES).not.toContain('marketplaces');
    expect(CANVAS_SETTINGS_PAGES).not.toContain('account');
    expect(CANVAS_SETTINGS_PAGES).toEqual(['executions', 'credentials', 'variables']);
    expect(isCanvasSettingsPage('tools')).toBe(false);
    expect(isCanvasSettingsPage('apikey')).toBe(false);
    expect(isCanvasSettingsPage('credentials')).toBe(true);
  });

  it('routes leftover catalog pages onto Ideas owners', () => {
    expect(canvasSettingsNavigateTo('tools')).toBe('/settings/tools');
    expect(canvasSettingsNavigateTo('chatflows')).toBe('/guid');
    expect(canvasSettingsNavigateTo('agentflows')).toBe('/assistants');
    expect(canvasSettingsNavigateTo('apikey')).toBe('/settings/api-keys');
    expect(canvasSettingsNavigateTo('document-stores')).toBe('/settings/document-stores');
    expect(canvasSettingsNavigateTo('marketplaces')).toBe('/settings/marketplaces');
    expect(canvasSettingsNavigateTo('account')).toBe('/settings/openideas-account');
    expect(canvasSettingsNavigateTo('credentials')).toBe('/settings/openideas/credentials');
    expect(canvasSettingsNavigateTo()).toBe('/settings/openideas/credentials');
  });
});
