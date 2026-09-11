/**
 * @license
 * Copyright 2026 Projecto / Ideas fork
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import FlowiseModalContent from '@/renderer/components/settings/SettingsModal/contents/FlowiseModalContent';
import SettingsPageWrapper from './components/SettingsPageWrapper';

/** `/settings/openideas/:page` — first-class OpenIdeas admin; `/settings/canvas` redirects here. */
const FlowiseSettings: React.FC = () => {
  return (
    <SettingsPageWrapper contentClassName='flex flex-col min-h-0'>
      <FlowiseModalContent />
    </SettingsPageWrapper>
  );
};

export default FlowiseSettings;
