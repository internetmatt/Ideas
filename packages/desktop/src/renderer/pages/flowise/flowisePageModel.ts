/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 *
 * Canvas page is an OpenIdeas island scoped to the active assistant — not a
 * global dump of every Untitled Agent draft.
 */

import { EMPTY_FLOW_DATA, type FlowiseChatflow } from '@renderer/services/flowise';
import type { SessionWorkflowAttachment } from '@renderer/pages/conversation/Workflow/sessionWorkflow';

export function isUntitledDraft(flow: FlowiseChatflow): boolean {
  const name = flow.name.trim().toLowerCase();
  if (name !== 'untitled agent' && name !== 'new agentflow') return false;
  return !flow.flowData || flow.flowData === EMPTY_FLOW_DATA;
}

export function canvasNameForAssistant(assistantName: string): string {
  const base = assistantName.trim() || 'Assistant';
  return `${base} canvas`;
}

export function flowsForAssistant(
  flows: FlowiseChatflow[],
  attachment: SessionWorkflowAttachment | null
): FlowiseChatflow[] {
  if (attachment?.flow_id) {
    return flows.filter((flow) => flow.id === attachment.flow_id);
  }
  return flows.filter((flow) => !isUntitledDraft(flow));
}
