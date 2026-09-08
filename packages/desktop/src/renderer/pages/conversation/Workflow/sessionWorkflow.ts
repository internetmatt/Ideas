/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 *
 * Session-bound Flowise workflow attachment stored on conversation.extra.
 */

export type SessionWorkflowProvider = 'flowise';

export type SessionWorkflowAttachment = {
  provider: SessionWorkflowProvider;
  /** Flowise base URL override for this session */
  base_url?: string;
  /** Flowise chatflow / agentflow id when known */
  flow_id?: string;
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
    open_by_default: Boolean(raw.open_by_default),
  };
}
