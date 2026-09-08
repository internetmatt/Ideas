/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 *
 * Header toggle that attaches / shows the session Flowise workflow canvas.
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import { Button, Tooltip } from '@arco-design/web-react';
import { ShareOne } from '@icon-park/react';
import { useTranslation } from 'react-i18next';
import { ipcBridge } from '@/common';
import type { TChatConversation } from '@/common/config/storage';
import { useSessionWorkflow } from './SessionWorkflowContext';
import SessionWorkflowPanel from './SessionWorkflowPanel';
import { readSessionWorkflow, type SessionWorkflowAttachment } from './sessionWorkflow';

/**
 * Hook for chat shells: toggle button + panel node + open state for ChatLayout.
 */
export function useSessionWorkflowChrome(conversation: TChatConversation | undefined) {
  const { t } = useTranslation();
  const workflow = useSessionWorkflow();
  const attachment = useMemo(
    () => (conversation ? readSessionWorkflow(conversation.extra) : null),
    [conversation]
  );

  useEffect(() => {
    if (attachment?.open_by_default) {
      workflow.open();
    }
  }, [conversation?.id, attachment?.open_by_default, workflow]);

  const persistAttachment = useCallback(
    async (next: SessionWorkflowAttachment | null) => {
      if (!conversation) return;
      await ipcBridge.conversation.update.invoke({
        id: conversation.id,
        updates: {
          extra: {
            ...(conversation.extra as Record<string, unknown>),
            session_workflow: next ?? undefined,
          },
        },
        merge_extra: true,
      });
    },
    [conversation]
  );

  const onToggle = useCallback(() => {
    if (!conversation) return;
    if (!workflow.isOpen) {
      const next: SessionWorkflowAttachment = attachment ?? {
        provider: 'flowise',
        open_by_default: true,
      };
      void persistAttachment({ ...next, open_by_default: true });
      workflow.open();
      return;
    }
    workflow.close();
  }, [attachment, conversation, persistAttachment, workflow]);

  const headerButton = conversation ? (
    <Tooltip content={t('conversation.workflow.toggle')}>
      <Button
        size='mini'
        type={workflow.isOpen ? 'primary' : 'default'}
        icon={<ShareOne theme='outline' size='14' />}
        onClick={onToggle}
        data-testid='session-workflow-toggle'
      >
        {t('conversation.workflow.canvas')}
      </Button>
    </Tooltip>
  ) : null;

  const workflowPanel =
    conversation && workflow.isOpen ? (
      <SessionWorkflowPanel
        conversationId={conversation.id}
        attachment={attachment}
        onClose={() => workflow.close()}
      />
    ) : null;

  return {
    workflowOpen: workflow.isOpen,
    workflowPanel,
    headerButton,
  };
}
