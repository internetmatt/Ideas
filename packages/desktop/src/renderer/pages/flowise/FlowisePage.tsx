/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 *
 * Full-page OpenIdeas canvas: list every chatflow / agentflow, create either,
 * and optionally attach the selection to the active conversation.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Select, Tag } from '@arco-design/web-react';
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
  createBlankChatflow,
  listChatflows,
  pingFlowise,
  resolveFlowiseUrl,
  type FlowiseChatflow,
} from '@renderer/services/flowise';
import { canvasNameForAssistant, flowOptionLabel, flowsForPicker } from './flowisePageModel';

const FlowisePage: React.FC = () => {
  const { t } = useTranslation();
  const conversationId = useCurrentConversation();
  const flowiseUrl = useMemo(() => resolveFlowiseUrl(), []);
  const [status, setStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [conversation, setConversation] = useState<TChatConversation | null>(null);
  const [flows, setFlows] = useState<FlowiseChatflow[]>([]);
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [busy, setBusy] = useState<'chatflow' | 'agentflow' | null>(null);

  const attachment = useMemo(() => readSessionWorkflow(conversation?.extra), [conversation]);
  const assistantName = conversation?.assistant?.name || conversation?.name || '';
  const pickerFlows = useMemo(() => flowsForPicker(flows), [flows]);
  const selected = flows.find((flow) => flow.id === selectedId);

  const embedUrl = useMemo(
    () =>
      buildFlowiseEmbedUrl({
        baseUrl: flowiseUrl,
        flowId: selectedId,
        conversationId: conversation?.id,
        flowType: selected?.type || attachment?.flow_type,
      }),
    [flowiseUrl, selectedId, selected?.type, attachment?.flow_type, conversation?.id]
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
              extra: {
                ...(current.extra as Record<string, unknown>),
                session_workflow: next,
              } as TChatConversation['extra'],
            }
          : current
      );
    },
    [conversation]
  );

  const refresh = useCallback(async () => {
    const online = await pingFlowise(flowiseUrl);
    setStatus(online ? 'online' : 'offline');

    const nextConversation = conversationId ? await getConversationOrNull(conversationId) : null;
    setConversation(nextConversation);
    const nextAttachment = readSessionWorkflow(nextConversation?.extra);

    if (!online) {
      setFlows([]);
      setSelectedId(undefined);
      return;
    }

    try {
      const nextFlows = await listChatflows(flowiseUrl);
      setFlows(nextFlows);
      const pickable = flowsForPicker(nextFlows);
      setSelectedId((current) => {
        if (current && nextFlows.some((flow) => flow.id === current)) return current;
        if (nextAttachment?.flow_id && nextFlows.some((flow) => flow.id === nextAttachment.flow_id)) {
          return nextAttachment.flow_id;
        }
        return pickable[0]?.id;
      });
    } catch {
      setFlows([]);
      setSelectedId(undefined);
    }
  }, [conversationId, flowiseUrl]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const onSelect = useCallback(
    (flowId: string) => {
      const flow = flows.find((item) => item.id === flowId);
      if (!flow) return;
      setSelectedId(flow.id);
      if (conversation) {
        void persistAttachment(attachmentFromChatflow(flow, flowiseUrl));
      }
    },
    [conversation, flows, flowiseUrl, persistAttachment]
  );

  const onCreate = useCallback(
    async (kind: 'chatflow' | 'agentflow') => {
      setBusy(kind);
      try {
        const created =
          kind === 'chatflow'
            ? await createBlankChatflow(flowiseUrl, canvasNameForAssistant(assistantName, 'CHATFLOW'))
            : await createBlankAgentflow(flowiseUrl, canvasNameForAssistant(assistantName, 'AGENTFLOW'));
        setFlows((current) => [created, ...current.filter((flow) => flow.id !== created.id)]);
        setSelectedId(created.id);
        if (conversation) {
          await persistAttachment(attachmentFromChatflow(created, flowiseUrl));
        }
      } catch {
        // ping can succeed while create is denied
      } finally {
        setBusy(null);
      }
    },
    [assistantName, conversation, flowiseUrl, persistAttachment]
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
          <Select
            size='small'
            className='w-260px'
            placeholder={t('conversation.workflow.selectFlow')}
            value={selectedId}
            showSearch
            onChange={(value) => onSelect(String(value))}
            data-testid='flowise-flow-select'
          >
            {pickerFlows.map((flow) => (
              <Select.Option key={flow.id} value={flow.id}>
                {flowOptionLabel(flow)}
              </Select.Option>
            ))}
          </Select>
        </div>
        <div className='flex items-center gap-8px shrink-0'>
          <Button
            size='small'
            loading={busy === 'chatflow'}
            disabled={status !== 'online' || busy !== null}
            onClick={() => void onCreate('chatflow')}
            data-testid='flowise-new-chatflow'
          >
            {t('conversation.workflow.newChatflow')}
          </Button>
          <Button
            size='small'
            type='primary'
            loading={busy === 'agentflow'}
            disabled={status !== 'online' || busy !== null}
            onClick={() => void onCreate('agentflow')}
            data-testid='flowise-new-agentflow'
          >
            {t('conversation.workflow.newAgentflow')}
          </Button>
        </div>
      </header>
      {selectedId && status === 'online' ? (
        <iframe
          key={selectedId}
          className='flex-1 min-h-0 w-full border-0 bg-1'
          title={selected?.name || t('conversation.workflow.canvas')}
          src={embedUrl}
          allow='clipboard-read; clipboard-write; microphone; camera; autoplay; fullscreen'
          data-testid='flowise-frame'
        />
      ) : (
        <div className='flex-1 min-h-0 flex items-center justify-center px-24px' data-testid='flowise-empty'>
          <div className='max-w-420px text-center text-13px text-t-secondary leading-22px'>
            {status === 'offline' ? t('conversation.workflow.openIdeasOffline') : t('conversation.workflow.emptyCanvasHint')}
            {status === 'online' ? (
              <div className='mt-16px flex items-center justify-center gap-8px'>
                <Button size='small' loading={busy === 'chatflow'} onClick={() => void onCreate('chatflow')}>
                  {t('conversation.workflow.newChatflow')}
                </Button>
                <Button
                  size='small'
                  type='primary'
                  loading={busy === 'agentflow'}
                  onClick={() => void onCreate('agentflow')}
                >
                  {t('conversation.workflow.newAgentflow')}
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </section>
  );
};

export default FlowisePage;
