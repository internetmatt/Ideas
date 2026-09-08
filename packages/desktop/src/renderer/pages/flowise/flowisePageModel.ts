/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 *
 * Helpers for the OpenIdeas canvas pickers (session panel + full Canvas page).
 */

import { EMPTY_FLOW_DATA, type FlowiseChatflow, type FlowiseFlowType } from '@renderer/services/flowise';

export function isUntitledDraft(flow: FlowiseChatflow): boolean {
  const name = flow.name.trim().toLowerCase();
  if (
    name !== 'untitled agent' &&
    name !== 'new agentflow' &&
    name !== 'untitled chatflow' &&
    name !== 'new chatflow'
  ) {
    return false;
  }
  return !flow.flowData || flow.flowData === EMPTY_FLOW_DATA;
}

export function canvasNameForAssistant(assistantName: string, kind: 'CHATFLOW' | 'AGENTFLOW' = 'AGENTFLOW'): string {
  const base = assistantName.trim() || 'Assistant';
  return kind === 'CHATFLOW' ? `${base} chatflow` : `${base} canvas`;
}

export function flowTypeLabel(type?: FlowiseFlowType): string {
  if (type === 'CHATFLOW') return 'Chatflow';
  if (type === 'AGENTFLOW' || type === 'MULTIAGENT') return 'Agentflow';
  if (type === 'ASSISTANT') return 'Assistant';
  return 'Flow';
}

export function flowOptionLabel(flow: FlowiseChatflow): string {
  return `${flowTypeLabel(flow.type)} · ${flow.name}`;
}

/** All attachable flows for the Canvas / session pickers (hide empty untitled drafts). */
export function flowsForPicker(flows: FlowiseChatflow[]): FlowiseChatflow[] {
  return flows.filter((flow) => !isUntitledDraft(flow));
}

/**
 * @deprecated Prefer flowsForPicker — session canvas should list every chatflow/agentflow.
 */
export function flowsForAssistant(
  flows: FlowiseChatflow[],
  _attachment: { flow_id?: string } | null
): FlowiseChatflow[] {
  return flowsForPicker(flows);
}
