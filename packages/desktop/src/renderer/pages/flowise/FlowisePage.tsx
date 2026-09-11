/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 *
 * Full-page OpenIdeas canvas: list every chatflow / agentflow, create either,
 * honor ?flowId= from history / Assistants, and optionally attach the selection
 * to the active conversation.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Message, Select, Tag } from '@arco-design/web-react';
import { Export, Refresh, ShareOne } from '@icon-park/react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { ipcBridge } from '@/common';
import type { TChatConversation } from '@/common/config/storage';
import { useCurrentConversation } from '@renderer/pages/conversation/explorer/currentConversationStore';
import { getConversationOrNull } from '@renderer/pages/conversation/utils/conversationCache';
import { takeCanvasFlowId } from '@renderer/pages/conversation/Workflow/chatflowConversations';
import {
  attachmentFromChatflow,
  readSessionWorkflow,
  type SessionWorkflowAttachment,
} from '@renderer/pages/conversation/Workflow/sessionWorkflow';
import {
  buildFlowiseEmbedUrl,
  createBlankAgentflow,
  createBlankChatflow,
  isFlowiseFlowType,
  isUsableFlowId,
  listChatflows,
  pingFlowise,
  resolveFlowiseUrl,
  type FlowiseChatflow,
  type FlowiseFlowType,
} from '@renderer/services/flowise';
import { canvasNameForAssistant, flowOptionLabel, flowsForPicker } from './flowisePageModel';

function flowIdFromLocation(search: string): string | undefined {
  const id = new URLSearchParams(search).get('flowId');
  return isUsableFlowId(id) ? id : undefined;
}

function flowTypeFromLocation(search: string): FlowiseFlowType | undefined {
  const type = new URLSearchParams(search).get('type');
  return isFlowiseFlowType(type) ? type : undefined;
}

function isAgentEditor(type: FlowiseFlowType | undefined): boolean {
  return type === 'AGENTFLOW' || type === 'MULTIAGENT';
}

