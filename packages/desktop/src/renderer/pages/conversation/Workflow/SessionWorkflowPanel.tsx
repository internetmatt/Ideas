/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 *
 * Session-scoped Flowise canvas panel — bound to the active conversation.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Button, Tag } from '@arco-design/web-react';
import { Close, Refresh, ShareOne } from '@icon-park/react';
import { useTranslation } from 'react-i18next';
import { buildFlowiseEmbedUrl } from '@renderer/services/flowise/resolveFlowiseUrl';
import type { SessionWorkflowAttachment } from './sessionWorkflow';

type Props = {
  conversationId: string;
  attachment: SessionWorkflowAttachment | null;
  onClose: () => void;
};

const SessionWorkflowPanel: React.FC<Props> = ({ conversationId, attachment, onClose }) => {
  const { t } = useTranslation();
  const [frameKey, setFrameKey] = useState(0);
  const [status, setStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  const embedUrl = useMemo(
    () =>
      buildFlowiseEmbedUrl({
        baseUrl: attachment?.base_url,
        flowId: attachment?.flow_id,
        conversationId,
      }),
    [attachment?.base_url, attachment?.flow_id, conversationId]
  );

  const pingBase = useMemo(() => {
    try {
      return new URL(embedUrl).origin;
    } catch {
      return embedUrl;
    }
  }, [embedUrl]);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 3000);
    fetch(`${pingBase}/api/v1/ping`, { signal: controller.signal, credentials: 'omit' })
      .then((response) => setStatus(response.ok ? 'online' : 'offline'))
      .catch(() => setStatus('offline'))
      .finally(() => window.clearTimeout(timeout));
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [pingBase, frameKey]);

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
        </div>
        <div className='flex items-center gap-4px shrink-0'>
          <Button size='mini' icon={<Refresh />} onClick={() => setFrameKey((value) => value + 1)}>
            {t('conversation.workflow.reload')}
          </Button>
          <Button size='mini' type='text' icon={<Close />} onClick={onClose} aria-label={t('common.close')} />
        </div>
      </header>
      <iframe
        key={frameKey}
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
