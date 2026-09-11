/**
 * @license
 * Copyright 2026 Projecto / Ideas fork
 * SPDX-License-Identifier: Apache-2.0
 *
 * First-class OpenIdeas settings page. The Ideas settings sider / gear menu
 * pick the admin surface; this component frames that page, syncs dark/light
 * onto the same-origin island, and keeps Canvas host switching from main.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Tag } from '@arco-design/web-react';
import { Refresh, ShareOne } from '@icon-park/react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import CanvasHostPicker, { useCanvasHost } from '@/renderer/components/flowise/CanvasHostPicker';
import { useThemeContext } from '@/renderer/hooks/context/ThemeContext';
import {
  DEFAULT_FLOWISE_WORKSPACE_ID,
  canvasSettingsNavigateTo,
  isOpenIdeasSettingsPage,
  parseOpenIdeasSettingsPage,
  pingFlowise,
  syncOpenIdeasIslandTheme,
  withOpenIdeasThemeParam,
} from '@renderer/services/flowise';
import SettingsPageHeader from '@/renderer/pages/settings/components/SettingsPageHeader';
import OpenIdeasGearMenu from '../../OpenIdeasGearMenu';

type EngineStatus = 'checking' | 'online' | 'offline';

const LIFTED_OPENIDEAS_PAGES = new Set(['tools', 'apikey', 'document-stores', 'marketplaces', 'account']);

const FlowiseModalContent: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { page: pageParam } = useParams();
  const { theme } = useThemeContext();
  const appearance = theme === 'dark' ? 'dark' : 'light';
  const { hostKind, baseUrl, hostedConfigured, onHostChange } = useCanvasHost();
  const [status, setStatus] = useState<EngineStatus>('checking');
  const [frameKey, setFrameKey] = useState(0);

  const activePage = parseOpenIdeasSettingsPage(pageParam);

  const pageUrl = useMemo(() => {
    syncOpenIdeasIslandTheme(appearance);
    return withOpenIdeasThemeParam(
      `${baseUrl}/${activePage}?workspace=${encodeURIComponent(DEFAULT_FLOWISE_WORKSPACE_ID)}`,
      appearance
    );
  }, [appearance, baseUrl, activePage]);

  useEffect(() => {
    if (pageParam && LIFTED_OPENIDEAS_PAGES.has(pageParam)) {
      void navigate(canvasSettingsNavigateTo(pageParam), { replace: true });
      return;
    }
    if (pageParam && !isOpenIdeasSettingsPage(pageParam)) {
      void navigate(`/settings/openideas/${activePage}`, { replace: true });
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
      <SettingsPageHeader
        title={t(`settings.flowise.page.${activePage}`)}
        description={t('settings.flowise.description')}
        sticky={false}
        data-testid='openideas-settings-header'
        actions={
          <div className='flex items-center gap-8px'>
            <Tag color={status === 'online' ? 'green' : status === 'offline' ? 'red' : 'gray'} size='small'>
              {statusLabel}
            </Tag>
            <OpenIdeasGearMenu />
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
        }
      />

      <CanvasHostPicker hostKind={hostKind} onHostChange={handleHostChange} hostedConfigured={hostedConfigured} />

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
          key={`${activePage}:${hostKind}:${frameKey}:${appearance}`}
          className='w-full border-0 bg-1 rd-8px'
          style={{ height: 'calc(100vh - 280px)', minHeight: 420, colorScheme: appearance }}
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
