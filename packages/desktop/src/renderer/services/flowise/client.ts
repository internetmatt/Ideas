/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 *
 * Typed OpenIdeas HTTP client. Talks to the sidecar; does not import flowise-ui.
 */

import { resolveFlowiseUrl } from './resolveFlowiseUrl';
import {
  DEFAULT_FLOWISE_WORKSPACE_ID,
  EMPTY_FLOW_DATA,
  FLOWISE_FLOW_TYPES,
  type FlowiseChatflow,
  type FlowiseFlowType,
} from './types';

const INTERNAL_HEADERS = {
  Accept: 'application/json',
  'x-request-from': 'internal',
};

export class FlowiseClientError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'FlowiseClientError';
    this.status = status;
  }
}

export function isFlowiseFlowType(value: unknown): value is FlowiseFlowType {
  return typeof value === 'string' && (FLOWISE_FLOW_TYPES as readonly string[]).includes(value);
}

export function parseFlowiseChatflow(raw: unknown): FlowiseChatflow | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  if (typeof row.id !== 'string' || !row.id) return null;
  if (typeof row.name !== 'string') return null;
  const workspaceId =
    typeof row.workspaceId === 'string' && row.workspaceId ? row.workspaceId : DEFAULT_FLOWISE_WORKSPACE_ID;
  return {
    id: row.id,
    name: row.name,
    type: isFlowiseFlowType(row.type) ? row.type : undefined,
    workspaceId,
    flowData: typeof row.flowData === 'string' ? row.flowData : undefined,
    updatedDate: typeof row.updatedDate === 'string' ? row.updatedDate : undefined,
    deployed: typeof row.deployed === 'boolean' ? row.deployed : undefined,
  };
}

function parseFlowiseChatflowList(raw: unknown): FlowiseChatflow[] {
  const rows = Array.isArray(raw)
    ? raw
    : raw && typeof raw === 'object' && Array.isArray((raw as { data?: unknown }).data)
      ? (raw as { data: unknown[] }).data
      : [];
  return rows.map(parseFlowiseChatflow).filter((row): row is FlowiseChatflow => row !== null);
}

/** Same-origin `/canvas-island` can reuse the OpenIdeas iframe session cookies. */
function flowiseCredentials(baseUrl: string): RequestCredentials {
  const resolved = resolveFlowiseUrl(baseUrl);
  return resolved.startsWith('/') ? 'same-origin' : 'omit';
}

async function flowiseFetch(baseUrl: string, path: string, init?: RequestInit): Promise<unknown> {
  const resolvedBase = resolveFlowiseUrl(baseUrl);
  const url = `${resolvedBase}${path}`;
  const response = await fetch(url, {
    ...init,
    credentials: flowiseCredentials(resolvedBase),
    headers: {
      ...INTERNAL_HEADERS,
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  });
  if (!response.ok) {
    const body = await response.text();
    throw new FlowiseClientError(body || `OpenIdeas ${response.status}`, response.status);
  }
  if (response.status === 204) return null;
  return response.json();
}

export async function pingFlowise(baseUrl?: string, signal?: AbortSignal): Promise<boolean> {
  try {
    const resolvedBase = resolveFlowiseUrl(baseUrl);
    const url = `${resolvedBase}/api/v1/ping`;
    const response = await fetch(url, { signal, credentials: flowiseCredentials(resolvedBase) });
    return response.ok;
  } catch {
    return false;
  }
}

export async function listChatflows(baseUrl?: string, type?: FlowiseFlowType): Promise<FlowiseChatflow[]> {
  const query = type ? `?type=${encodeURIComponent(type)}` : '';
  return parseFlowiseChatflowList(await flowiseFetch(resolveFlowiseUrl(baseUrl), `/api/v1/chatflows${query}`));
}

export async function getChatflow(baseUrl: string | undefined, id: string): Promise<FlowiseChatflow> {
  const parsed = parseFlowiseChatflow(
    await flowiseFetch(resolveFlowiseUrl(baseUrl), `/api/v1/chatflows/${encodeURIComponent(id)}`)
  );
  if (!parsed) throw new FlowiseClientError('OpenIdeas returned an invalid chatflow', 502);
  return parsed;
}

async function createBlankFlow(
  baseUrl: string | undefined,
  name: string,
  type: Extract<FlowiseFlowType, 'CHATFLOW' | 'AGENTFLOW'>
): Promise<FlowiseChatflow> {
  const parsed = parseFlowiseChatflow(
    await flowiseFetch(resolveFlowiseUrl(baseUrl), '/api/v1/chatflows', {
      method: 'POST',
      body: JSON.stringify({
        name,
        type,
        flowData: EMPTY_FLOW_DATA,
      }),
    })
  );
  if (!parsed) throw new FlowiseClientError('OpenIdeas create returned an invalid chatflow', 502);
  return parsed;
}

export async function createBlankChatflow(baseUrl?: string, name = 'Untitled Chatflow'): Promise<FlowiseChatflow> {
  return createBlankFlow(baseUrl, name, 'CHATFLOW');
}

export async function createBlankAgentflow(baseUrl?: string, name = 'Untitled Agent'): Promise<FlowiseChatflow> {
  return createBlankFlow(baseUrl, name, 'AGENTFLOW');
}

export type FlowisePredictRequest = {
  question: string;
  chatId?: string;
};

export type FlowisePredictResult = {
  text: string;
  chatId?: string;
  chatMessageId?: string;
  raw: unknown;
};

/** Extract assistant text from an OpenIdeas / Flowise prediction payload. */
export function parseFlowisePredictResult(raw: unknown): FlowisePredictResult {
  if (typeof raw === 'string') {
    return { text: raw, raw };
  }
  if (!raw || typeof raw !== 'object') {
    return { text: '', raw };
  }
  const row = raw as Record<string, unknown>;
  let text = '';
  if (typeof row.text === 'string') {
    text = row.text;
  } else if (typeof row.json === 'string') {
    text = row.json;
  } else if (row.json != null) {
    text = JSON.stringify(row.json);
  } else if (typeof row.message === 'string') {
    text = row.message;
  }
  return {
    text,
    chatId: typeof row.chatId === 'string' ? row.chatId : undefined,
    chatMessageId: typeof row.chatMessageId === 'string' ? row.chatMessageId : undefined,
    raw,
  };
}

/**
 * Run a non-streaming OpenIdeas prediction for an attached chatflow/agentflow.
 * Uses the internal prediction endpoint (same auth posture as the canvas editor).
 */
export async function predictChatflow(
  baseUrl: string | undefined,
  chatflowId: string,
  request: FlowisePredictRequest
): Promise<FlowisePredictResult> {
  if (!chatflowId) {
    throw new FlowiseClientError('OpenIdeas chatflow id is required', 400);
  }
  if (!request.question.trim()) {
    throw new FlowiseClientError('OpenIdeas question is required', 400);
  }
  const raw = await flowiseFetch(
    resolveFlowiseUrl(baseUrl),
    `/api/v1/internal-prediction/${encodeURIComponent(chatflowId)}`,
    {
      method: 'POST',
      body: JSON.stringify({
        question: request.question,
        chatId: request.chatId,
        streaming: false,
      }),
    }
  );
  return parseFlowisePredictResult(raw);
}
