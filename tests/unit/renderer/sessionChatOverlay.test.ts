/**
 * @license
 * Copyright 2026 Projecto / Ideas fork
 * SPDX-License-Identifier: Apache-2.0
 *
 * @vitest-environment node
 */

import { describe, expect, it } from 'vitest';
import {
  getSessionChatOverlay,
  resetSessionChatOverlayForTest,
  setSessionChatOverlay,
  toggleSessionChatOverlay,
} from '@/renderer/pages/conversation/Workflow/sessionChatOverlayStore';
import { buildFlowiseChatbotUrl } from '@/renderer/services/flowise/resolveFlowiseUrl';

describe('session canvas chat overlay', () => {
  it('builds a chatbot URL for overlaying on the Ideas thread', () => {
    expect(
      buildFlowiseChatbotUrl({
        baseUrl: 'http://flowise.example:3010',
        flowId: 'flow-1',
        conversationId: 'conv-9',
      })
    ).toBe('http://flowise.example:3010/chatbot/flow-1?conversationId=conv-9');
  });

  it('toggles a picture-in-picture overlay without a third column', () => {
    resetSessionChatOverlayForTest();
    expect(getSessionChatOverlay()).toBe('off');
    expect(toggleSessionChatOverlay()).toBe('pip');
    setSessionChatOverlay('cover');
    expect(getSessionChatOverlay()).toBe('cover');
    expect(toggleSessionChatOverlay()).toBe('off');
  });
});
