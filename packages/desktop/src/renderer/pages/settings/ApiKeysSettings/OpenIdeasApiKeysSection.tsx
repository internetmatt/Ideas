/**
 * @license
 * Copyright 2026 Projecto / Ideas fork
 * SPDX-License-Identifier: Apache-2.0
 *
 * First-class Ideas list for OpenIdeas API keys. Talks to the typed HTTP
 * client — never iframes the Canvas settings tab strip.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Button, Input, Modal } from '@arco-design/web-react';
import { Plus, Refresh } from '@icon-park/react';
import { useTranslation } from 'react-i18next';
import CanvasHostPicker, { useCanvasHost } from '@/renderer/components/flowise/CanvasHostPicker';
import { createApiKey, deleteApiKey, listApiKeys, pingFlowise, type FlowiseApiKey } from '@renderer/services/flowise';

const OpenIdeasApiKeysSection: React.FC = () => {
  const { t } = useTranslation();
  const { hostKind, baseUrl, hostedConfigured, onHostChange } = useCanvasHost();
  const [online, setOnline] = useState<boolean | null>(null);
  const [keys, setKeys] = useState<FlowiseApiKey[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftName, setDraftName] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    const reachable = await pingFlowise(baseUrl);
    setOnline(reachable);
    if (!reachable) {
      setKeys([]);
      setLoading(false);
      return;
    }
    try {
      setKeys(await listApiKeys(baseUrl));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('settings.openideasApiKeysLoadError'));
    } finally {
      setLoading(false);
    }
  }, [baseUrl, t]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const saveKey = useCallback(async () => {
    if (!draftName?.trim()) return;
    setBusyId('new-key');
    try {
      await createApiKey(baseUrl, { keyName: draftName.trim() });
      setDraftName(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('settings.openideasApiKeysLoadError'));
    } finally {
      setBusyId(null);
    }
  }, [baseUrl, draftName, refresh, t]);

  const revokeKey = useCallback(
    (key: FlowiseApiKey) => {
      Modal.confirm({
        title: t('settings.openideasApiKeysRevoke'),
        content: key.keyName,
        okButtonProps: { status: 'danger' },
        onOk: async () => {
          setBusyId(key.id);
          try {
            await deleteApiKey(baseUrl, key.id);
            await refresh();
          } finally {
            setBusyId(null);
          }
        },
      });
    },
    [baseUrl, refresh, t]
  );

  return (
    <div className='space-y-16px' data-testid='openideas-api-keys'>
      <CanvasHostPicker hostKind={hostKind} onHostChange={onHostChange} hostedConfigured={hostedConfigured} />
      <section className='px-[12px] md:px-[32px] py-[24px] bg-2 rd-12px md:rd-16px border border-border-2'>
        <div className='flex items-center justify-between gap-12px mb-12px'>
          <div className='min-w-0'>
            <div className='text-14px text-t-primary'>{t('settings.openideasApiKeys')}</div>
            <p className='m-0 mt-4px text-12px text-t-secondary'>{t('settings.openideasApiKeysDescription')}</p>
          </div>
          <div className='flex items-center gap-8px shrink-0'>
            <Button size='small' icon={<Refresh theme='outline' size='14' />} loading={loading} onClick={() => void refresh()}>
              {t('settings.flowise.refresh')}
            </Button>
            <Button
              size='small'
              type='primary'
              icon={<Plus theme='outline' size='14' />}
              disabled={online === false}
              onClick={() => setDraftName('')}
            >
              {t('settings.openideasApiKeysAdd')}
            </Button>
          </div>
        </div>
        {online === false ? (
          <p className='m-0 text-13px text-t-secondary' data-testid='openideas-api-keys-offline'>
            {t('settings.openideasApiKeysOffline')}
          </p>
        ) : null}
        {error ? (
          <p className='m-0 text-13px text-danger' data-testid='openideas-api-keys-error'>
            {error}
          </p>
        ) : null}
        {online !== false && keys.length === 0 && !loading ? (
          <p className='m-0 py-16px text-center text-13px text-t-secondary border border-dashed border-border-2 rd-12px'>
            {t('settings.openideasApiKeysEmpty')}
          </p>
        ) : null}
        <div className='space-y-8px'>
          {keys.map((key) => (
            <div
              key={key.id}
              className='flex items-start justify-between gap-12px rounded-lg border border-2 bg-bg-2 px-16px py-12px'
              data-testid='openideas-api-key-row'
            >
              <div className='min-w-0'>
                <div className='text-14px font-600 text-t-primary'>{key.keyName}</div>
                {key.apiKey ? (
                  <code className='mt-4px block text-12px text-t-secondary truncate'>{key.apiKey}</code>
                ) : null}
              </div>
              <Button size='mini' status='danger' loading={busyId === key.id} onClick={() => revokeKey(key)}>
                {t('settings.openideasApiKeysRevoke')}
              </Button>
            </div>
          ))}
        </div>
      </section>

      <Modal
        visible={draftName !== null}
        title={t('settings.openideasApiKeysAdd')}
        onCancel={() => setDraftName(null)}
        onOk={() => void saveKey()}
        confirmLoading={busyId === 'new-key'}
        unmountOnExit
      >
        {draftName !== null ? (
          <label className='text-12px text-t-secondary'>
            {t('settings.openideasApiKeysName')}
            <Input className='mt-4px' value={draftName} onChange={setDraftName} />
          </label>
        ) : null}
      </Modal>
    </div>
  );
};

export default OpenIdeasApiKeysSection;
