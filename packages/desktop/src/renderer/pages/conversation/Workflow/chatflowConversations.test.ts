/**
 * @license
 * Copyright 2026 Projecto / Ideas fork
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it } from 'vitest';
import type { TChatConversation } from '@/common/config/storage';
import type { FlowiseChatflow } from '@renderer/services/flowise';
import {
  asChatflowConversation,
  isAgentflowKind,
  isChatflowKind,
  isVirtualChatflowConversation,
  mergeChatflowsIntoHistory,
  VIRTUAL_CHATFLOW_PREFIX,
  virtualChatflowId,
} from './chatflowConversations';

const chatflow = (partial: Partial<FlowiseChatflow> & Pick<FlowiseChatflow, 'id' | 'name'>): FlowiseChatflow => ({
  workspaceId: 'General',
  type: 'CHATFLOW',
  ...partial,
});

describe('chatflowConversations', () => {
  it('treats CHATFLOW and ASSISTANT as chat rows, not agentflows', () => {
    expect(isChatflowKind(chatflow({ id: '1', name: 'A' }))).toBe(true);
    expect(isChatflowKind(chatflow({ id: '2', name: 'B', type: 'ASSISTANT' }))).toBe(true);
    expect(isChatflowKind(chatflow({ id: '3', name: 'C', type: 'AGENTFLOW' }))).toBe(false);
    expect(isChatflowKind(chatflow({ id: '4', name: 'D', type: 'MULTIAGENT' }))).toBe(false);
    expect(isAgentflowKind(chatflow({ id: '3', name: 'C', type: 'AGENTFLOW' }))).toBe(true);
    expect(isAgentflowKind(chatflow({ id: '4', name: 'D', type: 'MULTIAGENT' }))).toBe(true);
    expect(isAgentflowKind(chatflow({ id: '1', name: 'A' }))).toBe(false);
  });

  it('merges unattached chatflows ahead of real conversations', () => {
    const real = {
      id: 'hi',
      name: 'hi',
      type: 'aionrs',
      model: {
        id: 'test',
        platform: 'custom',
        name: 'Test',
        base_url: '',
        api_key: '',
        use_model: '',
      },
      created_at: 1,
      modified_at: 1,
      extra: { workspace: '', session_workflow: { provider: 'flowise', flow_id: 'attached' } },
    } as TChatConversation;
    const flows = [
      chatflow({ id: 'attached', name: 'Already a chat' }),
      chatflow({ id: 'orphan', name: 'Assistant chatflow' }),
      chatflow({ id: 'agent', name: 'Agent', type: 'AGENTFLOW' }),
    ];
    const merged = mergeChatflowsIntoHistory([real], flows);
    expect(merged.map((row) => row.id)).toEqual([`${VIRTUAL_CHATFLOW_PREFIX}orphan`, 'hi']);
    expect(isVirtualChatflowConversation(merged[0])).toBe(true);
    expect(virtualChatflowId(merged[0])).toBe('orphan');
    expect(asChatflowConversation(flows[1]).name).toBe('Assistant chatflow');
  });
});
