/**
 * @license
 * Copyright 2026 Projecto / Ideas fork
 * SPDX-License-Identifier: Apache-2.0
 *
 * Extra Create Assistant menu actions: agent-flow template + blank canvas.
 */

import { useCallback, useMemo, useState } from 'react';
import { Message } from '@arco-design/web-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { createBlankAgentflow, resolveFlowiseUrl } from '@renderer/services/flowise';
import type { TalkToButlerExtraAction } from '@/renderer/components/base/TalkToButlerButton';
import { canvasNameForAssistant } from '@/renderer/pages/flowise/flowisePageModel';

export function useCreateAssistantExtras(): { extraActions: TalkToButlerExtraAction[]; creatingCanvas: boolean } {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [creatingCanvas, setCreatingCanvas] = useState(false);

  const openTemplateCatalog = useCallback(() => {
    void navigate('/settings/marketplaces?kind=AGENTFLOW');
  }, [navigate]);

  const createAgentFlowOnCanvas = useCallback(async () => {
    setCreatingCanvas(true);
    try {
      const created = await createBlankAgentflow(
        resolveFlowiseUrl(),
        canvasNameForAssistant(t('settings.createAssistant', { defaultValue: 'Create Assistant' }))
      );
      void navigate(`/canvas?flowId=${encodeURIComponent(created.id)}&type=AGENTFLOW`);
    } catch (err) {
      Message.error(err instanceof Error ? err.message : t('settings.openideasAgentflowsLoadError'));
    } finally {
      setCreatingCanvas(false);
    }
  }, [navigate, t]);

  const extraActions = useMemo<TalkToButlerExtraAction[]>(
    () => [
      {
        key: 'agentflow-template',
        label: t('settings.talkToButler.fromAgentFlowTemplate'),
        onClick: openTemplateCatalog,
      },
      {
        key: 'agentflow-canvas',
        label: t('settings.talkToButler.createAgentFlowOnCanvas'),
        onClick: () => {
          void createAgentFlowOnCanvas();
        },
      },
    ],
    [createAgentFlowOnCanvas, openTemplateCatalog, t]
  );

  return { extraActions, creatingCanvas };
}
