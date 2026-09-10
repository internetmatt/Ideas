/**
 * @license
 * Copyright 2026 Projecto / Ideas fork
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Single source for the user-facing product name.
 *
 * This fork presents as **Ideas**. The upstream project is AionUi, and its name
 * still appears throughout the tree in licence headers, tests, docs and
 * identifiers — deliberately. A blanket rename would touch ~1,400 files and
 * make every future upstream merge a conflict, for no user-visible gain. Only
 * strings a user actually reads are routed through here.
 *
 * Two categories are intentionally NOT renamed:
 *
 *   - Filesystem and storage identity (app data directory, config folder
 *     names). Renaming those orphans the data of anyone who already has the
 *     app installed. See LEGACY_STORAGE_NAME.
 *   - Outbound protocol identity (HTTP User-Agent, the OpenRouter `X-Title`
 *     attribution header). Those name the software to third parties and
 *     changing them silently re-attributes traffic.
 */
export const PRODUCT_NAME = 'Ideas';

/**
 * Shared chrome language with AskDilly-Core Chat Hub.
 * Ideas conversations are the cowork analog of Core `/home/chat`.
 * Ideas Agents are local/remote coding agents — not Core n8n workflows
 * (Core `/home/agents` redirects to Overview / workflows).
 */
export const CHAT_HUB_NAME = 'Chat Hub';
export const AGENTS_NAME = 'Agents';

/**
 * The on-disk name this app has always used, kept so existing installs keep
 * finding their data after the display rename. Change this only alongside a
 * migration that moves the old directory.
 */
export const LEGACY_STORAGE_NAME = 'AionUi';
