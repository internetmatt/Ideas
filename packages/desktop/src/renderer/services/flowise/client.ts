/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 *
 * Typed OpenIdeas HTTP client. Talks to the sidecar; does not import flowise-ui.
 */

import { isLoopbackFlowiseEngine, resolveFlowiseUrl } from './resolveFlowiseUrl';
import {
  CUSTOM_MCP_AUTH_TYPES,
  CUSTOM_MCP_SERVER_STATUSES,
  DEFAULT_API_KEY_PERMISSIONS,
  DEFAULT_CUSTOM_TOOL_COLOR,
  DEFAULT_FLOWISE_WORKSPACE_ID,
  EMPTY_FLOW_DATA,
  FLOWISE_FLOW_TYPES,
  type CustomMcpAuthType,
  type CustomMcpServerStatus,
  type FlowiseApiKey,
  type FlowiseChatflow,
  type FlowiseCustomMcpServer,
  type FlowiseCustomMcpTool,
  type FlowiseDocumentStore,
  type FlowiseFlowType,
  type FlowiseMarketplaceTemplate,
  type FlowiseTool,
  type MarketplaceTemplateKind,
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

export function asFlowiseList(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object' && Array.isArray((raw as { data?: unknown }).data)) {
    return (raw as { data: unknown[] }).data;
  }
  return [];
}

function parseFlowiseChatflowList(raw: unknown): FlowiseChatflow[] {
  return asFlowiseList(raw)
    .map(parseFlowiseChatflow)
    .filter((row): row is FlowiseChatflow => row !== null);
}

function optionalDate(value: unknown): string | undefined {
  if (typeof value === 'string' && value) return value;
  if (value instanceof Date) return value.toISOString();
  return undefined;
}

export function parseFlowiseTool(raw: unknown): FlowiseTool | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  if (typeof row.id !== 'string' || !row.id) return null;
  if (typeof row.name !== 'string' || !row.name) return null;
  const workspaceId =
    typeof row.workspaceId === 'string' && row.workspaceId ? row.workspaceId : DEFAULT_FLOWISE_WORKSPACE_ID;
  return {
    id: row.id,
    name: row.name,
    description: typeof row.description === 'string' ? row.description : '',
    color: typeof row.color === 'string' && row.color ? row.color : DEFAULT_CUSTOM_TOOL_COLOR,
    iconSrc: typeof row.iconSrc === 'string' ? row.iconSrc : undefined,
    schema: typeof row.schema === 'string' ? row.schema : undefined,
    func: typeof row.func === 'string' ? row.func : undefined,
    workspaceId,
    createdDate: optionalDate(row.createdDate),
    updatedDate: optionalDate(row.updatedDate),
  };
}

export function parseFlowiseToolList(raw: unknown): FlowiseTool[] {
  return asFlowiseList(raw)
    .map(parseFlowiseTool)
    .filter((row): row is FlowiseTool => row !== null);
}

function isCustomMcpStatus(value: unknown): value is CustomMcpServerStatus {
  return typeof value === 'string' && (CUSTOM_MCP_SERVER_STATUSES as readonly string[]).includes(value);
}

function isCustomMcpAuthType(value: unknown): value is CustomMcpAuthType {
  return typeof value === 'string' && (CUSTOM_MCP_AUTH_TYPES as readonly string[]).includes(value);
}

export function parseFlowiseCustomMcpServer(raw: unknown): FlowiseCustomMcpServer | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  if (typeof row.id !== 'string' || !row.id) return null;
  if (typeof row.name !== 'string' || !row.name) return null;
  const workspaceId =
    typeof row.workspaceId === 'string' && row.workspaceId ? row.workspaceId : DEFAULT_FLOWISE_WORKSPACE_ID;
  const toolCount = typeof row.toolCount === 'number' && Number.isFinite(row.toolCount) ? row.toolCount : 0;
  return {
    id: row.id,
    name: row.name,
    serverUrl: typeof row.serverUrl === 'string' ? row.serverUrl : '',
    iconSrc: typeof row.iconSrc === 'string' ? row.iconSrc : undefined,
    color: typeof row.color === 'string' ? row.color : undefined,
    authType: isCustomMcpAuthType(row.authType) ? row.authType : 'NONE',
    tools: typeof row.tools === 'string' ? row.tools : undefined,
    toolCount,
    status: isCustomMcpStatus(row.status) ? row.status : 'PENDING',
    workspaceId,
    createdDate: optionalDate(row.createdDate),
    updatedDate: optionalDate(row.updatedDate),
  };
}

export function parseFlowiseCustomMcpServerList(raw: unknown): FlowiseCustomMcpServer[] {
  return asFlowiseList(raw)
    .map(parseFlowiseCustomMcpServer)
    .filter((row): row is FlowiseCustomMcpServer => row !== null);
}

