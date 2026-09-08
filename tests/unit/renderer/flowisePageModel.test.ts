import { describe, expect, it } from 'vitest';
import { EMPTY_FLOW_DATA, type FlowiseChatflow } from '@renderer/services/flowise';
import {
  canvasNameForAssistant,
  flowOptionLabel,
  flowsForAssistant,
  flowsForPicker,
  isUntitledDraft,
} from '@renderer/pages/flowise/flowisePageModel';

const flow = (partial: Partial<FlowiseChatflow> & Pick<FlowiseChatflow, 'id' | 'name'>): FlowiseChatflow => ({
  workspaceId: 'General',
  ...partial,
});

describe('flowisePageModel', () => {
  it('treats empty Untitled Agent / Chatflow rows as drafts', () => {
    expect(isUntitledDraft(flow({ id: '1', name: 'Untitled Agent', flowData: EMPTY_FLOW_DATA }))).toBe(true);
    expect(isUntitledDraft(flow({ id: '2', name: 'Untitled Chatflow', flowData: EMPTY_FLOW_DATA }))).toBe(true);
    expect(isUntitledDraft(flow({ id: '3', name: 'Ideas Typed Client', flowData: EMPTY_FLOW_DATA }))).toBe(false);
  });

  it('lists every non-draft chatflow and agentflow for the picker', () => {
    const rows = [
      flow({ id: 'a', name: 'Untitled Agent', flowData: EMPTY_FLOW_DATA, type: 'AGENTFLOW' }),
      flow({ id: 'b', name: 'Hermes canvas', type: 'AGENTFLOW' }),
      flow({ id: 'c', name: 'Support bot', type: 'CHATFLOW' }),
    ];
    expect(flowsForPicker(rows).map((row) => row.id)).toEqual(['b', 'c']);
    expect(flowsForAssistant(rows, { flow_id: 'b' }).map((row) => row.id)).toEqual(['b', 'c']);
  });

  it('labels flows with their type', () => {
    expect(flowOptionLabel(flow({ id: '1', name: 'Support', type: 'CHATFLOW' }))).toBe('Chatflow · Support');
    expect(flowOptionLabel(flow({ id: '2', name: 'Hermes', type: 'AGENTFLOW' }))).toBe('Agentflow · Hermes');
  });

  it('names a new canvas after the assistant', () => {
    expect(canvasNameForAssistant('Hermes')).toBe('Hermes canvas');
    expect(canvasNameForAssistant('Hermes', 'CHATFLOW')).toBe('Hermes chatflow');
  });
});
