/**
 * @license
 * Copyright 2026 Projecto / Ideas fork
 * SPDX-License-Identifier: Apache-2.0
 *
 * Shared Local | Projector | Ideas hosted switch used by Canvas and the
 * first-class OpenIdeas settings pages.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { Radio } from '@arco-design/web-react';
import { useTranslation } from 'react-i18next';
import {
  readCanvasHostKind,
  resolveFlowiseUrl,
  writeCanvasHostKind,
  type CanvasHostKind,
} from '@renderer/services/flowise';

export function isIdeasHostedConfigured(): boolean {
  return Boolean(
    typeof window !== 'undefined' &&
      (window.__IDEAS_INTEGRATIONS__?.ideasHostedUrl ||
        window.__PROJECTO_INTEGRATIONS__?.ideasHostedUrl ||
        window.__PROJECTO_INTEGRATIONS__?.ideas?.hostedUrl)
  );
}

export function useCanvasHost(): {
  hostKind: CanvasHostKind;
  baseUrl: string;
  hostedConfigured: boolean;
  onHostChange: (value: CanvasHostKind) => void;
} {
  const [hostKind, setHostKind] = useState<CanvasHostKind>(() => readCanvasHostKind());
  const hostedConfigured = isIdeasHostedConfigured();
  const baseUrl = useMemo(() => resolveFlowiseUrl(), [hostKind]);

  const onHostChange = useCallback((value: CanvasHostKind) => {
    writeCanvasHostKind(value);
    setHostKind(value);
  }, []);

  return { hostKind, baseUrl, hostedConfigured, onHostChange };
}

type CanvasHostPickerProps = {
  hostKind: CanvasHostKind;
  onHostChange: (value: CanvasHostKind) => void;
  hostedConfigured?: boolean;
};

const CanvasHostPicker: React.FC<CanvasHostPickerProps> = ({
  hostKind,
  onHostChange,
  hostedConfigured = isIdeasHostedConfigured(),
}) => {
  const { t } = useTranslation();

  return (
    <>
      <Radio.Group
        type='button'
        size='small'
        value={hostKind}
        onChange={(value) => onHostChange(value as CanvasHostKind)}
        data-testid='canvas-host-picker'
      >
        <Radio value='local'>{t('settings.flowise.hostLocal')}</Radio>
        <Radio value='projector'>{t('settings.flowise.hostProjector')}</Radio>
        <Radio value='ideas-hosted' disabled={!hostedConfigured}>
          {t('settings.flowise.hostIdeas')}
        </Radio>
      </Radio.Group>
      {hostKind === 'ideas-hosted' && !hostedConfigured ? (
        <p className='text-12px text-t-secondary m-0'>{t('settings.flowise.hostIdeasUnavailable')}</p>
      ) : null}
    </>
  );
};

export default CanvasHostPicker;
