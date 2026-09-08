/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 *
 * Full-page OpenIdeas canvas. The iframe stays an island; Ideas only uses the typed client.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Select, Tag } from '@arco-design/web-react';
import { ShareOne, Refresh } from '@icon-park/react';
import { useTranslation } from 'react-i18next';
import {
  buildFlowiseEmbedUrl,
  createBlankAgentflow,
  listChatflows,
  pingFlowise,
  resolveFlowiseUrl,
  type FlowiseChatflow,
} from '@renderer/services/flowise';

const FlowisePage: React.FC = () => {
  const { t } = useTranslation();
  const flowiseUrl = useMemo(() => resolveFlowiseUrl(), []);
  const [frameKey, setFrameKey] = useState(0);
  const [status, setStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [flows, setFlows] = useState<FlowiseChatflow[]>([]);
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  const selected = flows.find((flow) => flow.id === selectedId);
  const embedUrl = useMemo(
    () => buildFlowiseEmbedUrl({ baseUrl: flowiseUrl, flowId: selectedId, flowType: selected?.type }),
    [flowiseUrl, selectedId, selected?.type]
  );

  const refresh = useCallback(async () => {
    const online = await pingFlowise(flowiseUrl);
    setStatus(online ? 'online' : 'offline');
    if (!online) {
      setFlows([]);
      return;
    }
    try {
      const next = await listChatflows(flowiseUrl);
      setFlows(next);
      setSelectedId((current) => current && next.some((flow) => flow.id === current) ? current : next[0]?.id);
    } catch {
      setFlows([]);
    }
  }, [flowiseUrl]);

  useEffect(() => {
    void refresh();
  }, [refresh, frameKey]);

  const onCreate = useCallback(async () => {
    setBusy(true);
    try {
      const created = await createBlankAgentflow(flowiseUrl);
      setFlows((current) => [created, ...current.filter((flow) => flow.id !== created.id)]);
      setSelectedId(created.id);
      setFrameKey((value) => value + 1);
    } catch {
      // keep picker; create can fail while ping still works
    } finally {
      setBusy(false);
    }
  }, [flowiseUrl]);

  return (
    <section className='size-full min-h-0 flex flex-col bg-1' data-testid='flowise-page'>
      <header className='h-48px shrink-0 flex items-center justify-between gap-12px px-16px border-b border-3'>
        <div className='flex items-center gap-8px min-w-0'>
          <ShareOne theme='outline' size='18' fill='currentColor' />
          <strong className='text-14px text-t-primary'>{t('conversation.workflow.canvas')}</strong>
          <Tag color={status === 'online' ? 'green' : status === 'offline' ? 'red' : 'gray'} size='small'>
            {status === 'online'
              ? t('conversation.workflow.statusOnline')
              : status === 'offline'
                ? t('conversation.workflow.statusOffline')
                : t('conversation.workflow.statusChecking')}
          </Tag>
          <Select
            size='small'
            className='w-220px'
            placeholder={t('conversation.workflow.selectFlow')}
            value={selectedId}
            onChange={(value) => setSelectedId(String(value))}
            data-testid='flowise-flow-select'
          >
            {flows.map((flow) => (
              <Select.Option key={flow.id} value={flow.id}>
                {flow.name}
              </Select.Option>
            ))}
          </Select>
          <span className='text-12px text-t-secondary truncate'>{flowiseUrl}</span>
        </div>
        <div className='flex items-center gap-8px'>
          <Button size='small' loading={busy} onClick={() => void onCreate()} data-testid='flowise-new-agentflow'>
            {t('conversation.workflow.newAgentflow')}
          </Button>
          <Button size='small' icon={<Refresh />} onClick={() => setFrameKey((value) => value + 1)}>
            {t('conversation.workflow.reload')}
          </Button>
          <Button size='small' type='primary' onClick={() => window.open(embedUrl, '_blank', 'noopener,noreferrer')}>
            {t('conversation.workflow.openDirect')}
          </Button>
        </div>
      </header>
      <iframe
        key={`${frameKey}:${selectedId ?? 'root'}`}
        className='flex-1 min-h-0 w-full border-0 bg-1'
        title={t('conversation.workflow.canvas')}
        src={embedUrl}
        allow='clipboard-read; clipboard-write; microphone; camera; autoplay; fullscreen'
        data-testid='flowise-frame'
      />
    </section>
  );
};

export default FlowisePage;
