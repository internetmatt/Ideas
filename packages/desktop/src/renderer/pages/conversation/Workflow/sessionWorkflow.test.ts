/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it } from 'vitest';
import { readSessionWorkflow, sessionWorkflowPatch } from '@/renderer/pages/conversation/Workflow/sessionWorkflow';
import {
  buildFlowiseChatbotUrl,
  buildFlowiseEmbedUrl,
  DEFAULT_FLOWISE_URL,
  resolveFlowiseUrl,
} from '@/renderer/services/flowise/resolveFlowiseUrl';

describe('readSessionWorkflow', () => {
  it('returns null for missing or invalid extra', () => {
    expect(readSessionWorkflow(undefined)).toBeNull();
    expect(readSessionWorkflow({})).toBeNull();
    expect(readSessionWorkflow({ session_workflow: { provider: 'other' } })).toBeNull();
  });

  it('reads a flowise attachment', () => {
    expect(
      readSessionWorkflow({
        session_workflow: {
          provider: 'flowise',
          base_url: 'http://localhost:3010',
          flow_id: 'abc',
          open_by_default: true,
        },
      })
    ).toEqual({
      provider: 'flowise',
      base_url: 'http://localhost:3010',
      flow_id: 'abc',
      open_by_default: true,
    });
  });

  it('patches only session_workflow so skills stay off the wire', () => {
    const next = {
      provider: 'flowise' as const,
      flow_id: 'abc',
      open_by_default: true,
    };
    expect(sessionWorkflowPatch(next)).toEqual({
      extra: { session_workflow: next },
      merge_extra: true,
    });
    expect(sessionWorkflowPatch(null)).toEqual({ extra: {}, merge_extra: true });
  });
});

describe('resolveFlowiseUrl / buildFlowiseEmbedUrl', () => {
  it('falls back to the default base URL', () => {
    expect(resolveFlowiseUrl()).toBe(DEFAULT_FLOWISE_URL);
    expect(DEFAULT_FLOWISE_URL).toBe('http://127.0.0.1:3010');
  });

  it('honors an explicit override', () => {
    expect(resolveFlowiseUrl('http://flowise.example:3010/')).toBe('http://flowise.example:3010');
  });

  it('scopes embed URLs to a flow and conversation', () => {
    expect(
      buildFlowiseEmbedUrl({
        baseUrl: 'http://flowise.example:3010',
        flowId: 'flow-1',
        conversationId: 'conv-9',
      })
    ).toBe('http://flowise.example:3010/canvas/flow-1?conversationId=conv-9');
  });

  it('scopes chatbot overlay URLs to a flow and conversation', () => {
    expect(
      buildFlowiseChatbotUrl({
        baseUrl: 'http://flowise.example:3010',
        flowId: 'flow-1',
        conversationId: 'conv-9',
      })
    ).toBe('http://flowise.example:3010/chatbot/flow-1?conversationId=conv-9');
  });
});
