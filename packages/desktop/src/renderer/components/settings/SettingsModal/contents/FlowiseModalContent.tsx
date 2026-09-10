/**
 * @license
 * Copyright 2026 Projecto / Ideas fork
 * SPDX-License-Identifier: Apache-2.0
 *
 * Flowise admin surfaces (chatflows, credentials, variables, tools, API keys, …)
 * inside Ideas settings.
 *
 * The frame stays an island: Ideas never reaches into Flowise's DOM, it only
 * points the iframe at a page. `resolveFlowiseUrl()` picks the right host —
 * the same-origin `/canvas-island` proxy in the browser WebUI, the engine on
 * :3010 under Electron — so this component does not know or care which.
 *
 * Every page here is in the island's FLOWISE_SPA_PREFIXES allowlist
 * (packages/web-host/src/canvas-island.ts), so in-app navigation that leaks
 * off the mount is redirected back onto it rather than 404ing on Ideas.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Tabs, Tag } from '@arco-design/web-react';
import { Refresh, ShareOne } from '@icon-park/react';
import { useTranslation } from 'react-i18next';
import { pingFlowise, resolveFlowiseUrl } from '@renderer/services/flowise';

/**
 * Flowise UI routes surfaced as tabs. The id doubles as the path segment and as
 * the i18n suffix (`settings.flowise.page.<id>`), so adding a page is one line
 * here plus one label per locale.
 */
const FLOWISE_SETTINGS_PAGES = [
  'chatflows',
  'agentflows',
  'assistants',
  'executions',
  'tools',
  'credentials',
  'variables',
  'apikey',
  'document-stores',
  'marketplaces',
  'account',
] as const;

type FlowiseSettingsPage = (typeof FLOWISE_SETTINGS_PAGES)[number];

const DEFAULT_PAGE: FlowiseSettingsPage = 'chatflows';
const LAST_PAGE_STORAGE_KEY = 'ideas.flowiseSettings.page';

function isFlowiseSettingsPage(value: unknown): value is FlowiseSettingsPage {
  return typeof value === 'string' && (FLOWISE_SETTINGS_PAGES as readonly string[]).includes(value);
}

function readLastPage(): FlowiseSettingsPage {
  try {
    const stored = window.localStorage.getItem(LAST_PAGE_STORAGE_KEY);
    return isFlowiseSettingsPage(stored) ? stored : DEFAULT_PAGE;
  } catch {
    return DEFAULT_PAGE;
  }
}

function writeLastPage(page: FlowiseSettingsPage): void {
  try {
    window.localStorage.setItem(LAST_PAGE_STORAGE_KEY, page);
  } catch {
    /* private mode / quota — the in-memory selection still works this session */
  }
}

type EngineStatus = 'checking' | 'online' | 'offline';

const FlowiseModalContent: React.FC = () => {
  const { t } = useTranslation();
  const baseUrl = useMemo(() => resolveFlowiseUrl(), []);
  const [activePage, setActivePage] = useState<FlowiseSettingsPage>(readLastPage);
  const [status, setStatus] = useState<EngineStatus>('checking');
  const [frameKey, setFrameKey] = useState(0);

  const pageUrl = `${baseUrl}/${activePage}`;

  useEffect(() => {
    const ctrl = new AbortController();
    setStatus('checking');
    void pingFlowise(baseUrl, ctrl.signal).then((online) => {
      if (!ctrl.signal.aborted) setStatus(online ? 'online' : 'offline');
    });
    return () => ctrl.abort();
  }, [baseUrl, frameKey]);

  const onSelectPage = useCallback((key: string) => {
    if (!isFlowiseSettingsPage(key)) return;
    setActivePage(key);
    writeLastPage(key);
  }, []);

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
          {/*
            A real anchor, not window.open: right-click "Open Link in New Tab",
            middle-click and cmd-click come from the browser for free, and that
            is how these surfaces get pulled out into their own tab or window.
          */}
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

      <Tabs type='line' size='small' activeTab={activePage} onChange={onSelectPage} data-testid='flowise-settings-tabs'>
        {FLOWISE_SETTINGS_PAGES.map((page) => (
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
          key={`${activePage}:${frameKey}`}
          className='w-full border-0 bg-1 rd-8px'
          style={{ height: 'calc(100vh - 260px)', minHeight: 420 }}
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