export function parseFlowiseCustomMcpTools(raw: unknown): FlowiseCustomMcpTool[] {
  const rows = typeof raw === 'string' ? safeJsonArray(raw) : asFlowiseList(raw);
  return rows
    .map((item): FlowiseCustomMcpTool | null => {
      if (!item || typeof item !== 'object') return null;
      const row = item as Record<string, unknown>;
      const name = typeof row.name === 'string' ? row.name : typeof row.toolName === 'string' ? row.toolName : '';
      if (!name) return null;
      return {
        name,
        description: typeof row.description === 'string' ? row.description : undefined,
      };
    })
    .filter((row): row is FlowiseCustomMcpTool => row !== null);
}

function safeJsonArray(value: string): unknown[] {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Same-origin `/canvas-island` can reuse the OpenIdeas iframe session cookies. */
function flowiseCredentials(baseUrl: string): RequestCredentials {
  const resolved = resolveFlowiseUrl(baseUrl);
  if (resolved.startsWith('/')) return 'same-origin';
  return isLoopbackFlowiseEngine(resolved) ? 'include' : 'omit';
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

export async function listTools(baseUrl?: string): Promise<FlowiseTool[]> {
  return parseFlowiseToolList(await flowiseFetch(resolveFlowiseUrl(baseUrl), '/api/v1/tools'));
}

export async function createTool(
  baseUrl: string | undefined,
  body: { name: string; description?: string; schema?: string; func?: string; color?: string }
): Promise<FlowiseTool> {
  const parsed = parseFlowiseTool(
    await flowiseFetch(resolveFlowiseUrl(baseUrl), '/api/v1/tools', {
      method: 'POST',
      body: JSON.stringify({
        name: body.name,
        description: body.description ?? '',
        schema: body.schema ?? '[]',
        func: body.func ?? '',
        color: body.color ?? DEFAULT_CUSTOM_TOOL_COLOR,
      }),
    })
  );
  if (!parsed) throw new FlowiseClientError('OpenIdeas create returned an invalid tool', 502);
  return parsed;
}

export async function updateTool(
  baseUrl: string | undefined,
  id: string,
  body: { name?: string; description?: string; schema?: string; func?: string; color?: string }
): Promise<FlowiseTool> {
  const parsed = parseFlowiseTool(
    await flowiseFetch(resolveFlowiseUrl(baseUrl), `/api/v1/tools/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    })
  );
  if (!parsed) throw new FlowiseClientError('OpenIdeas update returned an invalid tool', 502);
  return parsed;
}

export async function deleteTool(baseUrl: string | undefined, id: string): Promise<void> {
  await flowiseFetch(resolveFlowiseUrl(baseUrl), `/api/v1/tools/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function listCustomMcpServers(baseUrl?: string): Promise<FlowiseCustomMcpServer[]> {
  return parseFlowiseCustomMcpServerList(await flowiseFetch(resolveFlowiseUrl(baseUrl), '/api/v1/custom-mcp-servers'));
}

export async function createCustomMcpServer(
  baseUrl: string | undefined,
  body: { name: string; serverUrl: string; authType?: CustomMcpAuthType }
): Promise<FlowiseCustomMcpServer> {
  const parsed = parseFlowiseCustomMcpServer(
    await flowiseFetch(resolveFlowiseUrl(baseUrl), '/api/v1/custom-mcp-servers', {
      method: 'POST',
      body: JSON.stringify({
        name: body.name,
        serverUrl: body.serverUrl,
        authType: body.authType ?? 'NONE',
      }),
    })
  );
  if (!parsed) throw new FlowiseClientError('OpenIdeas create returned an invalid custom MCP server', 502);
  return parsed;
}

export async function deleteCustomMcpServer(baseUrl: string | undefined, id: string): Promise<void> {
  await flowiseFetch(resolveFlowiseUrl(baseUrl), `/api/v1/custom-mcp-servers/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export async function authorizeCustomMcpServer(
  baseUrl: string | undefined,
  id: string
): Promise<FlowiseCustomMcpServer> {
  const parsed = parseFlowiseCustomMcpServer(
    await flowiseFetch(resolveFlowiseUrl(baseUrl), `/api/v1/custom-mcp-servers/${encodeURIComponent(id)}/authorize`, {
      method: 'POST',
    })
  );
  if (!parsed) throw new FlowiseClientError('OpenIdeas authorize returned an invalid custom MCP server', 502);
  return parsed;
}

export function parseFlowiseApiKey(raw: unknown): FlowiseApiKey | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  if (typeof row.id !== 'string' || !row.id) return null;
  const keyName = typeof row.keyName === 'string' ? row.keyName : typeof row.name === 'string' ? row.name : '';
  if (!keyName) return null;
  const workspaceId =
    typeof row.workspaceId === 'string' && row.workspaceId ? row.workspaceId : DEFAULT_FLOWISE_WORKSPACE_ID;
  return {
    id: row.id,
    keyName,
    apiKey: typeof row.apiKey === 'string' ? row.apiKey : '',
    apiSecret: typeof row.apiSecret === 'string' ? row.apiSecret : undefined,
    permissions: Array.isArray(row.permissions)
      ? row.permissions.filter((item): item is string => typeof item === 'string')
      : [],
    workspaceId,
    updatedDate: optionalDate(row.updatedDate),
  };
}

export function parseFlowiseApiKeyList(raw: unknown): FlowiseApiKey[] {
  return asFlowiseList(raw)
    .map(parseFlowiseApiKey)
    .filter((row): row is FlowiseApiKey => row !== null);
}

export async function listApiKeys(baseUrl?: string): Promise<FlowiseApiKey[]> {
  return parseFlowiseApiKeyList(await flowiseFetch(resolveFlowiseUrl(baseUrl), '/api/v1/apikey'));
}

export async function createApiKey(
  baseUrl: string | undefined,
  body: { keyName: string; permissions?: string[] }
): Promise<FlowiseApiKey[]> {
  return parseFlowiseApiKeyList(
    await flowiseFetch(resolveFlowiseUrl(baseUrl), '/api/v1/apikey', {
      method: 'POST',
      body: JSON.stringify({
        keyName: body.keyName,
        permissions: body.permissions?.length ? body.permissions : [...DEFAULT_API_KEY_PERMISSIONS],
      }),
    })
  );
}

export async function updateApiKey(
  baseUrl: string | undefined,
  id: string,
  body: { keyName: string; permissions?: string[] }
): Promise<FlowiseApiKey[]> {
  return parseFlowiseApiKeyList(
    await flowiseFetch(resolveFlowiseUrl(baseUrl), `/api/v1/apikey/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify({
        keyName: body.keyName,
        permissions: body.permissions?.length ? body.permissions : [...DEFAULT_API_KEY_PERMISSIONS],
      }),
    })
  );
}

export async function deleteApiKey(baseUrl: string | undefined, id: string): Promise<void> {
  await flowiseFetch(resolveFlowiseUrl(baseUrl), `/api/v1/apikey/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export function parseFlowiseDocumentStore(raw: unknown): FlowiseDocumentStore | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  if (typeof row.id !== 'string' || !row.id) return null;
  if (typeof row.name !== 'string' || !row.name) return null;
  const workspaceId =
    typeof row.workspaceId === 'string' && row.workspaceId ? row.workspaceId : DEFAULT_FLOWISE_WORKSPACE_ID;
  return {
    id: row.id,
    name: row.name,
    description: typeof row.description === 'string' ? row.description : '',
    status: typeof row.status === 'string' ? row.status : undefined,
    workspaceId,
    totalChunks: typeof row.totalChunks === 'number' && Number.isFinite(row.totalChunks) ? row.totalChunks : undefined,
    totalChars: typeof row.totalChars === 'number' && Number.isFinite(row.totalChars) ? row.totalChars : undefined,
    updatedDate: optionalDate(row.updatedDate),
    createdDate: optionalDate(row.createdDate),
  };
}

export function parseFlowiseDocumentStoreList(raw: unknown): FlowiseDocumentStore[] {
  return asFlowiseList(raw)
    .map(parseFlowiseDocumentStore)
    .filter((row): row is FlowiseDocumentStore => row !== null);
}

export async function listDocumentStores(baseUrl?: string): Promise<FlowiseDocumentStore[]> {
  return parseFlowiseDocumentStoreList(await flowiseFetch(resolveFlowiseUrl(baseUrl), '/api/v1/document-store/store'));
}

export async function createDocumentStore(
  baseUrl: string | undefined,
  body: { name: string; description?: string }
): Promise<FlowiseDocumentStore> {
  const parsed = parseFlowiseDocumentStore(
    await flowiseFetch(resolveFlowiseUrl(baseUrl), '/api/v1/document-store/store', {
      method: 'POST',
      body: JSON.stringify({
        name: body.name,
        description: body.description ?? '',
      }),
    })
  );
  if (!parsed) throw new FlowiseClientError('OpenIdeas create returned an invalid document store', 502);
  return parsed;
}

export async function deleteDocumentStore(baseUrl: string | undefined, id: string): Promise<void> {
  await flowiseFetch(resolveFlowiseUrl(baseUrl), `/api/v1/document-store/store/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export function marketplaceKindFromType(type: unknown): MarketplaceTemplateKind {
  const value = typeof type === 'string' ? type.toLowerCase() : '';
  if (value === 'tool' || value === 'tools') return 'TOOL';
  if (value === 'agentflow' || value === 'agentflowv2' || value === 'multiagent' || value === 'agent')
    return 'AGENTFLOW';
  return 'CHATFLOW';
}

export function parseFlowiseMarketplaceTemplate(raw: unknown, custom = false): FlowiseMarketplaceTemplate | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const templateName =
    typeof row.templateName === 'string' ? row.templateName : typeof row.name === 'string' ? row.name : '';
  if (!templateName) return null;
  const type = typeof row.type === 'string' && row.type ? row.type : 'Chatflow';
  const id = typeof row.id === 'string' && row.id ? row.id : `${custom ? 'custom' : 'mp'}-${templateName}`;
  const flowData =
    typeof row.flowData === 'string'
      ? row.flowData
      : row.flowData && typeof row.flowData === 'object'
        ? JSON.stringify(row.flowData)
        : undefined;
  return {
    id,
    templateName,
    type,
    kind: marketplaceKindFromType(type),
    description: typeof row.description === 'string' ? row.description : '',
    flowData,
    badge: typeof row.badge === 'string' ? row.badge : undefined,
    framework: Array.isArray(row.framework)
      ? row.framework.filter((item): item is string => typeof item === 'string')
      : undefined,
    usecases: Array.isArray(row.usecases)
      ? row.usecases.filter((item): item is string => typeof item === 'string')
      : undefined,
    categories: Array.isArray(row.categories)
      ? row.categories.filter((item): item is string => typeof item === 'string')
      : undefined,
    schema: typeof row.schema === 'string' ? row.schema : undefined,
    func: typeof row.func === 'string' ? row.func : undefined,
    custom,
  };
}

export function parseFlowiseMarketplaceTemplateList(raw: unknown, custom = false): FlowiseMarketplaceTemplate[] {
  return asFlowiseList(raw)
    .map((row) => parseFlowiseMarketplaceTemplate(row, custom))
    .filter((row): row is FlowiseMarketplaceTemplate => row !== null);
}

export function marketplaceTemplateHasScheduleInput(template: Pick<FlowiseMarketplaceTemplate, 'flowData'>): boolean {
  if (!template.flowData) return false;
  try {
    const parsed: unknown = JSON.parse(template.flowData);
    const nodes = parsed && typeof parsed === 'object' ? (parsed as { nodes?: unknown }).nodes : undefined;
    if (!Array.isArray(nodes)) return false;
    return nodes.some((node) => {
      if (!node || typeof node !== 'object') return false;
      const data = (node as { data?: Record<string, unknown> }).data;
      if (!data || typeof data !== 'object') return false;
      const inputs =
        data.inputs && typeof data.inputs === 'object' ? (data.inputs as Record<string, unknown>) : undefined;
      return data.name === 'startAgentflow' && inputs?.startInputType === 'scheduleInput';
    });
  } catch {
    return false;
  }
}

export async function listMarketplaceTemplates(baseUrl?: string): Promise<FlowiseMarketplaceTemplate[]> {
  const [stock, custom] = await Promise.all([
    flowiseFetch(resolveFlowiseUrl(baseUrl), '/api/v1/marketplaces/templates'),
    flowiseFetch(resolveFlowiseUrl(baseUrl), '/api/v1/marketplaces/custom').catch((): unknown[] => []),
  ]);
  return [...parseFlowiseMarketplaceTemplateList(stock), ...parseFlowiseMarketplaceTemplateList(custom, true)];
}

function flowDataForClone(flowData: string | undefined): string {
  if (!flowData) return EMPTY_FLOW_DATA;
  try {
    const parsed: unknown = JSON.parse(flowData);
    if (parsed && typeof parsed === 'object' && Array.isArray((parsed as { nodes?: unknown }).nodes)) {
      return flowData;
    }
  } catch {
    /* fall through */
  }
  return EMPTY_FLOW_DATA;
}

export async function cloneMarketplaceTemplate(
  baseUrl: string | undefined,
  template: Pick<FlowiseMarketplaceTemplate, 'templateName' | 'kind' | 'type' | 'flowData'>
): Promise<FlowiseChatflow> {
  const type: Extract<FlowiseFlowType, 'CHATFLOW' | 'AGENTFLOW'> =
    template.kind === 'CHATFLOW' ? 'CHATFLOW' : 'AGENTFLOW';
  const parsed = parseFlowiseChatflow(
    await flowiseFetch(resolveFlowiseUrl(baseUrl), '/api/v1/chatflows', {
      method: 'POST',
      body: JSON.stringify({
        name: template.templateName,
        type,
        flowData: flowDataForClone(template.flowData),
      }),
    })
  );
  if (!parsed) throw new FlowiseClientError('OpenIdeas clone returned an invalid chatflow', 502);
  return parsed;
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
