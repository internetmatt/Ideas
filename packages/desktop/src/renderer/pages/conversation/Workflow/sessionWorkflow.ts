/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 *
 * Session-bound Flowise workflow attachment stored on conversation.extra.
 * Pointer only — OpenIdeas owns ChatFlow / flowData.
 */

import { isFlowiseFlowType, type FlowiseChatflow, type FlowiseFlowType } from '@renderer/services/flowise';

export type SessionWorkflowProvider = 'flowise';

export type SessionWorkflowAttachment = {
  provider: SessionWorkflowProvider;
  /** Flowise base URL override for this session */
  base_url?: string;
  /** Flowise chatflow / agentflow id when known */
  flow_id?: string;
  /** OpenIdeas ChatFlow.type */
  flow_type?: FlowiseFlowType;
  /** OpenIdeas workspaceId (local default is General) */
  workspace_id?: string;
  /** Open the session canvas when the conversation loads */
  open_by_default?: boolean;
};

export type SessionWorkflowExtra = {
  session_workflow?: SessionWorkflowAttachment;
};

export function readSessionWorkflow(extra: unknown): SessionWorkflowAttachment | null {
  if (!extra || typeof extra !== 'object') return null;
  const raw = (extra as SessionWorkflowExtra).session_workflow;
  if (!raw || typeof raw !== 'object') return null;
  if (raw.provider !== 'flowise') return null;
  return {
    provider: 'flowise',
    base_url: typeof raw.base_url === 'string' ? raw.base_url : undefined,
    flow_id: typeof raw.flow_id === 'string' ? raw.flow_id : undefined,
    flow_type: isFlowiseFlowType(raw.flow_type) ? raw.flow_type : undefined,
    workspace_id: typeof raw.workspace_id === 'string' ? raw.workspace_id : undefined,
    open_by_default: Boolean(raw.open_by_default),
  };
}

export function attachmentFromChatflow(flow: FlowiseChatflow, baseUrl?: string): SessionWorkflowAttachment {
  return {
    provider: 'flowise',
    base_url: baseUrl,
    flow_id: flow.id,
    flow_type: flow.type,
    workspace_id: flow.workspaceId,
    open_by_default: true,
  };
}

/**
 * PATCH payload for session_workflow only. Spreading conversation.extra
 * re-sends extra.skills / MCP snapshots and aioncore rejects that with 400.
 */
export function sessionWorkflowPatch(next: SessionWorkflowAttachment | null): {
  extra: { session_workflow?: SessionWorkflowAttachment };
  merge_extra: true;
} {
  return {
    extra: next ? { session_workflow: next } : {},
    merge_extra: true,
  };
}
