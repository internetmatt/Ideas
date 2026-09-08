/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 *
 * OpenIdeas canvas island for the active assistant. No "open direct" / reload
 * iframe chrome — the island is same-origin. Flows are session_workflow
 * attachments, not a global Untitled Agent dump.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Tag } from '@arco-design/web-react';
import { ShareOne } from '@icon-park/react';
import { useTranslation } from 'react-i18next';
import { ipcBridge } from '@/common';
import type { TChatConversation } from '@/common/config/storage';
import { useCurrentConversation } from '@renderer/pages/conversation/explorer/currentConversationStore';
import { getConversationOrNull } from '@renderer/pages/conversation/utils/conversationCache';
import {
  attachmentFromChatflow,
  readSessionWorkflow,
  type SessionWorkflowAttachment,
} from '@renderer/pages/conversation/Workflow/sessionWorkflow';
import {
  buildFlowiseEmbedUrl,
  createBlankAgentflow,
  getChatflow,
  pingFlowise,
  resolveFlowiseUrl,
  type FlowiseChatflow,
} from '@renderer/services/flowise';
import { canvasNameForAssistant } from './flowisePageModel';

const FlowisePage: React.FC = () => {
  const { t } = useTranslation();
  const conversationId = useCurrentConversation();
  const flowiseUrl = useMemo(() => resolveFlowiseUrl(), []);
  const [status, setStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [conversation, setConversation] = useState<TChatConversation | null>(null);
  const [attachedFlow, setAttachedFlow] = useState<FlowiseChatflow | null>(null);
  const [busy, setBusy] = useState(false);

  const attachment = useMemo(() => readSessionWorkflow(conversation?.extra), [conversation]);
  const assistantName = conversation?.assistant?.name || conversation?.name || '';

  const embedUrl = useMemo(
    () =>
      buildFlowiseEmbedUrl({
        baseUrl: flowiseUrl,
        flowId: attachment?.flow_id,
        conversationId: conversation?.id,
        flowType: attachedFlow?.type || attachment?.flow_type,
      }),
    [flowiseUrl, attachment?.flow_id, attachment?.flow_type, attachedFlow?.type, conversation?.id]
  );

  const persistAttachment = useCallback(
    async (next: SessionWorkflowAttachment) => {
      if (!conversation) return;
      await ipcBridge.conversation.update.invoke({
        id: conversation.id,
        updates: {
          extra: {
            ...(conversation.extra as Record<string, unknown>),
            session_workflow: next,
          } as TChatConversation['extra'],
        },
        merge_extra: true,
      });
      setConversation((current) =>
        current
          ? {
              ...current,
              extra: { ...(current.extra as Record<string, unknown>), session_workflow: next } as TChatConversation['extra'],
            }
          : current
      );
    },
    [conversation]
  );

  const refresh = useCallback(async () => {
    const online = await pingFlowise(flowiseUrl);
    setStatus(online ? 'online' : 'offline');
    if (!conversationId) {
      setConversation(null);
      setAttachedFlow(null);
      return;
    }
    const nextConversation = await getConversationOrNull(conversationId);
    setConversation(nextConversation);
    const nextAttachment = readSessionWorkflow(nextConversation?.extra);
    if (!online || !nextAttachment?.flow_id) {
      setAttachedFlow(null);
      return;
    }
    try {
      setAttachedFlow(await getChatflow(flowiseUrl, nextAttachment.flow_id));
    } catch {
      setAttachedFlow(null);
    }
  }, [conversationId, flowiseUrl]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const onCreateForAssistant = useCallback(async () => {
    if (!conversation) return;
    setBusy(true);
    try {
      const created = await createBlankAgentflow(flowiseUrl, canvasNameForAssistant(assistantName));
      setAttachedFlow(created);
      await persistAttachment(attachmentFromChatflow(created, flowiseUrl));
    } catch {
      // ping can succeed while create is denied
    } finally {
      setBusy(false);
    }
  }, [assistantName, conversation, flowiseUrl, persistAttachment]);

  const island =
    attachment?.flow_id && status === 'online' ? (
      <iframe
        className='flex-1 min-h-0 w-full border-0 bg-1'
        title={attachedFlow?.name || t('conversation.workflow.canvas')}
        src={embedUrl}
        allow='clipboard-read; clipboard-write; microphone; camera; autoplay; fullscreen'
        data-testid='flowise-frame'
      />
    ) : (
      <div className='flex-1 min-h-0 flex items-center justify-center px-24px' data-testid='flowise-empty'>
        <div className='max-w-420px text-center text-13px text-t-secondary leading-22px'>
          {!conversationId
            ? 'Open an assistant conversation to see its OpenIdeas canvas.'
            : status === 'offline'
              ? 'OpenIdeas is offline.'
              : `No canvas is attached to ${assistantName || 'this assistant'} yet.`}
          {conversationId && status === 'online' ? (
            <div className='mt-16px'>
              <Button size='small' type='primary' loading={busy} onClick={() => void onCreateForAssistant()} data-testid='flowise-new-agentflow'>
                {t('conversation.workflow.newAgentflow')}
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    );

  return (
    <section className='size-full min-h-0 flex flex-col bg-1' data-testid='flowise-page'>
      <header className='h-48px shrink-0 flex items-center justify-between gap-12px px-16px border-b border-3'>
        <div className='flex items-center gap-8px min-w-0'>
          <ShareOne theme='outline' size='18' fill='currentColor' />
          <strong className='text-14px text-t-primary'>{t('conversation.workflow.canvas')}</strong>
          <Tag color={status === 'online' ? 'green' : status === 'offline' ? 'red' : 'gray'} size='small'>
            {status === 'online'
              ? t('conversation.workflow.statusOnline')
              : status === 'offline'
                ? t('conversation.workflow.statusOffline')
                : t('conversation.workflow.statusChecking')}
          </Tag>
          {attachedFlow ? (
            <span className='text-13px text-t-primary truncate' data-testid='flowise-attached-name'>
              {attachedFlow.name}
            </span>
          ) : assistantName ? (
            <span className='text-13px text-t-secondary truncate'>{assistantName}</span>
          ) : null}
        </div>
      </header>
      {island}
    </section>
  );
};

export default FlowisePage;
