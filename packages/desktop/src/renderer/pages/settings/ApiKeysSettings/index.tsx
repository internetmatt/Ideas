/**
 * @license
 * Copyright 2026 Projecto / Ideas fork
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import SettingsPageWrapper from '../components/SettingsPageWrapper';
import SettingsPageHeader from '../components/SettingsPageHeader';
import OpenIdeasApiKeysSection from './OpenIdeasApiKeysSection';

const ApiKeysSettings: React.FC = () => {
  const { t } = useTranslation();

  return (
    <SettingsPageWrapper contentClassName='max-w-1200px'>
      <div className='flex flex-col gap-16px'>
        <SettingsPageHeader
          data-testid='api-keys-header'
          title={t('settings.openideasApiKeys')}
          description={t('settings.openideasApiKeysDescription')}
        />
        <OpenIdeasApiKeysSection />
      </div>
    </SettingsPageWrapper>
  );
};

export default ApiKeysSettings;
