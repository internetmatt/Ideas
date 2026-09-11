/**
 * @license
 * Copyright 2026 Projecto / Ideas fork
 * SPDX-License-Identifier: Apache-2.0
 *
 * Agentflow node editors live on Assistants — not in chat history.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Tag } from '@arco-design/web-react';
import { Plus, Refresh, ShareOne } from '@icon-park/react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  createBlankAgentflow,
  isUsableFlowId,
  listChatflows,
  pingFlowise,
  resolveFlowiseUrl,
  type FlowiseChatflow,
} from '@renderer/services/flowise';
import { isAgentflowKind } from '@/renderer/pages/conversation/Workflow/chatflowConversations';

const OpenIdeasAgentflowsSection: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const baseUrl = useMemo(() => resolveFlowiseUrl(), []);
  const [online, setOnline] = useState<boolean | null>(null);
  const [flows, setFlows] = useState<FlowiseChatflow[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    const reachable = await pingFlowise(baseUrl);
    setOnline(reachable);
    if (!reachable) {
      setFlows([]);
      setLoading(false);
      return;
    }
    try {
      const listed = await listChatflows(baseUrl);
      setFlows(listed.filter(isAgentflowKind));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('settings.openideasAgentflowsLoadError'));
    } finally {
      setLoading(false);
    }
  }, [baseUrl, t]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const openFlow = useCallback(
    (flow: FlowiseChatflow) => {
      if (!isUsableFlowId(flow.id)) return;
      const type = flow.type === 'MULTIAGENT' ? 'MULTIAGENT' : 'AGENTFLOW';
      void navigate(`/canvas?flowId=${encodeURIComponent(flow.id)}&type=${type}`);
    },
    [navigate]
  );

  const onCreate = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const created = await createBlankAgentflow(baseUrl, t('conversation.workflow.untitledAgentflow'));
      openFlow(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('settings.openideasAgentflowsLoadError'));
    } finally {
      setBusy(false);
    }
  }, [baseUrl, openFlow, t]);

  return (
    <div className='space-y-8px' data-testid='openideas-agentflows'>
      <div className='flex items-center justify-between gap-12px mb-12px'>
        <div className='min-w-0'>
          <div className='text-14px text-t-primary'>{t('settings.openideasAgentflows')}</div>
          <p className='m-0 mt-4px text-12px text-t-secondary'>{t('settings.openideasAgentflowsDescription')}</p>
        </div>
        <div className='flex items-center gap-8px shrink-0'>
          <Button size='small' icon={<Refresh theme='outline' size='14' />} loading={loading} onClick={() => void refresh()}>
            {t('common.refresh')}
          </Button>
          <Button
            size='small'
            type='primary'
            icon={<Plus theme='outline' size='14' />}
            disabled={online === false}
            loading={busy}
            onClick={() => void onCreate()}
          >
            {t('conversation.workflow.newAgentflow')}
          </Button>
        </div>
      </div>
      {online === false ? (
        <p className='m-0 text-13px text-t-secondary' data-testid='openideas-agentflows-offline'>
          {t('settings.openideasAgentflowsOffline')}
        </p>
      ) : null}
      {error ? (
        <p className='m-0 text-13px text-danger' data-testid='openideas-agentflows-error'>
          {error}
        </p>
      ) : null}
      {online !== false && flows.length === 0 && !loading ? (
        <p className='m-0 py-16px text-center text-13px text-t-secondary border border-dashed border-border-2 rd-12px'>
          {t('settings.openideasAgentflowsEmpty')}
        </p>
      ) : null}
      <div className='space-y-8px'>
        {flows.map((flow) => (
          <button
            key={flow.id}
            type='button'
            className='w-full flex items-center justify-between gap-12px rounded-lg border border-2 bg-bg-2 px-16px py-12px text-left'
            data-testid='openideas-agentflow-row'
            onClick={() => openFlow(flow)}
          >
            <div className='min-w-0 flex items-center gap-8px'>
              <ShareOne theme='outline' size='16' fill='currentColor' />
              <span className='text-14px font-600 text-t-primary truncate'>{flow.name}</span>
              {flow.type === 'MULTIAGENT' ? (
                <Tag size='small' color='arcoblue'>
                  MULTIAGENT
                </Tag>
              ) : null}
            </div>
            <span className='text-12px text-t-secondary shrink-0'>{t('settings.openideasAgentflowsOpen')}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default OpenIdeasAgentflowsSection;
