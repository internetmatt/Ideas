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
import type { IntegrationsBag } from '../systemModelRuntime';

export const DEFAULT_FLOWISE_URL = 'http://127.0.0.1:3010';

/** Same-origin OpenIdeas island served by Ideas web-host. */
export const CANVAS_ISLAND_MOUNT = '/canvas-island';

export type CanvasHostKind = 'local' | 'projector' | 'ideas-hosted';

export const CANVAS_HOST_STORAGE_KEY = 'ideas.canvasHost';

/** Projector EXE cowork mount — used only when host is projector and nothing is injected. */
export const DEFAULT_PROJECTOR_FLOWISE_URL = 'http://127.0.0.1:4715/apps/agent-workspace/flows';

export type FlowiseIntegrations = IntegrationsBag & {
  flowiseUrl?: string;
  canvasIsland?: boolean;
  ideasHostedUrl?: string;
  projectorUrl?: string;
};

export function isCanvasHostKind(value: unknown): value is CanvasHostKind {
  return value === 'local' || value === 'projector' || value === 'ideas-hosted';
}

export function readCanvasHostKind(): CanvasHostKind {
  if (typeof window === 'undefined') return 'local';
  try {
    const stored = window.localStorage.getItem(CANVAS_HOST_STORAGE_KEY);
    return isCanvasHostKind(stored) ? stored : 'local';
  } catch {
    return 'local';
  }
}

export function writeCanvasHostKind(kind: CanvasHostKind): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CANVAS_HOST_STORAGE_KEY, kind);
  } catch {
    /* private mode */
  }
}

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

export function isLoopbackFlowiseEngine(configured: string): boolean {
  try {
    const url = new URL(configured);
    if (url.hostname !== '127.0.0.1' && url.hostname !== 'localhost' && url.hostname !== '::1') {
      return false;
    }
    const port = url.port || (url.protocol === 'https:' ? '443' : '80');
    return port === '3010';
  } catch {
    return false;
  }
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

function injectedIdeasHostedUrl(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  const projecto = window.__PROJECTO_INTEGRATIONS__;
  return (
    window.__IDEAS_INTEGRATIONS__?.ideasHostedUrl?.trim() ||
    projecto?.ideasHostedUrl?.trim() ||
    projecto?.ideas?.hostedUrl?.trim() ||
    undefined
  );
}

function injectedProjectorUrl(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  return (
    window.__IDEAS_INTEGRATIONS__?.projectorUrl?.trim() ||
    window.__PROJECTO_INTEGRATIONS__?.flowiseUrl?.trim() ||
    undefined
  );
}

function remapLoopbackEngineToIsland(configured: string, normalized: string): string {
  if (isBrowserWebUi() && (isLoopbackFlowiseEngine(configured) || isLoopbackFlowiseEngine(normalized))) {
    return CANVAS_ISLAND_MOUNT;
  }
  return normalized;
}

/**
 * Resolve the OpenIdeas base URL from host picker, query, inject, or env.
 * Local WebUI prefers `/canvas-island` so the iframe stays same-origin.
 */
export function resolveFlowiseUrl(override?: string): string {
  const query = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('flowiseUrl') : null;
  if (override) {
    return remapLoopbackEngineToIsland(override, normalizeFlowiseBase(override));
  }
  if (query) {
    return remapLoopbackEngineToIsland(query, normalizeFlowiseBase(query));
  }

  const kind = readCanvasHostKind();
  if (kind === 'ideas-hosted') {
    const hosted = injectedIdeasHostedUrl();
    if (hosted) return normalizeFlowiseBase(hosted);
  }
  if (kind === 'projector') {
    const projector = injectedProjectorUrl();
    if (projector) return remapLoopbackEngineToIsland(projector, normalizeFlowiseBase(projector));
    return DEFAULT_PROJECTOR_FLOWISE_URL;
  }

  const islandDefault = isBrowserWebUi() ? CANVAS_ISLAND_MOUNT : null;
  const configured =
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

  const normalized = normalizeFlowiseBase(configured);
  return remapLoopbackEngineToIsland(configured, normalized);
}

export function canvasPathForFlowType(flowType?: FlowiseFlowType): '/v2/agentcanvas' | '/canvas' {
  return flowType === 'AGENTFLOW' || flowType === 'MULTIAGENT' ? '/v2/agentcanvas' : '/canvas';
}

/** Reject JS holes (`undefined`), empties, and the literal string `"undefined"`. */
export function isUsableFlowId(flowId: unknown): flowId is string {
  if (typeof flowId !== 'string') return false;
  const id = flowId.trim();
  return id.length > 0 && id !== 'undefined' && id !== 'null';
}

function withConversationId(path: string, conversationId?: string): string {
  if (!conversationId) return path;
  if (path.startsWith('/')) return `${path}?conversationId=${encodeURIComponent(conversationId)}`;
  const url = new URL(path);
  url.searchParams.set('conversationId', conversationId);
  return url.toString();
}

/**
 * Build an OpenIdeas iframe URL for a real flow id.
 * Agentflows use `/v2/agentcanvas/:id`; chatflows use `/canvas/:id`.
 * Never returns the catalog (`/chatflows`).
 */
export function buildFlowiseEmbedUrl(options?: {
  baseUrl?: string;
  flowId?: string;
  conversationId?: string;
  flowType?: FlowiseFlowType;
}): string {
  if (!isUsableFlowId(options?.flowId)) return '';
  const base = resolveFlowiseUrl(options?.baseUrl);
  return withConversationId(
    `${base}${canvasPathForFlowType(options.flowType)}/${encodeURIComponent(options.flowId)}`,
    options.conversationId
  );
}

/** Standalone OpenIdeas chatbot for overlaying on the Ideas thread. */
export function buildFlowiseChatbotUrl(options?: {
  baseUrl?: string;
  flowId?: string;
  conversationId?: string;
}): string {
  if (!isUsableFlowId(options?.flowId)) return '';
  const base = resolveFlowiseUrl(options?.baseUrl);
  return withConversationId(`${base}/chatbot/${encodeURIComponent(options.flowId)}`, options.conversationId);
}
