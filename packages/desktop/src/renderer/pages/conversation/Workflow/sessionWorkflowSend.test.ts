/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TMessage } from '@/common/chat/chatLib';
import {
  buildSessionWorkflowTextMessage,
  isSessionWorkflowReady,
  trySendViaSessionWorkflow,
} from './sessionWorkflowSend';

vi.mock('@/renderer/pages/conversation/utils/conversationCache', () => ({
  getConversationOrNull: vi.fn(),
}));

vi.mock('@renderer/services/flowise', async () => {
  const actual = await vi.importActual<typeof import('@renderer/services/flowise')>('@renderer/services/flowise');
  return {
    ...actual,
    predictChatflow: vi.fn(),
  };
});

import { getConversationOrNull } from '@/renderer/pages/conversation/utils/conversationCache';
import { FlowiseClientError, predictChatflow } from '@renderer/services/flowise';

const getConversationOrNullMock = vi.mocked(getConversationOrNull);
const predictChatflowMock = vi.mocked(predictChatflow);

describe('isSessionWorkflowReady', () => {
  it('requires a flowise provider and flow_id', () => {
    expect(isSessionWorkflowReady(null)).toBe(false);
    expect(isSessionWorkflowReady({ provider: 'flowise' })).toBe(false);
    expect(isSessionWorkflowReady({ provider: 'flowise', flow_id: 'flow-1' })).toBe(true);
  });
});

describe('buildSessionWorkflowTextMessage', () => {
  it('builds a right-side user text bubble', () => {
    const message = buildSessionWorkflowTextMessage({
      conversationId: 'conv-1',
      content: 'hello',
      position: 'right',
      createdAt: 42,
    });
    expect(message.type).toBe('text');
    expect(message.position).toBe('right');
    expect(message.conversation_id).toBe('conv-1');
    expect(message.created_at).toBe(42);
    expect(message.content).toEqual({ content: 'hello' });
  });
});

describe('trySendViaSessionWorkflow', () => {
  beforeEach(() => {
    getConversationOrNullMock.mockReset();
    predictChatflowMock.mockReset();
  });

  it('returns false when no flow is attached', async () => {
    getConversationOrNullMock.mockResolvedValue({ id: 'conv-1', extra: {} } as never);
    const addOrUpdateMessage = vi.fn();
    await expect(
      trySendViaSessionWorkflow({
        conversationId: 'conv-1',
        input: 'hi',
        addOrUpdateMessage,
        errorMessage: 'failed',
      })
    ).resolves.toBe(false);
    expect(addOrUpdateMessage).not.toHaveBeenCalled();
    expect(predictChatflowMock).not.toHaveBeenCalled();
  });

  it('injects user and assistant messages when prediction succeeds', async () => {
    getConversationOrNullMock.mockResolvedValue({
      id: 'conv-1',
      extra: {
        session_workflow: {
          provider: 'flowise',
          flow_id: 'flow-9',
          base_url: 'http://127.0.0.1:3010',
        },
      },
    } as never);
    predictChatflowMock.mockResolvedValue({
      text: 'workflow says hi',
      raw: { text: 'workflow says hi' },
    });
    const messages: TMessage[] = [];
    const addOrUpdateMessage = vi.fn((message: TMessage) => {
      messages.push(message);
    });

    await expect(
      trySendViaSessionWorkflow({
        conversationId: 'conv-1',
        input: 'hello flow',
        addOrUpdateMessage,
        errorMessage: 'failed',
      })
    ).resolves.toBe(true);

    expect(predictChatflowMock).toHaveBeenCalledWith('http://127.0.0.1:3010', 'flow-9', {
      question: 'hello flow',
      chatId: 'conv-1',
    });
    expect(messages).toHaveLength(2);
    expect(messages[0].position).toBe('right');
    expect(messages[0].content).toEqual({ content: 'hello flow' });
    expect(messages[1].position).toBe('left');
    expect(messages[1].content).toEqual({ content: 'workflow says hi' });
  });

  it('injects an error tip and rethrows when prediction fails', async () => {
    getConversationOrNullMock.mockResolvedValue({
      id: 'conv-1',
      extra: {
        session_workflow: { provider: 'flowise', flow_id: 'flow-9' },
      },
    } as never);
    predictChatflowMock.mockRejectedValue(new FlowiseClientError('boom', 500));
    const messages: TMessage[] = [];
    const addOrUpdateMessage = vi.fn((message: TMessage) => {
      messages.push(message);
    });

    await expect(
      trySendViaSessionWorkflow({
        conversationId: 'conv-1',
        input: 'hello flow',
        addOrUpdateMessage,
        errorMessage: 'OpenIdeas prediction failed',
      })
    ).rejects.toThrow('boom');

    expect(messages).toHaveLength(2);
    expect(messages[0].type).toBe('text');
    expect(messages[1].type).toBe('tips');
    expect(messages[1].content).toMatchObject({
      content: 'OpenIdeas prediction failed',
      type: 'error',
    });
  });
});
