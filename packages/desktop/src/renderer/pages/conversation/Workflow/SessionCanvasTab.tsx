/**
 * @license
 * Copyright 2026 Projecto / Ideas fork
 * SPDX-License-Identifier: Apache-2.0
 *
 * Session canvas inside the workspace Files / Changes / Canvas tab strip.
 */

import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import useSWR from 'swr';
import { ipcBridge } from '@/common';
import type { TChatConversation } from '@/common/config/storage';
import { useCurrentConversation } from '@renderer/pages/conversation/explorer/currentConversationStore';
import { getConversationOrNull } from '@renderer/pages/conversation/utils/conversationCache';
import { setExplorerHostTab } from '@renderer/pages/conversation/explorer/explorerHostTab';
import SessionWorkflowPanel from './SessionWorkflowPanel';
import { readSessionWorkflow, sessionWorkflowPatch, type SessionWorkflowAttachment } from './sessionWorkflow';

const SessionCanvasTab: React.FC = () => {
  const { t } = useTranslation();
  const conversationId = useCurrentConversation();
  const { data: conversation, mutate } = useSWR(conversationId ? `conversation/${conversationId}` : null, () =>
    getConversationOrNull(conversationId!)
  );

  const attachment = useMemo(() => readSessionWorkflow(conversation?.extra), [conversation]);

  const persistAttachment = useCallback(
    async (next: SessionWorkflowAttachment | null) => {
      if (!conversation) return;
      const patch = sessionWorkflowPatch(next);
      await ipcBridge.conversation.update.invoke({
        id: conversation.id,
        updates: { extra: patch.extra as TChatConversation['extra'] },
        merge_extra: patch.merge_extra,
      });
      await mutate();
    },
    [conversation, mutate]
  );

  if (!conversationId || !conversation) {
    return (
      <div
        className='flex-1 min-h-0 flex items-center justify-center px-24px text-center text-13px text-t-secondary leading-22px'
        data-testid='session-workflow-empty'
      >
        {t('conversation.workflow.emptySessionHint')}
      </div>
    );
  }

  return (
    <SessionWorkflowPanel
      conversationId={conversation.id}
      conversationName={conversation.name}
      attachment={attachment}
      variant='tab'
      onClose={() => setExplorerHostTab('files')}
      onAttach={(next) => void persistAttachment(next)}
    />
  );
};

export default SessionCanvasTab;
