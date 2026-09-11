/**
 * @license
 * Copyright 2026 Projecto / Ideas fork
 * SPDX-License-Identifier: Apache-2.0
 *
 * First-class Ideas settings page for the OpenIdeas org/workspace account.
 * Ideas already owns login — this only wraps the island /account surface.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Button } from '@arco-design/web-react';
import { Refresh } from '@icon-park/react';
import { useTranslation } from 'react-i18next';
import CanvasHostPicker, { useCanvasHost } from '@/renderer/components/flowise/CanvasHostPicker';
import { pingFlowise } from '@renderer/services/flowise';
import SettingsPageWrapper from '../components/SettingsPageWrapper';
import SettingsPageHeader from '../components/SettingsPageHeader';

const OpenIdeasAccountSettings: React.FC = () => {
  const { t } = useTranslation();
  const { hostKind, baseUrl, hostedConfigured, onHostChange } = useCanvasHost();
  const [online, setOnline] = useState<boolean | null>(null);
  const [frameKey, setFrameKey] = useState(0);

  const refresh = useCallback(async () => {
    const reachable = await pingFlowise(baseUrl);
    setOnline(reachable);
  }, [baseUrl]);

  useEffect(() => {
    void refresh();
  }, [refresh, frameKey]);

  return (
    <SettingsPageWrapper contentClassName='max-w-1200px'>
      <div className='flex flex-col gap-16px' data-testid='openideas-account'>
        <SettingsPageHeader
          data-testid='openideas-account-header'
          title={t('settings.openideasAccount')}
          description={t('settings.openideasAccountDescription')}
          actions={
            <Button size='small' icon={<Refresh theme='outline' size='14' />} onClick={() => setFrameKey((value) => value + 1)}>
              {t('settings.flowise.refresh')}
            </Button>
          }
        />
        <CanvasHostPicker hostKind={hostKind} onHostChange={onHostChange} hostedConfigured={hostedConfigured} />
        {online === false ? (
          <p className='m-0 text-13px text-t-secondary' data-testid='openideas-account-offline'>
            {t('settings.openideasAccountOffline')}
          </p>
        ) : (
          <iframe
            key={`${hostKind}:${frameKey}`}
            className='w-full border-0 bg-1 rd-8px'
            style={{ height: 'calc(100vh - 280px)', minHeight: 420 }}
            title={t('settings.openideasAccount')}
            src={`${baseUrl}/account`}
            allow='clipboard-read; clipboard-write; microphone; camera; autoplay; fullscreen'
            data-testid='openideas-account-frame'
          />
        )}
      </div>
    </SettingsPageWrapper>
  );
};

export default OpenIdeasAccountSettings;
