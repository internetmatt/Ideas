/**
 * @license
 * Copyright 2026 Projecto / Ideas fork
 * SPDX-License-Identifier: Apache-2.0
 *
 * Native list/create/delete for OpenIdeas document stores. Opening a store
 * uses a same-origin island iframe for loaders/chunking/vector upsert.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Button, Input, Modal } from '@arco-design/web-react';
import { Left, Plus, Refresh } from '@icon-park/react';
import { useTranslation } from 'react-i18next';
import CanvasHostPicker, { useCanvasHost } from '@/renderer/components/flowise/CanvasHostPicker';
import {
  createDocumentStore,
  deleteDocumentStore,
  listDocumentStores,
  pingFlowise,
  type FlowiseDocumentStore,
} from '@renderer/services/flowise';

const OpenIdeasDocumentStoresSection: React.FC = () => {
  const { t } = useTranslation();
  const { hostKind, baseUrl, hostedConfigured, onHostChange } = useCanvasHost();
  const [online, setOnline] = useState<boolean | null>(null);
  const [stores, setStores] = useState<FlowiseDocumentStore[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ name: string; description: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [openStore, setOpenStore] = useState<FlowiseDocumentStore | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    const reachable = await pingFlowise(baseUrl);
    setOnline(reachable);
    if (!reachable) {
      setStores([]);
      setLoading(false);
      return;
    }
    try {
      setStores(await listDocumentStores(baseUrl));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('settings.openideasDocumentStoresLoadError'));
    } finally {
      setLoading(false);
    }
  }, [baseUrl, t]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const saveStore = useCallback(async () => {
    if (!draft?.name.trim()) return;
    setBusyId('new-store');
    try {
      await createDocumentStore(baseUrl, { name: draft.name.trim(), description: draft.description });
      setDraft(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('settings.openideasDocumentStoresLoadError'));
    } finally {
      setBusyId(null);
    }
  }, [baseUrl, draft, refresh, t]);

  const removeStore = useCallback(
    (store: FlowiseDocumentStore) => {
      Modal.confirm({
        title: t('common.delete'),
        content: store.name,
        okButtonProps: { status: 'danger' },
        onOk: async () => {
          setBusyId(store.id);
          try {
            await deleteDocumentStore(baseUrl, store.id);
            if (openStore?.id === store.id) setOpenStore(null);
            await refresh();
          } finally {
            setBusyId(null);
          }
        },
      });
    },
    [baseUrl, openStore?.id, refresh, t]
  );

  const editorUrl = openStore ? `${baseUrl}/document-stores/${encodeURIComponent(openStore.id)}` : '';

  return (
    <div className='space-y-16px' data-testid='openideas-document-stores'>
      <CanvasHostPicker hostKind={hostKind} onHostChange={onHostChange} hostedConfigured={hostedConfigured} />
      {openStore ? (
        <section className='flex flex-col min-h-0 gap-12px'>
          <div className='flex items-center justify-between gap-12px'>
            <Button size='small' icon={<Left theme='outline' size='14' />} onClick={() => setOpenStore(null)}>
              {t('settings.openideasDocumentStoresBack')}
            </Button>
            <div className='min-w-0 text-14px font-600 text-t-primary truncate'>{openStore.name}</div>
          </div>
          {online === false ? (
            <p className='m-0 text-13px text-t-secondary' data-testid='openideas-document-stores-offline'>
              {t('settings.openideasDocumentStoresOffline')}
            </p>
          ) : (
            <iframe
              className='w-full border-0 bg-1 rd-8px'
              style={{ height: 'calc(100vh - 280px)', minHeight: 420 }}
              title={openStore.name}
              src={editorUrl}
              allow='clipboard-read; clipboard-write; microphone; camera; autoplay; fullscreen'
              data-testid='openideas-document-store-frame'
            />
          )}
        </section>
      ) : (
        <section className='px-[12px] md:px-[32px] py-[24px] bg-2 rd-12px md:rd-16px border border-border-2'>
          <div className='flex items-center justify-between gap-12px mb-12px'>
            <div className='min-w-0'>
              <div className='text-14px text-t-primary'>{t('settings.openideasDocumentStores')}</div>
              <p className='m-0 mt-4px text-12px text-t-secondary'>{t('settings.openideasDocumentStoresDescription')}</p>
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
                onClick={() => setDraft({ name: '', description: '' })}
              >
                {t('settings.openideasDocumentStoresAdd')}
              </Button>
            </div>
          </div>
          {online === false ? (
            <p className='m-0 text-13px text-t-secondary' data-testid='openideas-document-stores-offline'>
              {t('settings.openideasDocumentStoresOffline')}
            </p>
          ) : null}
          {error ? (
            <p className='m-0 text-13px text-danger' data-testid='openideas-document-stores-error'>
              {error}
            </p>
          ) : null}
          {online !== false && stores.length === 0 && !loading ? (
            <p className='m-0 py-16px text-center text-13px text-t-secondary border border-dashed border-border-2 rd-12px'>
              {t('settings.openideasDocumentStoresEmpty')}
            </p>
          ) : null}
          <div className='space-y-8px'>
            {stores.map((store) => (
              <div
                key={store.id}
                className='flex items-start justify-between gap-12px rounded-lg border border-2 bg-bg-2 px-16px py-12px'
                data-testid='openideas-document-store-row'
              >
                <div className='min-w-0'>
                  <div className='text-14px font-600 text-t-primary'>{store.name}</div>
                  {store.description ? <div className='mt-4px text-12px text-t-secondary line-clamp-2'>{store.description}</div> : null}
                </div>
                <div className='flex items-center gap-8px shrink-0'>
                  <Button size='mini' onClick={() => setOpenStore(store)}>
                    {t('settings.openideasDocumentStoresOpen')}
                  </Button>
                  <Button size='mini' status='danger' loading={busyId === store.id} onClick={() => removeStore(store)}>
                    {t('common.delete')}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <Modal
        visible={draft !== null}
        title={t('settings.openideasDocumentStoresAdd')}
        onCancel={() => setDraft(null)}
        onOk={() => void saveStore()}
        confirmLoading={busyId === 'new-store'}
        unmountOnExit
      >
        {draft ? (
          <div className='flex flex-col gap-12px'>
            <label className='text-12px text-t-secondary'>
              {t('settings.openideasDocumentStoresName')}
              <Input className='mt-4px' value={draft.name} onChange={(value) => setDraft({ ...draft, name: value })} />
            </label>
            <label className='text-12px text-t-secondary'>
              {t('settings.openideasDocumentStoresDescriptionField')}
              <Input.TextArea
                className='mt-4px'
                autoSize={{ minRows: 2, maxRows: 4 }}
                value={draft.description}
                onChange={(value) => setDraft({ ...draft, description: value })}
              />
            </label>
          </div>
        ) : null}
      </Modal>
    </div>
  );
};

export default OpenIdeasDocumentStoresSection;
