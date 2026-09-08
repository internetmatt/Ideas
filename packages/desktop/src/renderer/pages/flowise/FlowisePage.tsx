/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 *
 * Full-page Flowise canvas route (Ideas fork).
 * Flowise stays a separately deployable service; AionUi embeds it.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Button, Tag } from '@arco-design/web-react';
import { ShareOne, Refresh } from '@icon-park/react';
import { useTranslation } from 'react-i18next';
import { buildFlowiseEmbedUrl, resolveFlowiseUrl } from '@renderer/services/flowise/resolveFlowiseUrl';

const FlowisePage: React.FC = () => {
  const { t } = useTranslation();
  const flowiseUrl = useMemo(() => resolveFlowiseUrl(), []);
  const embedUrl = useMemo(() => buildFlowiseEmbedUrl({ baseUrl: flowiseUrl }), [flowiseUrl]);
  const [frameKey, setFrameKey] = useState(0);
  const [status, setStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 3000);
    fetch(`${flowiseUrl}/api/v1/ping`, { signal: controller.signal, credentials: 'omit' })
      .then((response) => setStatus(response.ok ? 'online' : 'offline'))
      .catch(() => setStatus('offline'))
      .finally(() => window.clearTimeout(timeout));
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [flowiseUrl, frameKey]);

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
          <span className='text-12px text-t-secondary truncate'>{flowiseUrl}</span>
        </div>
        <div className='flex items-center gap-8px'>
          <Button size='small' icon={<Refresh />} onClick={() => setFrameKey((value) => value + 1)}>
            {t('conversation.workflow.reload')}
          </Button>
          <Button size='small' type='primary' onClick={() => window.open(flowiseUrl, '_blank', 'noopener,noreferrer')}>
            {t('conversation.workflow.openDirect')}
          </Button>
        </div>
      </header>
      <iframe
        key={frameKey}
        className='flex-1 min-h-0 w-full border-0 bg-1'
        title={t('conversation.workflow.canvas')}
        src={embedUrl}
        allow='clipboard-read; clipboard-write; microphone; camera; autoplay; fullscreen'
        data-testid='flowise-frame'
      />
    </section>
  );
};

export default FlowisePage;
