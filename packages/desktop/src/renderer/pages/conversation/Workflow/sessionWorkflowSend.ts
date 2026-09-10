/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 *
 * Route chat sends through an attached OpenIdeas / Flowise session workflow.
 */

import type { AgentStreamErrorInfo, TMessage } from '@/common/chat/chatLib';
import { uuid } from '@/common/utils';
import { getConversationOrNull } from '@/renderer/pages/conversation/utils/conversationCache';
import { FlowiseClientError, predictChatflow } from '@renderer/services/flowise';
import { readSessionWorkflow, type SessionWorkflowAttachment } from './sessionWorkflow';

export type SessionWorkflowSendHandler = (message: TMessage, prepend?: boolean) => void;

export function isSessionWorkflowReady(
  attachment: SessionWorkflowAttachment | null | undefined
): attachment is SessionWorkflowAttachment & { flow_id: string } {
  return Boolean(attachment && attachment.provider === 'flowise' && attachment.flow_id);
}

export function buildSessionWorkflowTextMessage(options: {
  conversationId: string;
  content: string;
  position: 'left' | 'right';
  createdAt?: number;
}): TMessage {
  const id = uuid();
  return {
    id,
    msg_id: id,
    conversation_id: options.conversationId,
    type: 'text',
    position: options.position,
    created_at: options.createdAt ?? Date.now(),
    content: {
      content: options.content,
    },
  };
}

function toAgentStreamError(error: unknown): AgentStreamErrorInfo | undefined {
  if (error instanceof FlowiseClientError) {
    return {
      message: error.message,
      code: `flowise_${error.status}`,
      detail: error.message,
      retryable: error.status >= 500,
    };
  }
  if (error instanceof Error) {
    return { message: error.message, detail: error.message };
  }
  if (error == null) return undefined;
  return { message: String(error) };
}

export function buildSessionWorkflowErrorTip(options: {
  conversationId: string;
  content: string;
  error?: unknown;
}): TMessage {
  const id = uuid();
  return {
    id,
    msg_id: id,
    conversation_id: options.conversationId,
    type: 'tips',
    position: 'center',
    created_at: Date.now(),
    content: {
      content: options.content,
      type: 'error',
      error: toAgentStreamError(options.error),
    },
  };
}

/**
 * If the conversation has a Flowise flow attached, send `input` through OpenIdeas
 * prediction and inject local user/assistant bubbles. Returns true when handled.
 */
export async function trySendViaSessionWorkflow(options: {
  conversationId: string;
  input: string;
  addOrUpdateMessage: SessionWorkflowSendHandler;
  errorMessage: string;
}): Promise<boolean> {
  const conversation = await getConversationOrNull(options.conversationId);
  const attachment = readSessionWorkflow(conversation?.extra);
  if (!isSessionWorkflowReady(attachment)) {
    return false;
  }

  const question = options.input.trim();
  if (!question) {
    return false;
  }

  const now = Date.now();
  options.addOrUpdateMessage(
    buildSessionWorkflowTextMessage({
      conversationId: options.conversationId,
      content: question,
      position: 'right',
      createdAt: now,
    }),
    true
  );

  try {
    const result = await predictChatflow(attachment.base_url, attachment.flow_id, {
      question,
      chatId: options.conversationId,
    });
    const answer = result.text.trim() || '(No response from OpenIdeas)';
    options.addOrUpdateMessage(
      buildSessionWorkflowTextMessage({
        conversationId: options.conversationId,
        content: answer,
        position: 'left',
        createdAt: now + 1,
      }),
      true
    );
    return true;
  } catch (error) {
    options.addOrUpdateMessage(
      buildSessionWorkflowErrorTip({
        conversationId: options.conversationId,
        content: options.errorMessage,
        error,
      }),
      true
    );
    throw error;
  }
}
