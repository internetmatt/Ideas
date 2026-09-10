/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 *
 * Session-scoped OpenIdeas node editor bound to this conversation's chatflow.
 * Chatflows live in Ideas history — this panel does not list the catalog.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Tag } from '@arco-design/web-react';
import { Close, ShareOne } from '@icon-park/react';
import { useTranslation } from 'react-i18next';
import {
  buildFlowiseEmbedUrl,
  createBlankChatflow,
  isUsableFlowId,
  pingFlowise,
  resolveFlowiseUrl,
} from '@renderer/services/flowise';
import { attachmentFromChatflow, type SessionWorkflowAttachment } from './sessionWorkflow';

type Props = {
  conversationId: string;
  conversationName?: string;
  attachment: SessionWorkflowAttachment | null;
  onClose?: () => void;
  onAttach?: (next: SessionWorkflowAttachment) => void;
  /** Host tab: no duplicate "Session canvas" chrome — the Files/Changes/Canvas tabs own that. */
  variant?: 'split' | 'host';
};

const SessionWorkflowPanel: React.FC<Props> = ({
  conversationId,
  conversationName,
  attachment,
  onClose,
  onAttach,
  variant = 'split',
}) => {
  const { t } = useTranslation();
  const [status, setStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [busy, setBusy] = useState(false);
  const baseUrl = useMemo(() => resolveFlowiseUrl(attachment?.base_url), [attachment?.base_url]);
  const flowId = isUsableFlowId(attachment?.flow_id) ? attachment.flow_id : undefined;
  const embedUrl = useMemo(
    () =>
      flowId
        ? buildFlowiseEmbedUrl({
            baseUrl,
            flowId,
            conversationId,
            flowType: attachment?.flow_type,
          })
        : '',
    [baseUrl, flowId, attachment?.flow_type, conversationId]
  );

  const refreshStatus = useCallback(async () => {
    const online = await pingFlowise(baseUrl);
    setStatus(online ? 'online' : 'offline');
  }, [baseUrl]);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  useEffect(() => {
    if (status !== 'offline') return;
    const timer = window.setInterval(() => {
      void refreshStatus();
    }, 5000);
    return () => window.clearInterval(timer);
  }, [status, refreshStatus]);

  const onCreate = useCallback(async () => {
    if (!onAttach) return;
    setBusy(true);
    try {
      const created = await createBlankChatflow(baseUrl, conversationName?.trim() || t('conversation.workflow.untitledChatflow'));
      onAttach(attachmentFromChatflow(created, baseUrl));
    } catch {
      /* ping can succeed while create is denied */
    } finally {
      setBusy(false);
    }
  }, [baseUrl, conversationName, onAttach, t]);

  return (
    <section className='size-full min-h-0 flex flex-col bg-1' data-testid='session-workflow-panel'>
      {variant === 'split' ? (
        <header className='h-44px shrink-0 flex items-center justify-between gap-8px px-12px border-b border-3'>
          <div className='flex items-center gap-8px min-w-0'>
            <ShareOne theme='outline' size='16' fill='currentColor' />
            <strong className='text-13px text-t-primary truncate'>{t('conversation.workflow.sessionCanvas')}</strong>
            <Tag color={status === 'online' ? 'green' : status === 'offline' ? 'red' : 'gray'} size='small'>
              {status === 'online'
                ? t('conversation.workflow.statusOnline')
                : status === 'offline'
                  ? t('conversation.workflow.statusOffline')
                  : t('conversation.workflow.statusChecking')}
            </Tag>
          </div>
          {onClose ? (
            <Button size='mini' type='text' icon={<Close />} onClick={onClose} aria-label={t('common.close')} />
          ) : null}
        </header>
      ) : null}
      {flowId && embedUrl && status === 'online' ? (
        <iframe
          key={flowId}
          className='flex-1 min-h-0 w-full border-0 bg-1'
          title={t('conversation.workflow.sessionCanvas')}
          src={embedUrl}
          allow='clipboard-read; clipboard-write; microphone; camera; autoplay; fullscreen'
          data-testid='session-workflow-frame'
        />
      ) : (
        <div
          className='flex-1 min-h-0 flex items-center justify-center px-24px text-center text-13px text-t-secondary leading-22px'
          data-testid='session-workflow-empty'
        >
          <div className='max-w-420px'>
            {status === 'offline'
              ? t('conversation.workflow.openIdeasOffline')
              : t('conversation.workflow.emptySessionHint')}
            {status === 'online' && onAttach && !flowId ? (
              <div className='mt-16px flex items-center justify-center'>
                <Button size='small' type='primary' loading={busy} onClick={() => void onCreate()}>
                  {t('conversation.workflow.newChatflow')}
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </section>
  );
};

export default SessionWorkflowPanel;
