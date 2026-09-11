/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 *
 * Keep in sync with OpenIdeas/packages/ideas-contract.
 * Ideas must not import flowise-ui or TypeORM.
 */

export const FLOWISE_FLOW_TYPES = ['CHATFLOW', 'AGENTFLOW', 'MULTIAGENT', 'ASSISTANT'] as const;

export type FlowiseFlowType = (typeof FLOWISE_FLOW_TYPES)[number];

export type FlowiseChatflow = {
  id: string;
  name: string;
  type?: FlowiseFlowType;
  workspaceId: string;
  flowData?: string;
  updatedDate?: string;
  deployed?: boolean;
};

export const EMPTY_FLOW_DATA = JSON.stringify({
  nodes: [],
  edges: [],
  viewport: { x: 0, y: 0, zoom: 1 },
});

export const DEFAULT_FLOWISE_WORKSPACE_ID = 'General';

export const DEFAULT_CUSTOM_TOOL_COLOR = '#6366F1';

export type FlowiseTool = {
  id: string;
  name: string;
  description: string;
  color: string;
  iconSrc?: string;
  schema?: string;
  func?: string;
  workspaceId: string;
  createdDate?: string;
  updatedDate?: string;
};

export const CUSTOM_MCP_SERVER_STATUSES = ['PENDING', 'AUTHORIZED', 'ERROR'] as const;
export type CustomMcpServerStatus = (typeof CUSTOM_MCP_SERVER_STATUSES)[number];

export const CUSTOM_MCP_AUTH_TYPES = ['NONE', 'CUSTOM_HEADERS'] as const;
export type CustomMcpAuthType = (typeof CUSTOM_MCP_AUTH_TYPES)[number];

export type FlowiseCustomMcpServer = {
  id: string;
  name: string;
  serverUrl: string;
  iconSrc?: string;
  color?: string;
  authType: CustomMcpAuthType;
  tools?: string;
  toolCount: number;
  status: CustomMcpServerStatus;
  workspaceId: string;
  createdDate?: string;
  updatedDate?: string;
};

export type FlowiseCustomMcpTool = {
  name: string;
  description?: string;
};

export const DEFAULT_API_KEY_PERMISSIONS = ['chatflows:view'] as const;

export type FlowiseApiKey = {
  id: string;
  keyName: string;
  apiKey: string;
  apiSecret?: string;
  permissions: string[];
  workspaceId: string;
  updatedDate?: string;
};

export type FlowiseDocumentStore = {
  id: string;
  name: string;
  description: string;
  status?: string;
  workspaceId: string;
  totalChunks?: number;
  totalChars?: number;
  updatedDate?: string;
  createdDate?: string;
};

export const MARKETPLACE_TEMPLATE_KINDS = ['CHATFLOW', 'AGENTFLOW', 'TOOL'] as const;
export type MarketplaceTemplateKind = (typeof MARKETPLACE_TEMPLATE_KINDS)[number];

export type FlowiseMarketplaceTemplate = {
  id: string;
  templateName: string;
  type: string;
  kind: MarketplaceTemplateKind;
  description: string;
  flowData?: string;
  badge?: string;
  framework?: string[];
  usecases?: string[];
  categories?: string[];
  schema?: string;
  func?: string;
  custom?: boolean;
};
