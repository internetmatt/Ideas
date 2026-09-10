/**
 * @license
 * Copyright 2026 Projecto / Ideas fork
 * SPDX-License-Identifier: Apache-2.0
 *
 * Chatflows belong in Ideas conversation history — one row per chatflow —
 * instead of a nested OpenIdeas catalog. Agentflows stay on assistants.
 */

import type { TChatConversation } from '@/common/config/storage';
import { attachmentFromChatflow, readSessionWorkflow } from './sessionWorkflow';
import type { FlowiseChatflow } from '@renderer/services/flowise';

export const VIRTUAL_CHATFLOW_PREFIX = 'openideas:';
export const CANVAS_FLOW_STORAGE_KEY = 'ideas.canvas.flowId';

export function isChatflowKind(flow: FlowiseChatflow): boolean {
  return !flow.type || flow.type === 'CHATFLOW' || flow.type === 'ASSISTANT';
}

export function isAgentflowKind(flow: FlowiseChatflow): boolean {
  return flow.type === 'AGENTFLOW' || flow.type === 'MULTIAGENT';
}

export function isVirtualChatflowConversation(conversation: TChatConversation): boolean {
  return conversation.id.startsWith(VIRTUAL_CHATFLOW_PREFIX);
}

export function virtualChatflowId(conversation: TChatConversation): string | undefined {
  if (!isVirtualChatflowConversation(conversation)) return undefined;
  const id = conversation.id.slice(VIRTUAL_CHATFLOW_PREFIX.length);
  return id || undefined;
}

export function rememberCanvasFlowId(flowId: string): void {
  try {
    window.sessionStorage.setItem(CANVAS_FLOW_STORAGE_KEY, flowId);
  } catch {
    /* private mode */
  }
}

export function takeCanvasFlowId(): string | undefined {
  try {
    const id = window.sessionStorage.getItem(CANVAS_FLOW_STORAGE_KEY)?.trim();
    if (id) window.sessionStorage.removeItem(CANVAS_FLOW_STORAGE_KEY);
    return id || undefined;
  } catch {
    return undefined;
  }
}

export function asChatflowConversation(flow: FlowiseChatflow): TChatConversation {
  const stamp = flow.updatedDate ? Date.parse(flow.updatedDate) : Date.now();
  const at = Number.isFinite(stamp) ? stamp : Date.now();
  return {
    id: `${VIRTUAL_CHATFLOW_PREFIX}${flow.id}`,
    name: flow.name,
    type: 'aionrs',
    created_at: at,
    modified_at: at,
    extra: {
      session_workflow: attachmentFromChatflow(flow),
      openideas_virtual: true,
    },
  } as TChatConversation;
}

export function mergeChatflowsIntoHistory(
  conversations: TChatConversation[],
  flows: FlowiseChatflow[]
): TChatConversation[] {
  const attached = new Set(
    conversations
      .map((conversation) => readSessionWorkflow(conversation.extra)?.flow_id)
      .filter((id): id is string => Boolean(id))
  );
  const virtual = flows.filter((flow) => isChatflowKind(flow) && !attached.has(flow.id)).map(asChatflowConversation);
  return [...virtual, ...conversations];
}
