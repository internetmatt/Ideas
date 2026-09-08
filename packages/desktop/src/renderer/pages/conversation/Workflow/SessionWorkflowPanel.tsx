/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 *
 * Session-scoped Flowise canvas panel — bound to the active conversation.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Button, Select, Tag } from '@arco-design/web-react';
import { Close, Refresh, ShareOne } from '@icon-park/react';
import { useTranslation } from 'react-i18next';
import { buildFlowiseEmbedUrl, listChatflows, pingFlowise, resolveFlowiseUrl, type FlowiseChatflow } from '@renderer/services/flowise';
import { attachmentFromChatflow, type SessionWorkflowAttachment } from './sessionWorkflow';

type Props = {
  conversationId: string;
  attachment: SessionWorkflowAttachment | null;
  onClose: () => void;
  onAttach?: (next: SessionWorkflowAttachment) => void;
};

const SessionWorkflowPanel: React.FC<Props> = ({ conversationId, attachment, onClose, onAttach }) => {
  const { t } = useTranslation();
  const [frameKey, setFrameKey] = useState(0);
  const [status, setStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [flows, setFlows] = useState<FlowiseChatflow[]>([]);
  const baseUrl = useMemo(() => resolveFlowiseUrl(attachment?.base_url), [attachment?.base_url]);

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

  useEffect(() => {
    const controller = new AbortController();
    void pingFlowise(baseUrl, controller.signal).then(async (online) => {
      setStatus(online ? 'online' : 'offline');
      if (!online || attachment?.flow_id) return;
      try {
        setFlows(await listChatflows(baseUrl));
      } catch {
        setFlows([]);
      }
    });
    return () => controller.abort();
  }, [baseUrl, attachment?.flow_id, frameKey]);

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
          {!attachment?.flow_id && onAttach ? (
            <Select
              size='mini'
              className='w-180px'
              placeholder={t('conversation.workflow.selectFlow')}
              onChange={(value) => {
                const flow = flows.find((item) => item.id === String(value));
                if (flow) onAttach(attachmentFromChatflow(flow, baseUrl));
              }}
              data-testid='session-workflow-flow-select'
            >
              {flows.map((flow) => (
                <Select.Option key={flow.id} value={flow.id}>
                  {flow.name}
                </Select.Option>
              ))}
            </Select>
          ) : null}
        </div>
        <div className='flex items-center gap-4px shrink-0'>
          <Button size='mini' icon={<Refresh />} onClick={() => setFrameKey((value) => value + 1)}>
            {t('conversation.workflow.reload')}
          </Button>
          <Button size='mini' type='text' icon={<Close />} onClick={onClose} aria-label={t('common.close')} />
        </div>
      </header>
      <iframe
        key={`${frameKey}:${attachment?.flow_id ?? 'root'}`}
        className='flex-1 min-h-0 w-full border-0 bg-1'
        title={t('conversation.workflow.sessionCanvas')}
        src={embedUrl}
        allow='clipboard-read; clipboard-write; microphone; camera; autoplay; fullscreen'
        data-testid='session-workflow-frame'
      />
    </section>
  );
};

export default SessionWorkflowPanel;
