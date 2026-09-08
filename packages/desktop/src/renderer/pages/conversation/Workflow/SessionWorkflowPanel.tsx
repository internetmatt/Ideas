/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 *
 * Session-scoped Flowise canvas panel — pick or create chatflows / agentflows
 * and bind them to the active conversation.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Select, Tag } from '@arco-design/web-react';
import { Close, ShareOne } from '@icon-park/react';
import { useTranslation } from 'react-i18next';
import {
  buildFlowiseEmbedUrl,
  createBlankAgentflow,
  createBlankChatflow,
  listChatflows,
  pingFlowise,
  resolveFlowiseUrl,
  type FlowiseChatflow,
} from '@renderer/services/flowise';
import { flowOptionLabel, flowsForPicker } from '@renderer/pages/flowise/flowisePageModel';
import { attachmentFromChatflow, type SessionWorkflowAttachment } from './sessionWorkflow';

type Props = {
  conversationId: string;
  attachment: SessionWorkflowAttachment | null;
  onClose: () => void;
  onAttach?: (next: SessionWorkflowAttachment) => void;
};

const SessionWorkflowPanel: React.FC<Props> = ({ conversationId, attachment, onClose, onAttach }) => {
  const { t } = useTranslation();
  const [status, setStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [flows, setFlows] = useState<FlowiseChatflow[]>([]);
  const [busy, setBusy] = useState<'chatflow' | 'agentflow' | null>(null);
  const baseUrl = useMemo(() => resolveFlowiseUrl(attachment?.base_url), [attachment?.base_url]);
  const pickerFlows = useMemo(() => flowsForPicker(flows), [flows]);

  const embedUrl = useMemo(
    () =>
      buildFlowiseEmbedUrl({
        baseUrl,
        flowId: attachment?.flow_id,
        conversationId,
        flowType: attachment?.flow_type,
      }),
    [baseUrl, attachment?.flow_id, attachment?.flow_type, conversationId]
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
    }
  }, [baseUrl]);

  useEffect(() => {
    void refreshFlows();
  }, [refreshFlows]);

  const attach = useCallback(
    (flow: FlowiseChatflow) => {
      onAttach?.(attachmentFromChatflow(flow, baseUrl));
    },
    [baseUrl, onAttach]
  );

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
        // ping can succeed while create is denied
      } finally {
        setBusy(null);
      }
    },
    [attach, baseUrl, onAttach, t]
  );

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
              allowClear={false}
              onChange={(value) => {
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
          key={attachment.flow_id}
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
