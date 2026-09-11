/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 *
 * Header toggle that attaches this chat's OpenIdeas chatflow. When the
 * project explorer is open, the node editor is the Files/Changes/Canvas tab —
 * never a third column. The OpenIdeas chatbot overlays the Ideas thread.
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import { Button, Tooltip } from '@arco-design/web-react';
import { Comment, ShareOne } from '@icon-park/react';
import { useTranslation } from 'react-i18next';
import { ipcBridge } from '@/common';
import type { TChatConversation } from '@/common/config/storage';
import { useCurrentProject } from '@/renderer/pages/conversation/explorer/currentProjectStore';
import { setExplorerHostTab, useExplorerHostTab } from '@/renderer/pages/conversation/explorer/explorerHostTab';
import {
  dispatchWorkspaceEnsureExpanded,
  dispatchWorkspaceEnsureOpenEvent,
} from '@/renderer/utils/workspace/workspaceEvents';
import { attachChatflowToConversation } from './attachConversationChatflow';
import SessionChatOverlay from './SessionChatOverlay';
import {
  setSessionChatOverlay,
  toggleSessionChatOverlay,
  useSessionChatOverlay,
} from './sessionChatOverlayStore';
import { useSessionWorkflow } from './SessionWorkflowContext';
import SessionWorkflowPanel from './SessionWorkflowPanel';
import { readSessionWorkflow, sessionWorkflowPatch, type SessionWorkflowAttachment } from './sessionWorkflow';

/**
 * Hook for chat shells: toggle button + panel node + open state for ChatLayout.
 */
export function useSessionWorkflowChrome(conversation: TChatConversation | undefined) {
  const { t } = useTranslation();
  const workflow = useSessionWorkflow();
  const hostTab = useExplorerHostTab();
  const currentProject = useCurrentProject();
  const overlayMode = useSessionChatOverlay();
  const hostedInExplorer = Boolean(currentProject || conversation?.project_id);
  const attachment = useMemo(() => (conversation ? readSessionWorkflow(conversation.extra) : null), [conversation]);
  const canvasActive = hostedInExplorer ? hostTab === 'canvas' : workflow.isOpen;

  const persistAttachment = useCallback(
    async (next: SessionWorkflowAttachment | null) => {
      if (!conversation) return;
      const patch = sessionWorkflowPatch(next);
      await ipcBridge.conversation.update.invoke({
        id: conversation.id,
        updates: { extra: patch.extra as TChatConversation['extra'] },
        merge_extra: patch.merge_extra,
      });
    },
    [conversation]
  );

  const attachFlow = useCallback(async () => {
    if (!conversation) return;
    try {
      const next =
        (await attachChatflowToConversation(conversation)) ??
        attachment ?? {
          provider: 'flowise' as const,
          open_by_default: true,
        };
      await persistAttachment({ ...next, open_by_default: true });
    } catch {
      /* panel still shows offline / empty */
    }
  }, [attachment, conversation, persistAttachment]);

  const attachAndShowCanvas = useCallback(() => {
    if (!conversation) return;
    if (hostedInExplorer) {
      setExplorerHostTab('canvas');
      dispatchWorkspaceEnsureExpanded();
      dispatchWorkspaceEnsureOpenEvent();
    } else {
      workflow.open();
    }
    void attachFlow();
  }, [attachFlow, conversation, hostedInExplorer, workflow]);

  useEffect(() => {
    if (hostedInExplorer && workflow.isOpen) workflow.close();
  }, [hostedInExplorer, workflow]);

  useEffect(() => {
    setSessionChatOverlay('off');
  }, [conversation?.id]);

  const onToggleCanvas = useCallback(() => {
    if (!conversation) return;
    if (hostedInExplorer) {
      if (hostTab === 'canvas') {
        setExplorerHostTab('files');
        return;
      }
      attachAndShowCanvas();
      return;
    }
    if (!workflow.isOpen) {
      attachAndShowCanvas();
      return;
    }
    workflow.close();
  }, [attachAndShowCanvas, conversation, hostedInExplorer, hostTab, workflow]);

  const onToggleOverlay = useCallback(() => {
    if (!conversation) return;
    const next = toggleSessionChatOverlay();
    if (next !== 'off') void attachFlow();
  }, [attachFlow, conversation]);

  const headerButton = conversation ? (
    <>
      <Tooltip content={t('conversation.workflow.toggle')}>
        <Button
          size='mini'
          type={canvasActive ? 'primary' : 'default'}
          icon={<ShareOne theme='outline' size='14' />}
          onClick={onToggleCanvas}
          data-testid='session-workflow-toggle'
        >
          {t('conversation.workflow.canvas')}
        </Button>
      </Tooltip>
      <Tooltip content={t('conversation.workflow.toggleOverlay')}>
        <Button
          size='mini'
          type={overlayMode !== 'off' ? 'primary' : 'default'}
          icon={<Comment theme='outline' size='14' />}
          onClick={onToggleOverlay}
          data-testid='session-chat-overlay-toggle'
        >
          {t('conversation.workflow.overlay')}
        </Button>
      </Tooltip>
    </>
  ) : null;

  const workflowPanel =
    conversation && !hostedInExplorer && workflow.isOpen ? (
      <SessionWorkflowPanel
        conversationId={conversation.id}
        conversationName={conversation.name}
        attachment={attachment}
        onClose={() => workflow.close()}
        onAttach={(next) => void persistAttachment(next)}
      />
    ) : null;

  const chatOverlay =
    conversation && overlayMode !== 'off' ? (
      <SessionChatOverlay conversationId={conversation.id} attachment={attachment} mode={overlayMode} />
    ) : null;

  return {
    workflowOpen: hostedInExplorer ? false : workflow.isOpen,
    workflowPanel,
    headerButton,
    chatOverlay,
  };
}
