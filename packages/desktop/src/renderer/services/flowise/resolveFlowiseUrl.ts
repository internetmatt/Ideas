/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 *
 * Shared Flowise URL resolution for the Ideas fork.
 * Keeps Flowise deployable as a separate service while AionUi embeds it.
 *
 * Port map (local / Projecto stack):
 * - 3000 → Projecto shell-router
 * - 3010 → Flowise (embed target)
 * - 3011 → Ideas / AionUi WebUI
 */

import type { FlowiseFlowType } from './types';

export const DEFAULT_FLOWISE_URL = 'http://127.0.0.1:3010';

/** Same-origin OpenIdeas island served by Ideas web-host. */
export const CANVAS_ISLAND_MOUNT = '/canvas-island';

export type FlowiseIntegrations = {
  flowiseUrl?: string;
  canvasIsland?: boolean;
};

const buildTimeFlowiseUrl = (): string | undefined =>
  (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.VITE_FLOWISE_URL;

declare global {
  interface Window {
    __IDEAS_INTEGRATIONS__?: FlowiseIntegrations;
  }
}

function isBrowserWebUi(): boolean {
  return typeof window !== 'undefined' && !window.electronAPI;
}

function normalizeFlowiseBase(configured: string): string {
  if (configured.startsWith('/') && !configured.startsWith('//')) {
    return configured.replace(/\/$/, '') || CANVAS_ISLAND_MOUNT;
  }
  try {
    const url = new URL(configured);
    return url.origin + url.pathname.replace(/\/$/, '');
  } catch {
    return DEFAULT_FLOWISE_URL;
  }
}

/**
 * Resolve the Flowise base URL from query, host inject, localStorage, or env.
 * Standalone WebUI prefers `/canvas-island` (same origin) so the iframe and
 * typed client do not talk to :3010 directly.
 */
export function resolveFlowiseUrl(override?: string): string {
  const query = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('flowiseUrl') : null;
  const islandDefault = isBrowserWebUi() ? CANVAS_ISLAND_MOUNT : null;
  const configured =
    override ||
    query ||
    (typeof window !== 'undefined'
      ? window.__IDEAS_INTEGRATIONS__?.flowiseUrl ||
        window.__PROJECTO_INTEGRATIONS__?.flowiseUrl ||
        (islandDefault
          ? null
          : window.localStorage.getItem('ideas.flowiseUrl') || window.localStorage.getItem('aionui.flowiseUrl'))
      : null) ||
    islandDefault ||
    buildTimeFlowiseUrl() ||
    DEFAULT_FLOWISE_URL;

  return normalizeFlowiseBase(configured);
}

export function canvasPathForFlowType(flowType?: FlowiseFlowType): '/v2/agentcanvas' | '/canvas' {
  return flowType === 'CHATFLOW' || flowType === 'ASSISTANT' ? '/canvas' : '/v2/agentcanvas';
}

function withConversationId(path: string, conversationId?: string): string {
  if (!conversationId) return path;
  if (path.startsWith('/')) return `${path}?conversationId=${encodeURIComponent(conversationId)}`;
  const url = new URL(path);
  url.searchParams.set('conversationId', conversationId);
  return url.toString();
}

/**
 * Build a Flowise iframe URL optionally scoped to a chatflow / conversation.
 * Agentflows use `/v2/agentcanvas/:id`; chatflows use `/canvas/:id`.
 */
export function buildFlowiseEmbedUrl(options?: {
  baseUrl?: string;
  flowId?: string;
  conversationId?: string;
  flowType?: FlowiseFlowType;
}): string {
  const base = resolveFlowiseUrl(options?.baseUrl);
  if (options?.flowId) {
    return withConversationId(
      `${base}${canvasPathForFlowType(options.flowType)}/${encodeURIComponent(options.flowId)}`,
      options.conversationId
    );
  }
  return withConversationId(base, options?.conversationId);
}
