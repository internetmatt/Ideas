/**
 * @license
 * Copyright 2026 Projecto / Ideas fork
 * SPDX-License-Identifier: Apache-2.0
 *
 * OpenIdeas chatbot layered on the Ideas thread. Picture-in-picture keeps
 * both sendboxes visible; cover stacks the canvas chat over the Ideas messages.
 */

import React, { useMemo } from 'react';
import { Button } from '@arco-design/web-react';
import { Close, FullScreen, OffScreen } from '@icon-park/react';
import { useTranslation } from 'react-i18next';
import { buildFlowiseChatbotUrl, isUsableFlowId, resolveFlowiseUrl } from '@renderer/services/flowise';
import { setSessionChatOverlay, type SessionChatOverlayMode } from './sessionChatOverlayStore';
import type { SessionWorkflowAttachment } from './sessionWorkflow';

type Props = {
  conversationId: string;
  attachment: SessionWorkflowAttachment | null;
  mode: SessionChatOverlayMode;
};

const SessionChatOverlay: React.FC<Props> = ({ conversationId, attachment, mode }) => {
  const { t } = useTranslation();
  const flowId = isUsableFlowId(attachment?.flow_id) ? attachment.flow_id : undefined;
  const embedUrl = useMemo(
    () =>
      flowId
        ? buildFlowiseChatbotUrl({
            baseUrl: resolveFlowiseUrl(attachment?.base_url),
            flowId,
            conversationId,
          })
        : '',
    [attachment?.base_url, conversationId, flowId]
  );

  if (mode === 'off') return null;

  const cover = mode === 'cover';

  return (
    <div
      className='absolute z-20 flex flex-col overflow-hidden rounded-[15px] border border-3 bg-dialog-fill-0'
      style={
        cover
          ? { inset: '8px', minHeight: 0 }
          : { right: '12px', bottom: '88px', width: 'min(360px, calc(100% - 24px))', height: 'min(480px, 58%)' }
      }
      data-testid='session-chat-overlay'
      data-overlay-mode={mode}
    >
      <header className='h-36px shrink-0 flex items-center justify-between gap-8px px-10px border-b border-3'>
        <strong className='text-12px text-t-primary truncate'>{t('conversation.workflow.overlay')}</strong>
        <div className='flex items-center gap-2px'>
          <Button
            size='mini'
            type='text'
            icon={cover ? <OffScreen /> : <FullScreen />}
            onClick={() => setSessionChatOverlay(cover ? 'pip' : 'cover')}
            aria-label={cover ? t('conversation.workflow.collapseOverlay') : t('conversation.workflow.expandOverlay')}
          />
          <Button
            size='mini'
            type='text'
            icon={<Close />}
            onClick={() => setSessionChatOverlay('off')}
            aria-label={t('common.close')}
          />
        </div>
      </header>
      {flowId && embedUrl ? (
        <iframe
          key={`${conversationId}:${flowId}`}
          className='flex-1 min-h-0 w-full border-0 bg-1'
          title={t('conversation.workflow.overlay')}
          src={embedUrl}
          allow='clipboard-read; clipboard-write; microphone; camera; autoplay; fullscreen'
          data-testid='session-chat-overlay-frame'
        />
      ) : (
        <div className='flex-1 min-h-0 flex items-center justify-center px-16px text-center text-12px text-t-secondary'>
          {t('conversation.workflow.emptySessionHint')}
        </div>
      )}
    </div>
  );
};

export default SessionChatOverlay;
