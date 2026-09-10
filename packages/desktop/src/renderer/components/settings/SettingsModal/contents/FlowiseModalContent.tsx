/**
 * @license
 * Copyright 2026 Projecto / Ideas fork
 * SPDX-License-Identifier: Apache-2.0
 *
 * OpenIdeas Canvas settings (executions, credentials, variables).
 * API keys, document stores, marketplaces, and account are first-class
 * Ideas settings pages — not nested Canvas tabs.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Button, Tabs, Tag } from '@arco-design/web-react';
import { Refresh, ShareOne } from '@icon-park/react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import CanvasHostPicker, { useCanvasHost } from '@/renderer/components/flowise/CanvasHostPicker';
import {
  CANVAS_SETTINGS_PAGES,
  DEFAULT_CANVAS_SETTINGS_PAGE,
  DEFAULT_FLOWISE_WORKSPACE_ID,
  canvasSettingsNavigateTo,
  isCanvasSettingsPage,
  pingFlowise,
  type CanvasSettingsPage,
} from '@renderer/services/flowise';

const LAST_PAGE_STORAGE_KEY = 'ideas.flowiseSettings.page';

function readLastPage(): CanvasSettingsPage {
  try {
    const stored = window.localStorage.getItem(LAST_PAGE_STORAGE_KEY);
    return isCanvasSettingsPage(stored) ? stored : DEFAULT_CANVAS_SETTINGS_PAGE;
  } catch {
    return DEFAULT_CANVAS_SETTINGS_PAGE;
  }
}

function writeLastPage(page: CanvasSettingsPage): void {
  try {
    window.localStorage.setItem(LAST_PAGE_STORAGE_KEY, page);
  } catch {
    /* private mode */
  }
}

function canvasSettingsPath(page: CanvasSettingsPage): string {
  return `/settings/canvas/${page}?workspace=${encodeURIComponent(DEFAULT_FLOWISE_WORKSPACE_ID)}`;
}

type EngineStatus = 'checking' | 'online' | 'offline';

const FlowiseModalContent: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { page: pageParam } = useParams();
  const { hostKind, baseUrl, hostedConfigured, onHostChange } = useCanvasHost();
  const [status, setStatus] = useState<EngineStatus>('checking');
  const [frameKey, setFrameKey] = useState(0);

  const activePage = isCanvasSettingsPage(pageParam) ? pageParam : readLastPage();
  const pageUrl = `${baseUrl}/${activePage}?workspace=${encodeURIComponent(DEFAULT_FLOWISE_WORKSPACE_ID)}`;

  useEffect(() => {
    if (
      pageParam === 'tools' ||
      pageParam === 'chatflows' ||
      pageParam === 'agentflows' ||
      pageParam === 'assistants' ||
      pageParam === 'apikey' ||
      pageParam === 'document-stores' ||
      pageParam === 'marketplaces' ||
      pageParam === 'account'
    ) {
      void navigate(canvasSettingsNavigateTo(pageParam), { replace: true });
      return;
    }
    if (!isCanvasSettingsPage(pageParam)) {
      void navigate(canvasSettingsPath(activePage), { replace: true });
    }
  }, [activePage, navigate, pageParam]);

  useEffect(() => {
    const ctrl = new AbortController();
    setStatus('checking');
    void pingFlowise(baseUrl, ctrl.signal).then((online) => {
      if (!ctrl.signal.aborted) setStatus(online ? 'online' : 'offline');
    });
    return () => ctrl.abort();
  }, [baseUrl, frameKey]);

  useEffect(() => {
    if (status !== 'offline') return;
    const timer = window.setInterval(() => setFrameKey((value) => value + 1), 5000);
    return () => window.clearInterval(timer);
  }, [status]);

  const onSelectPage = useCallback(
    (key: string) => {
      if (!isCanvasSettingsPage(key)) return;
      writeLastPage(key);
      void navigate(canvasSettingsPath(key), { replace: true });
    },
    [navigate]
  );

  const handleHostChange = useCallback(
    (value: typeof hostKind) => {
      onHostChange(value);
      setFrameKey((current) => current + 1);
    },
    [onHostChange]
  );

  const onRefresh = useCallback(() => setFrameKey((value) => value + 1), []);

  const statusLabel =
    status === 'online'
      ? t('conversation.workflow.statusOnline')
      : status === 'offline'
        ? t('conversation.workflow.statusOffline')
        : t('conversation.workflow.statusChecking');

  return (
    <section className='flex flex-col min-h-0 gap-12px' data-testid='flowise-settings'>
      <header className='flex items-center justify-between gap-12px flex-wrap'>
        <div className='flex items-center gap-8px min-w-0'>
          <ShareOne theme='outline' size='18' fill='currentColor' />
          <strong className='text-16px text-t-primary'>{t('settings.flowise')}</strong>
          <Tag color={status === 'online' ? 'green' : status === 'offline' ? 'red' : 'gray'} size='small'>
            {statusLabel}
          </Tag>
        </div>
        <div className='flex items-center gap-8px shrink-0'>
          <Button size='small' icon={<Refresh theme='outline' size='14' />} onClick={onRefresh}>
            {t('settings.flowise.refresh')}
          </Button>
          <Button
            size='small'
            type='primary'
            href={pageUrl}
            target='_blank'
            rel='noopener noreferrer'
            icon={<ShareOne theme='outline' size='14' />}
            data-testid='flowise-settings-open-external'
          >
            {t('settings.flowise.openExternal')}
          </Button>
        </div>
      </header>

      <p className='text-13px text-t-secondary m-0'>{t('settings.flowise.description')}</p>

      <CanvasHostPicker hostKind={hostKind} onHostChange={handleHostChange} hostedConfigured={hostedConfigured} />

      <Tabs type='line' size='small' activeTab={activePage} onChange={onSelectPage} data-testid='flowise-settings-tabs'>
        {CANVAS_SETTINGS_PAGES.map((page) => (
          <Tabs.TabPane key={page} title={t(`settings.flowise.page.${page}`)} />
        ))}
      </Tabs>

      {status === 'offline' ? (
        <div
          className='flex flex-col items-center justify-center gap-8px rd-8px border border-3 bg-1 text-t-secondary text-13px'
          style={{ minHeight: 240 }}
          data-testid='flowise-settings-offline'
        >
          <span>
            {t('settings.flowise')} · {statusLabel}
          </span>
          <code className='text-12px'>{baseUrl}</code>
        </div>
      ) : (
        <iframe
          key={`${activePage}:${hostKind}:${frameKey}`}
          className='w-full border-0 bg-1 rd-8px'
          style={{ height: 'calc(100vh - 320px)', minHeight: 420 }}
          title={`${t('settings.flowise')} — ${t(`settings.flowise.page.${activePage}`)}`}
          src={pageUrl}
          allow='clipboard-read; clipboard-write; microphone; camera; autoplay; fullscreen'
          data-testid='flowise-settings-frame'
        />
      )}
    </section>
  );
};

export default FlowiseModalContent;
