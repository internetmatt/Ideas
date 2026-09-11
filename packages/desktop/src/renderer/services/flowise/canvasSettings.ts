/**
 * @license
 * Copyright 2026 Projecto / Ideas fork
 * SPDX-License-Identifier: Apache-2.0
 *
 * Canvas settings tabs. Chatflows live in Conversations, agentflows on
 * Assistants, tools on Ideas Tools — never a nested OpenIdeas catalog.
 */

export const CANVAS_SETTINGS_PAGES = ['executions', 'credentials', 'variables'] as const;

/** Legacy Canvas-tab pages that now live as first-class Ideas settings routes. */
export const LIFTED_CANVAS_SETTINGS_PAGES = {
  apikey: '/settings/api-keys',
  'document-stores': '/settings/document-stores',
  marketplaces: '/settings/marketplaces',
  account: '/settings/openideas-account',
} as const;

export type CanvasSettingsPage = (typeof CANVAS_SETTINGS_PAGES)[number];

export const DEFAULT_CANVAS_SETTINGS_PAGE: CanvasSettingsPage = 'credentials';

export function isCanvasSettingsPage(value: unknown): value is CanvasSettingsPage {
  return typeof value === 'string' && (CANVAS_SETTINGS_PAGES as readonly string[]).includes(value);
}

/** Map a Canvas / legacy Flowise settings page onto the Ideas route that owns it. */
export function canvasSettingsNavigateTo(page?: string): string {
  if (page === 'tools') return '/settings/tools';
  if (page === 'assistants' || page === 'agentflows') return '/assistants';
  if (page === 'chatflows') return '/guid';
  if (page && page in LIFTED_CANVAS_SETTINGS_PAGES) {
    return LIFTED_CANVAS_SETTINGS_PAGES[page as keyof typeof LIFTED_CANVAS_SETTINGS_PAGES];
  }
  if (isCanvasSettingsPage(page)) return `/settings/openideas/${page}`;
  return '/settings/openideas/credentials';
}
