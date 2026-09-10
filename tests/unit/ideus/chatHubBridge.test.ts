/**
 * @license
 * Copyright 2026 Ideas / Ideus
 * SPDX-License-Identifier: Apache-2.0
 *
 * @vitest-environment node
 */

import { describe, expect, it } from 'vitest';
import {
  AGENTS_NAME,
  CHAT_HUB_NAME,
  coreSessionFromIdeasConversation,
  ideasPointerFromCoreSession,
  isChatHubCompatibleConversation,
} from '@/common/chat/ideusChatHub';

describe('Chat Hub naming shared with AskDilly-Core', () => {
  it('uses Chat Hub for the conversation surface', () => {
    expect(CHAT_HUB_NAME).toBe('Chat Hub');
  });

  it('keeps Agents as the shared chrome label', () => {
    expect(AGENTS_NAME).toBe('Agents');
  });
});

describe('coreSessionFromIdeasConversation', () => {
  it('maps an Ideas cowork conversation onto a Core Chat Hub session', () => {
    const session = coreSessionFromIdeasConversation(
      {
        id: 'conv-1',
        name: 'Draft the brief',
        created_at: 1_700_000_000_000,
        modified_at: 1_700_000_100_000,
        project_id: 'proj-9',
        extra: { pinned: true, pinned_at: 1_700_000_050_000, agent_name: 'Claude' },
      },
      'user-1'
    );

    expect(session).toMatchObject({
      id: 'conv-1',
      title: 'Draft the brief',
      ownerId: 'user-1',
      chatProjectId: 'proj-9',
      pinned: true,
      agentName: 'Claude',
      workflowId: null,
    });
    expect(session.pinnedAt).toBe(new Date(1_700_000_050_000).toISOString());
  });

  it('leaves pin fields empty when the conversation is not pinned', () => {
    const session = coreSessionFromIdeasConversation({
      id: 'conv-2',
      name: 'Scratch',
      created_at: 1_000,
      modified_at: 2_000,
    });

    expect(session.pinned).toBe(false);
    expect(session.pinnedAt).toBeNull();
    expect(session.agentName).toBe('');
  });
});

describe('ideasPointerFromCoreSession', () => {
  it('round-trips Chat Hub ids back to an Ideas conversation pointer', () => {
    const pointer = ideasPointerFromCoreSession({
      id: 'sess-1',
      title: 'New idea',
      ownerId: 'user-1',
      chatProjectId: 'proj-2',
      pinned: true,
      pinnedAt: '2026-01-01T00:00:00.000Z',
      lastMessageAt: '2026-01-02T00:00:00.000Z',
      workflowId: null,
      agentId: null,
      agentName: 'Codex',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
    });

    expect(pointer.conversationId).toBe('sess-1');
    expect(pointer.title).toBe('New idea');
    expect(pointer.projectId).toBe('proj-2');
    expect(pointer.pinned).toBe(true);
    expect(pointer.agentName).toBe('Codex');
    expect(pointer.pinnedAt).toBe(Date.parse('2026-01-01T00:00:00.000Z'));
  });
});

describe('isChatHubCompatibleConversation', () => {
  it('rejects missing conversations so a later bridge can skip them', () => {
    expect(isChatHubCompatibleConversation(undefined)).toBe(false);
    expect(isChatHubCompatibleConversation({ id: '  ', name: 'x', created_at: 0, modified_at: 0 })).toBe(false);
  });

  it('accepts a named Ideas conversation', () => {
    expect(isChatHubCompatibleConversation({ id: 'c1', name: 'Hi', created_at: 1, modified_at: 1 })).toBe(true);
  });
});
