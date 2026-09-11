/**
 * @license
 * Copyright 2026 Projecto / Ideas fork
 * SPDX-License-Identifier: Apache-2.0
 *
 * Ideas-owned scheduled-task agentflow used when the OpenIdeas marketplace
 * has no Start/scheduleInput templates.
 */

import { marketplaceTemplateHasScheduleInput } from './client';
import type { FlowiseMarketplaceTemplate } from './types';

export const IDEAS_SCHEDULED_TASK_TEMPLATE: FlowiseMarketplaceTemplate = {
  id: 'ideas-scheduled-task',
  templateName: 'Scheduled task',
  type: 'AgentflowV2',
  kind: 'AGENTFLOW',
  description: 'Ideas-owned agentflow that starts on a cron schedule (OpenIdeas Start / scheduleInput).',
  flowData: JSON.stringify({
    nodes: [
      {
        id: 'startAgentflow_0',
        type: 'agentFlow',
        position: { x: 80, y: 100 },
        data: {
          id: 'startAgentflow_0',
          label: 'Start',
          name: 'startAgentflow',
          type: 'Start',
          inputs: {
            startInputType: 'scheduleInput',
            scheduleCronExpression: '0 9 * * *',
            scheduleTimezone: 'UTC',
            scheduleInputMode: 'text',
            scheduleDefaultInput: '',
          },
        },
      },
    ],
    edges: [],
    viewport: { x: 0, y: 0, zoom: 1 },
  }),
  custom: false,
};

export function withIdeasScheduledTaskTemplate(templates: FlowiseMarketplaceTemplate[]): FlowiseMarketplaceTemplate[] {
  if (templates.some((template) => marketplaceTemplateHasScheduleInput(template))) {
    return templates;
  }
  return [...templates, IDEAS_SCHEDULED_TASK_TEMPLATE];
}
