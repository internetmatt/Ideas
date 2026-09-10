/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it } from 'vitest';
import { readSessionWorkflow } from '@/renderer/pages/conversation/Workflow/sessionWorkflow';
import {
  buildFlowiseEmbedUrl,
  canvasPathForFlowType,
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
          flow_type: 'CHATFLOW',
          open_by_default: true,
        },
      })
    ).toEqual({
      provider: 'flowise',
      base_url: 'http://localhost:3010',
      flow_id: 'abc',
      flow_type: 'CHATFLOW',
      open_by_default: true,
    });
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

  it('routes chatflows to /canvas and agentflows to /v2/agentcanvas', () => {
    expect(canvasPathForFlowType('CHATFLOW')).toBe('/canvas');
    expect(canvasPathForFlowType('ASSISTANT')).toBe('/canvas');
    expect(canvasPathForFlowType('AGENTFLOW')).toBe('/v2/agentcanvas');
    expect(canvasPathForFlowType(undefined)).toBe('/v2/agentcanvas');
  });

  it('scopes chatflow embed URLs with an explicit flow type', () => {
    expect(
      buildFlowiseEmbedUrl({
        baseUrl: 'http://flowise.example:3010',
        flowId: 'flow-1',
        conversationId: 'conv-9',
        flowType: 'CHATFLOW',
      })
    ).toBe('http://flowise.example:3010/canvas/flow-1?conversationId=conv-9');
  });

  it('scopes agentflow embed URLs when flow type is missing or AGENTFLOW', () => {
    expect(
      buildFlowiseEmbedUrl({
        baseUrl: 'http://flowise.example:3010',
        flowId: 'flow-1',
        conversationId: 'conv-9',
      })
    ).toBe('http://flowise.example:3010/v2/agentcanvas/flow-1?conversationId=conv-9');

    expect(
      buildFlowiseEmbedUrl({
        baseUrl: 'http://flowise.example:3010',
        flowId: 'flow-2',
        flowType: 'AGENTFLOW',
      })
    ).toBe('http://flowise.example:3010/v2/agentcanvas/flow-2');
  });
});
