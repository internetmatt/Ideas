/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 *
 * Node editor for one chatflow. The OpenIdeas catalog is gone — chatflows
 * live in Ideas conversation history.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Tag } from '@arco-design/web-react';
import { ShareOne } from '@icon-park/react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  buildFlowiseEmbedUrl,
  createBlankAgentflow,
  createBlankChatflow,
  isFlowiseFlowType,
  isUsableFlowId,
  pingFlowise,
  resolveFlowiseUrl,
  type FlowiseFlowType,
} from '@renderer/services/flowise';
import { takeCanvasFlowId } from '@renderer/pages/conversation/Workflow/chatflowConversations';

function flowIdFromLocation(search: string): string | undefined {
  const id = new URLSearchParams(search).get('flowId');
  return isUsableFlowId(id) ? id : undefined;
}

function flowTypeFromLocation(search: string): FlowiseFlowType {
  const type = new URLSearchParams(search).get('type');
  return isFlowiseFlowType(type) ? type : 'CHATFLOW';
}

function isAgentEditor(type: FlowiseFlowType): boolean {
  return type === 'AGENTFLOW' || type === 'MULTIAGENT';
}

const FlowisePage: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const flowiseUrl = useMemo(() => resolveFlowiseUrl(), []);
  const [status, setStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [flowId, setFlowId] = useState<string | undefined>(() => flowIdFromLocation(location.search) || takeCanvasFlowId());
  const [flowType, setFlowType] = useState<FlowiseFlowType>(() => flowTypeFromLocation(location.search));
  const [busy, setBusy] = useState(false);
  const agentEditor = isAgentEditor(flowType);

  const embedUrl = useMemo(
    () => (flowId ? buildFlowiseEmbedUrl({ baseUrl: flowiseUrl, flowId, flowType }) : ''),
    [flowiseUrl, flowId, flowType]
  );

  const refresh = useCallback(async () => {
    const online = await pingFlowise(flowiseUrl);
    setStatus(online ? 'online' : 'offline');
  }, [flowiseUrl]);

  useEffect(() => {
    const fromQuery = flowIdFromLocation(location.search);
    if (fromQuery) setFlowId(fromQuery);
    setFlowType(flowTypeFromLocation(location.search));
  }, [location.search]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (status !== 'offline') return;
    const timer = window.setInterval(() => {
      void refresh();
    }, 5000);
    return () => window.clearInterval(timer);
  }, [status, refresh]);

  const onCreate = useCallback(async () => {
    setBusy(true);
    try {
      const created = agentEditor
        ? await createBlankAgentflow(flowiseUrl, t('conversation.workflow.untitledAgentflow'))
        : await createBlankChatflow(flowiseUrl, t('conversation.workflow.untitledChatflow'));
      const nextType = created.type && isFlowiseFlowType(created.type) ? created.type : flowType;
      setFlowId(created.id);
      setFlowType(nextType);
      const typeQuery = isAgentEditor(nextType) ? `&type=${encodeURIComponent(nextType)}` : '';
      void navigate(`/canvas?flowId=${encodeURIComponent(created.id)}${typeQuery}`, { replace: true });
    } catch {
      /* ping can succeed while create is denied */
    } finally {
      setBusy(false);
    }
  }, [agentEditor, flowType, flowiseUrl, navigate, t]);

  return (
    <section className='size-full min-h-0 flex flex-col bg-1' data-testid='flowise-page'>
      <header className='h-48px shrink-0 flex items-center justify-between gap-12px px-16px border-b border-3'>
        <div className='flex items-center gap-8px min-w-0'>
          <ShareOne theme='outline' size='18' fill='currentColor' />
          <strong className='text-14px text-t-primary'>
            {agentEditor ? t('conversation.workflow.agentflowCanvas') : t('conversation.workflow.canvas')}
          </strong>
          <Tag color={status === 'online' ? 'green' : status === 'offline' ? 'red' : 'gray'} size='small'>
            {status === 'online'
              ? t('conversation.workflow.statusOnline')
              : status === 'offline'
                ? t('conversation.workflow.statusOffline')
                : t('conversation.workflow.statusChecking')}
          </Tag>
        </div>
      </header>
      {flowId && embedUrl && status === 'online' ? (
        <iframe
          key={flowId}
          className='flex-1 min-h-0 w-full border-0 bg-1'
          title={t('conversation.workflow.canvas')}
          src={embedUrl}
          allow='clipboard-read; clipboard-write; microphone; camera; autoplay; fullscreen'
          data-testid='flowise-frame'
        />
      ) : (
        <div className='flex-1 min-h-0 flex items-center justify-center px-24px' data-testid='flowise-empty'>
          <div className='max-w-420px text-center text-13px text-t-secondary leading-22px'>
            {status === 'offline'
              ? t('conversation.workflow.openIdeasOffline')
              : agentEditor
                ? t('conversation.workflow.emptyAgentflowHint')
                : t('conversation.workflow.emptyCanvasHint')}
            {status === 'online' ? (
              <div className='mt-16px flex items-center justify-center'>
                <Button size='small' type='primary' loading={busy} onClick={() => void onCreate()}>
                  {agentEditor ? t('conversation.workflow.newAgentflow') : t('conversation.workflow.newChatflow')}
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </section>
  );
};

export default FlowisePage;
