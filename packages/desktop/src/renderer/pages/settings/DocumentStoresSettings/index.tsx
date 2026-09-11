/**
 * @license
 * Copyright 2026 Projecto / Ideas fork
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import SettingsPageWrapper from '../components/SettingsPageWrapper';
import SettingsPageHeader from '../components/SettingsPageHeader';
import OpenIdeasDocumentStoresSection from './OpenIdeasDocumentStoresSection';

const DocumentStoresSettings: React.FC = () => {
  const { t } = useTranslation();

  return (
    <SettingsPageWrapper contentClassName='max-w-1200px'>
      <div className='flex flex-col gap-16px'>
        <SettingsPageHeader
          data-testid='document-stores-header'
          title={t('settings.openideasDocumentStores')}
          description={t('settings.openideasDocumentStoresDescription')}
        />
        <OpenIdeasDocumentStoresSection />
      </div>
    </SettingsPageWrapper>
  );
};

export default DocumentStoresSettings;
