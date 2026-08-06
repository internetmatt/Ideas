/**
 * Projecto integration overlay.
 *
 * Keeps Flowise as a separately deployable service while making its visual
 * canvas a first-class AionUi route. The URL remains runtime-configurable so
 * the same AionUi fork works inside Projecto and in a work deployment.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Button, Tag } from '@arco-design/web-react';
import { Refresh, ShareOne } from '@icon-park/react';

// `Window.__PROJECTO_INTEGRATIONS__` is declared once in
// @renderer/services/whitelabel, which owns the Projecto injection contract.
import '@renderer/services/whitelabel';

const DEFAULT_FLOWISE_URL = 'http://127.0.0.1:3010';

function resolveFlowiseUrl(): string {
  const query = new URLSearchParams(window.location.search).get('flowiseUrl');
  const configured =
    query ||
    window.__PROJECTO_INTEGRATIONS__?.flowiseUrl ||
    window.localStorage.getItem('aionui.flowiseUrl') ||
    import.meta.env.VITE_FLOWISE_URL ||
    DEFAULT_FLOWISE_URL;

  try {
    const url = new URL(configured);
    return url.origin + url.pathname.replace(/\/$/, '');
  } catch {
    return DEFAULT_FLOWISE_URL;
  }
}

const FlowisePage: React.FC = () => {
  const flowiseUrl = useMemo(resolveFlowiseUrl, []);
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
    <section className='size-full min-h-0 flex flex-col bg-bg-1'>
      <header className='h-48px shrink-0 flex items-center justify-between gap-12px px-16px border-b border-[var(--color-border-2)]'>
        <div className='flex items-center gap-8px min-w-0'>
          <ShareOne theme='outline' size='18' fill='currentColor' />
          <strong className='text-14px text-t-primary'>Flowise</strong>
          <Tag color={status === 'online' ? 'green' : status === 'offline' ? 'red' : 'gray'} size='small'>
            {status}
          </Tag>
          <span className='text-12px text-t-secondary truncate'>{flowiseUrl}</span>
        </div>
        <div className='flex items-center gap-8px'>
          <Button size='small' icon={<Refresh />} onClick={() => setFrameKey((value) => value + 1)}>
            Reload
          </Button>
          <Button size='small' type='primary' onClick={() => window.open(flowiseUrl, '_blank', 'noopener,noreferrer')}>
            Open direct
          </Button>
        </div>
      </header>
      <iframe
        key={frameKey}
        className='flex-1 min-h-0 w-full border-0 bg-bg-1'
        title='Flowise visual flow canvas'
        src={flowiseUrl}
        allow='clipboard-read; clipboard-write; microphone; camera; autoplay; fullscreen'
      />
    </section>
  );
};

export default FlowisePage;
