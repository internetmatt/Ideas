/**
 * @license
 * Copyright 2026 Projecto / Ideas fork
 * SPDX-License-Identifier: Apache-2.0
 *
 * Every Ideas chat owns an OpenIdeas chatflow. Create one when New Chat
 * succeeds or when an older conversation opens Canvas without an attachment.
 */

import { ipcBridge } from '@/common';
import type { TChatConversation } from '@/common/config/storage';
import { createBlankChatflow } from '@renderer/services/flowise';
import { attachmentFromChatflow, readSessionWorkflow, sessionWorkflowPatch, type SessionWorkflowAttachment } from './sessionWorkflow';

export async function attachChatflowToConversation(
  conversation: TChatConversation,
  name = conversation.name
): Promise<SessionWorkflowAttachment | null> {
  const existing = readSessionWorkflow(conversation.extra);
  if (existing?.flow_id) return existing;
  try {
    const created = await createBlankChatflow(undefined, name.trim() || 'Untitled Chatflow');
    const next = attachmentFromChatflow(created);
    const patch = sessionWorkflowPatch(next);
    await ipcBridge.conversation.update.invoke({
      id: conversation.id,
      updates: { extra: patch.extra as TChatConversation['extra'] },
      merge_extra: patch.merge_extra,
    });
    return next;
  } catch {
    return existing;
  }
}