const FlowisePage: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const conversationId = useCurrentConversation();
  const flowiseUrl = useMemo(() => resolveFlowiseUrl(), []);
  const [status, setStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [conversation, setConversation] = useState<TChatConversation | null>(null);
  const [flows, setFlows] = useState<FlowiseChatflow[]>([]);
  const [selectedId, setSelectedId] = useState<string | undefined>(
    () => flowIdFromLocation(location.search) || takeCanvasFlowId()
  );
  const [queryFlowType, setQueryFlowType] = useState<FlowiseFlowType | undefined>(() =>
    flowTypeFromLocation(location.search)
  );
  const [busy, setBusy] = useState<'chatflow' | 'agentflow' | null>(null);
  const [frameEpoch, setFrameEpoch] = useState(0);

  const attachment = useMemo(() => readSessionWorkflow(conversation?.extra), [conversation]);
  const assistantName = conversation?.assistant?.name || conversation?.name || '';
  const pickerFlows = useMemo(() => flowsForPicker(flows), [flows]);
  const selected = flows.find((flow) => flow.id === selectedId);
  const resolvedFlowType = selected?.type || queryFlowType || attachment?.flow_type;
  const agentEditor = isAgentEditor(resolvedFlowType);

  const embedUrl = useMemo(
    () =>
      selectedId
        ? buildFlowiseEmbedUrl({
            baseUrl: flowiseUrl,
            flowId: selectedId,
            conversationId: conversation?.id,
            flowType: resolvedFlowType,
          })
        : '',
    [flowiseUrl, selectedId, resolvedFlowType, conversation?.id]
  );

  const persistAttachment = useCallback(
    async (next: SessionWorkflowAttachment | null) => {
      if (!conversation) return;
      await ipcBridge.conversation.update.invoke({
        id: conversation.id,
        updates: {
          extra: {
            ...(conversation.extra as Record<string, unknown>),
            session_workflow: next ?? undefined,
          } as TChatConversation['extra'],
        },
        merge_extra: true,
      });
      setConversation((current): TChatConversation | null =>
        current
          ? ({
              ...current,
              extra: {
                ...(current.extra as Record<string, unknown>),
                session_workflow: next ?? undefined,
              } as TChatConversation['extra'],
            } as TChatConversation)
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
    const fromQuery = flowIdFromLocation(location.search);
    const fromHistory = takeCanvasFlowId();

    if (!online) {
      setFlows([]);
      return;
    }

    try {
      const nextFlows = await listChatflows(flowiseUrl);
      setFlows(nextFlows);
      const pickable = flowsForPicker(nextFlows);
      setSelectedId((current) => {
        if (current && nextFlows.some((flow) => flow.id === current)) return current;
        if (fromQuery && nextFlows.some((flow) => flow.id === fromQuery)) return fromQuery;
        if (fromHistory && nextFlows.some((flow) => flow.id === fromHistory)) return fromHistory;
        if (nextAttachment?.flow_id && nextFlows.some((flow) => flow.id === nextAttachment.flow_id)) {
          return nextAttachment.flow_id;
        }
        return pickable[0]?.id;
      });
    } catch {
      setFlows([]);
      setSelectedId(undefined);
      Message.error(t('conversation.workflow.listFailed'));
    }
  }, [conversationId, flowiseUrl, location.search, t]);

  useEffect(() => {
    const fromQuery = flowIdFromLocation(location.search);
    if (fromQuery) setSelectedId(fromQuery);
    setQueryFlowType(flowTypeFromLocation(location.search));
  }, [location.search]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (status !== 'offline') return;
    const timer = window.setInterval(() => {
      void refresh();
    }, 5000);
    return () => window.clearInterval(timer);
  }, [status, refresh]);

  // Persist flow_type when the full-page canvas resolves it from the flow list.
  useEffect(() => {
    if (!conversation || !selectedId || !selected?.type) return;
    if (attachment?.flow_id === selectedId && attachment.flow_type === selected.type) return;
    void persistAttachment(attachmentFromChatflow(selected, flowiseUrl));
  }, [attachment?.flow_id, attachment?.flow_type, conversation, flowiseUrl, persistAttachment, selected, selectedId]);

  const onSelect = useCallback(
    (flowId: string | undefined) => {
      if (!flowId) {
        setSelectedId(undefined);
        if (conversation) {
          void persistAttachment({
            provider: 'flowise',
            base_url: attachment?.base_url,
            open_by_default: attachment?.open_by_default ?? true,
          });
        }
        return;
      }
      const flow = flows.find((item) => item.id === flowId);
      if (!flow) return;
      setSelectedId(flow.id);
      const typeQuery = flow.type && isAgentEditor(flow.type) ? `&type=${encodeURIComponent(flow.type)}` : '';
      void navigate(`/canvas?flowId=${encodeURIComponent(flow.id)}${typeQuery}`, { replace: true });
      if (conversation) {
        void persistAttachment(attachmentFromChatflow(flow, flowiseUrl));
      }
    },
    [attachment?.base_url, attachment?.open_by_default, conversation, flows, flowiseUrl, navigate, persistAttachment]
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
        const nextType =
          created.type && isFlowiseFlowType(created.type)
            ? created.type
            : kind === 'agentflow'
              ? 'AGENTFLOW'
              : 'CHATFLOW';
        const typeQuery = isAgentEditor(nextType) ? `&type=${encodeURIComponent(nextType)}` : '';
        void navigate(`/canvas?flowId=${encodeURIComponent(created.id)}${typeQuery}`, { replace: true });
        if (conversation) {
          await persistAttachment(attachmentFromChatflow(created, flowiseUrl));
        }
      } catch {
        Message.error(t('conversation.workflow.createFailed'));
      } finally {
        setBusy(null);
      }
    },
    [assistantName, conversation, flowiseUrl, navigate, persistAttachment, t]
  );

  const onReloadFrame = useCallback(() => {
    setFrameEpoch((epoch) => epoch + 1);
  }, []);

  const onOpenDirect = useCallback(() => {
    if (!embedUrl) return;
    window.open(embedUrl, '_blank', 'noopener,noreferrer');
  }, [embedUrl]);

  return (
    <section className='size-full min-h-0 flex flex-col bg-1' data-testid='flowise-page'>
      <header className='h-48px shrink-0 flex items-center justify-between gap-12px px-16px border-b border-3'>
        <div className='flex items-center gap-8px min-w-0'>
          <ShareOne theme='outline' size='18' fill='currentColor' />
          <strong className='text-14px text-t-primary'>
            {agentEditor ? t('conversation.workflow.agentflowCanvas') : t('conversation.workflow.canvas')}
          </strong>
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
            allowClear
            onChange={(value) => onSelect(value == null || value === '' ? undefined : String(value))}
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
          {selectedId && status === 'online' ? (
            <>
              <Button
                size='small'
                type='text'
                icon={<Refresh />}
                onClick={onReloadFrame}
                aria-label={t('conversation.workflow.reload')}
                data-testid='flowise-reload'
              >
                {t('conversation.workflow.reload')}
              </Button>
              <Button
                size='small'
                type='text'
                icon={<Export />}
                onClick={onOpenDirect}
                aria-label={t('conversation.workflow.openDirect')}
                data-testid='flowise-open-direct'
              >
                {t('conversation.workflow.openDirect')}
              </Button>
            </>
          ) : null}
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
      {selectedId && embedUrl && status === 'online' ? (
        <iframe
          key={`${selectedId}:${resolvedFlowType ?? 'unknown'}:${frameEpoch}`}
          className='flex-1 min-h-0 w-full border-0 bg-1'
          title={selected?.name || t('conversation.workflow.canvas')}
          src={embedUrl}
          allow='clipboard-read; clipboard-write; microphone; camera; autoplay; fullscreen'
          data-testid='flowise-frame'
        />
      ) : (
        <div className='flex-1 min-h-0 flex items-center justify-center px-24px' data-testid='flowise-empty'>
          <div className='max-w-420px text-center text-13px text-t-secondary leading-22px'>
            {status === 'offline'
              ? t('conversation.workflow.openIdeasOffline')
              : agentEditor
                ? t('conversation.workflow.emptyAgentflowHint')
                : t('conversation.workflow.emptyCanvasHint')}
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
