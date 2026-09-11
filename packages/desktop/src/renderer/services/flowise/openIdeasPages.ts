/**
 * @license
 * Copyright 2026 Projecto / Ideas fork
 * SPDX-License-Identifier: Apache-2.0
 *
 * First-class OpenIdeas settings routes. These used to be nested tabs inside
 * one "Flowise" iframe chrome; the settings sider is now the IA.
 */

export const OPENIDEAS_SETTINGS_PAGES = [
  'chatflows',
  'agentflows',
  'assistants',
  'executions',
  'tools',
  'credentials',
  'variables',
  'apikey',
  'document-stores',
  'marketplaces',
  'account',
] as const;

/** Pages shown as Ideas settings sider rows (the rest stay in the gear menu). */
export const OPENIDEAS_SIDER_PAGES = ['chatflows', 'agentflows', 'assistants', 'executions', 'credentials'] as const;

export type OpenIdeasSettingsPage = (typeof OPENIDEAS_SETTINGS_PAGES)[number];

export const DEFAULT_OPENIDEAS_PAGE: OpenIdeasSettingsPage = 'chatflows';

export function isOpenIdeasSettingsPage(value: unknown): value is OpenIdeasSettingsPage {
  return typeof value === 'string' && (OPENIDEAS_SETTINGS_PAGES as readonly string[]).includes(value);
}

export function openIdeasSettingsPath(page: OpenIdeasSettingsPage = DEFAULT_OPENIDEAS_PAGE): string {
  return `/settings/openideas/${page}`;
}

export function parseOpenIdeasSettingsPage(value: unknown): OpenIdeasSettingsPage {
  return isOpenIdeasSettingsPage(value) ? value : DEFAULT_OPENIDEAS_PAGE;
}
