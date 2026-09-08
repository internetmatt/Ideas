import { describe, expect, it } from 'vitest';
import { EMPTY_FLOW_DATA, type FlowiseChatflow } from '@renderer/services/flowise';
import {
  canvasNameForAssistant,
  flowsForAssistant,
  isUntitledDraft,
} from '@renderer/pages/flowise/flowisePageModel';

const flow = (partial: Partial<FlowiseChatflow> & Pick<FlowiseChatflow, 'id' | 'name'>): FlowiseChatflow => ({
  workspaceId: 'General',
  ...partial,
});

describe('flowisePageModel', () => {
  it('treats empty Untitled Agent rows as drafts', () => {
    expect(isUntitledDraft(flow({ id: '1', name: 'Untitled Agent', flowData: EMPTY_FLOW_DATA }))).toBe(true);
    expect(isUntitledDraft(flow({ id: '2', name: 'Ideas Typed Client', flowData: EMPTY_FLOW_DATA }))).toBe(false);
  });

  it('keeps only the assistant-attached flow when a session_workflow exists', () => {
    const rows = [
      flow({ id: 'a', name: 'Untitled Agent' }),
      flow({ id: 'b', name: 'Hermes canvas' }),
    ];
    expect(flowsForAssistant(rows, { provider: 'flowise', flow_id: 'b' }).map((row) => row.id)).toEqual(['b']);
  });

  it('hides untitled drafts from the unattached picker', () => {
    const rows = [
      flow({ id: 'a', name: 'Untitled Agent', flowData: EMPTY_FLOW_DATA }),
      flow({ id: 'b', name: 'Hermes canvas' }),
    ];
    expect(flowsForAssistant(rows, null).map((row) => row.id)).toEqual(['b']);
  });

  it('names a new canvas after the assistant', () => {
    expect(canvasNameForAssistant('Hermes')).toBe('Hermes canvas');
  });
});
