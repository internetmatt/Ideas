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

export const DEFAULT_FLOWISE_URL = 'http://127.0.0.1:3010';

export type FlowiseIntegrations = {
  flowiseUrl?: string;
};

const buildTimeFlowiseUrl = (): string | undefined =>
  (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.VITE_FLOWISE_URL;

declare global {
  interface Window {
    __IDEAS_INTEGRATIONS__?: FlowiseIntegrations;
  }
}

/**
 * Resolve the Flowise base URL from query, host inject, localStorage, or env.
 */
export function resolveFlowiseUrl(override?: string): string {
  const query = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('flowiseUrl') : null;
  const configured =
    override ||
    query ||
    (typeof window !== 'undefined'
      ? window.__IDEAS_INTEGRATIONS__?.flowiseUrl ||
        window.__PROJECTO_INTEGRATIONS__?.flowiseUrl ||
        window.localStorage.getItem('ideas.flowiseUrl') ||
        window.localStorage.getItem('aionui.flowiseUrl')
      : null) ||
    buildTimeFlowiseUrl() ||
    DEFAULT_FLOWISE_URL;

  try {
    const url = new URL(configured);
    return url.origin + url.pathname.replace(/\/$/, '');
  } catch {
    return DEFAULT_FLOWISE_URL;
  }
}

/**
 * Build a Flowise iframe URL optionally scoped to a chatflow / conversation.
 */
export function buildFlowiseEmbedUrl(options?: { baseUrl?: string; flowId?: string; conversationId?: string }): string {
  const base = resolveFlowiseUrl(options?.baseUrl);
  if (options?.flowId) {
    const path = `${base}/canvas/${encodeURIComponent(options.flowId)}`;
    if (!options.conversationId) return path;
    const url = new URL(path);
    url.searchParams.set('conversationId', options.conversationId);
    return url.toString();
  }
  if (!options?.conversationId) return base;
  const url = new URL(base);
  url.searchParams.set('conversationId', options.conversationId);
  return url.toString();
}
