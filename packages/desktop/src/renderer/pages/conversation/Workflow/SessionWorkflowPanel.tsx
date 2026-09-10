/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 *
 * Session-scoped Flowise canvas panel — pick or create chatflows / agentflows
 * and bind them to the active conversation.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Message, Select, Tag } from '@arco-design/web-react';
import { Close, Export, Refresh, ShareOne } from '@icon-park/react';
import { useTranslation } from 'react-i18next';
import {
  buildFlowiseEmbedUrl,
  createBlankAgentflow,
  createBlankChatflow,
  listChatflows,
  pingFlowise,
  resolveFlowiseUrl,
  type FlowiseChatflow,
  type FlowiseFlowType,
} from '@renderer/services/flowise';
import { flowOptionLabel, flowsForPicker } from '@renderer/pages/flowise/flowisePageModel';
import { attachmentFromChatflow, type SessionWorkflowAttachment } from './sessionWorkflow';

type Props = {
  conversationId: string;
  attachment: SessionWorkflowAttachment | null;
  onClose: () => void;
  onAttach?: (next: SessionWorkflowAttachment | null) => void;
};

const SessionWorkflowPanel: React.FC<Props> = ({ conversationId, attachment, onClose, onAttach }) => {
  const { t } = useTranslation();
  const [status, setStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [flows, setFlows] = useState<FlowiseChatflow[]>([]);
  const [busy, setBusy] = useState<'chatflow' | 'agentflow' | null>(null);
  const [frameEpoch, setFrameEpoch] = useState(0);
  const skipAutoSelectRef = useRef(false);
  const baseUrl = useMemo(() => resolveFlowiseUrl(attachment?.base_url), [attachment?.base_url]);
  const pickerFlows = useMemo(() => flowsForPicker(flows), [flows]);

  const resolvedFlowType = useMemo<FlowiseFlowType | undefined>(() => {
    if (attachment?.flow_type) return attachment.flow_type;
    if (!attachment?.flow_id) return undefined;
    return flows.find((flow) => flow.id === attachment.flow_id)?.type;
  }, [attachment?.flow_id, attachment?.flow_type, flows]);

  const embedUrl = useMemo(
    () =>
      buildFlowiseEmbedUrl({
        baseUrl,
        flowId: attachment?.flow_id,
        conversationId,
        flowType: resolvedFlowType,
      }),
    [baseUrl, attachment?.flow_id, resolvedFlowType, conversationId]
  );

  const refreshFlows = useCallback(async () => {
    const online = await pingFlowise(baseUrl);
    setStatus(online ? 'online' : 'offline');
    if (!online) {
      setFlows([]);
      return;
    }
    try {
      setFlows(await listChatflows(baseUrl));
    } catch {
      setFlows([]);
      Message.error(t('conversation.workflow.listFailed'));
    }
  }, [baseUrl, t]);

  useEffect(() => {
    void refreshFlows();
  }, [refreshFlows]);

  const attach = useCallback(
    (flow: FlowiseChatflow) => {
      skipAutoSelectRef.current = false;
      onAttach?.(attachmentFromChatflow(flow, baseUrl));
    },
    [baseUrl, onAttach]
  );

  // Backfill flow_type when an older attachment only stored flow_id.
  useEffect(() => {
    if (!onAttach || !attachment?.flow_id || attachment.flow_type) return;
    const matched = flows.find((flow) => flow.id === attachment.flow_id);
    if (matched?.type) {
      onAttach(attachmentFromChatflow(matched, baseUrl));
    }
  }, [attachment?.flow_id, attachment?.flow_type, baseUrl, flows, onAttach]);

  // Auto-populate the session canvas with the first pickable flow when none is attached.
  useEffect(() => {
    if (!onAttach || status !== 'online' || attachment?.flow_id || skipAutoSelectRef.current) return;
    const first = pickerFlows[0];
    if (first) attach(first);
  }, [attach, attachment?.flow_id, onAttach, pickerFlows, status]);

  const onCreate = useCallback(
    async (kind: 'chatflow' | 'agentflow') => {
      if (!onAttach) return;
      setBusy(kind);
      try {
        const created =
          kind === 'chatflow'
            ? await createBlankChatflow(baseUrl, t('conversation.workflow.untitledChatflow'))
            : await createBlankAgentflow(baseUrl, t('conversation.workflow.untitledAgentflow'));
        setFlows((current) => [created, ...current.filter((flow) => flow.id !== created.id)]);
        attach(created);
      } catch {
        Message.error(t('conversation.workflow.createFailed'));
      } finally {
        setBusy(null);
      }
    },
    [attach, baseUrl, onAttach, t]
  );

  const onClearFlow = useCallback(() => {
    if (!onAttach) return;
    skipAutoSelectRef.current = true;
    onAttach({
      provider: 'flowise',
      base_url: attachment?.base_url,
      open_by_default: attachment?.open_by_default ?? true,
    });
  }, [attachment?.base_url, attachment?.open_by_default, onAttach]);

  const onReloadFrame = useCallback(() => {
    setFrameEpoch((epoch) => epoch + 1);
  }, []);

  const onOpenDirect = useCallback(() => {
    if (!embedUrl) return;
    window.open(embedUrl, '_blank', 'noopener,noreferrer');
  }, [embedUrl]);

  return (
    <section className='size-full min-h-0 flex flex-col bg-1' data-testid='session-workflow-panel'>
      <header className='h-44px shrink-0 flex items-center justify-between gap-8px px-12px border-b border-3'>
        <div className='flex items-center gap-8px min-w-0'>
          <ShareOne theme='outline' size='16' fill='currentColor' />
          <strong className='text-13px text-t-primary truncate'>{t('conversation.workflow.sessionCanvas')}</strong>
          <Tag color={status === 'online' ? 'green' : status === 'offline' ? 'red' : 'gray'} size='small'>
            {status === 'online'
              ? t('conversation.workflow.statusOnline')
              : status === 'offline'
                ? t('conversation.workflow.statusOffline')
                : t('conversation.workflow.statusChecking')}
          </Tag>
          {onAttach ? (
            <Select
              size='mini'
              className='w-220px'
              placeholder={t('conversation.workflow.selectFlow')}
              value={attachment?.flow_id}
              showSearch
              allowClear
              onChange={(value) => {
                if (value == null || value === '') {
                  onClearFlow();
                  return;
                }
                const flow = flows.find((item) => item.id === String(value));
                if (flow) attach(flow);
              }}
              data-testid='session-workflow-flow-select'
            >
              {pickerFlows.map((flow) => (
                <Select.Option key={flow.id} value={flow.id}>
                  {flowOptionLabel(flow)}
                </Select.Option>
              ))}
            </Select>
          ) : null}
        </div>
        <div className='flex items-center gap-4px shrink-0'>
          {attachment?.flow_id ? (
            <>
              <Button
                size='mini'
                type='text'
                icon={<Refresh />}
                onClick={onReloadFrame}
                aria-label={t('conversation.workflow.reload')}
                data-testid='session-workflow-reload'
              >
                {t('conversation.workflow.reload')}
              </Button>
              <Button
                size='mini'
                type='text'
                icon={<Export />}
                onClick={onOpenDirect}
                aria-label={t('conversation.workflow.openDirect')}
                data-testid='session-workflow-open-direct'
              >
                {t('conversation.workflow.openDirect')}
              </Button>
            </>
          ) : null}
          {onAttach && status === 'online' ? (
            <>
              <Button
                size='mini'
                loading={busy === 'chatflow'}
                disabled={busy !== null}
                onClick={() => void onCreate('chatflow')}
                data-testid='session-workflow-new-chatflow'
              >
                {t('conversation.workflow.newChatflow')}
              </Button>
              <Button
                size='mini'
                type='primary'
                loading={busy === 'agentflow'}
                disabled={busy !== null}
                onClick={() => void onCreate('agentflow')}
                data-testid='session-workflow-new-agentflow'
              >
                {t('conversation.workflow.newAgentflow')}
              </Button>
            </>
          ) : null}
          <Button size='mini' type='text' icon={<Close />} onClick={onClose} aria-label={t('common.close')} />
        </div>
      </header>
      {attachment?.flow_id ? (
        <iframe
          key={`${attachment.flow_id}:${resolvedFlowType ?? 'unknown'}:${frameEpoch}`}
          className='flex-1 min-h-0 w-full border-0 bg-1'
          title={t('conversation.workflow.sessionCanvas')}
          src={embedUrl}
          allow='clipboard-read; clipboard-write; microphone; camera; autoplay; fullscreen'
          data-testid='session-workflow-frame'
        />
      ) : (
        <div
          className='flex-1 min-h-0 flex items-center justify-center px-24px text-center text-13px text-t-secondary leading-22px'
          data-testid='session-workflow-empty'
        >
          <div className='max-w-420px'>
            {status === 'offline'
              ? t('conversation.workflow.openIdeasOffline')
              : t('conversation.workflow.emptySessionHint')}
            {status === 'online' && onAttach ? (
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

export default SessionWorkflowPanel;
