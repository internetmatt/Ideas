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
