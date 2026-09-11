/**
 * @license
 * Copyright 2026 Projecto / Ideas fork
 * SPDX-License-Identifier: Apache-2.0
 */

import { afterEach, describe, expect, it } from 'vitest';

import {
  getWorkspacePanelTab,
  isWorkspacePanelTab,
  resetWorkspacePanelTabForTest,
  setWorkspacePanelTab,
} from '@/renderer/pages/conversation/explorer/workspacePanelTabStore';

afterEach(() => {
  resetWorkspacePanelTabForTest();
});

describe('workspacePanelTabStore', () => {
  it('defaults to files and ignores unknown values', () => {
    expect(getWorkspacePanelTab()).toBe('files');
    expect(isWorkspacePanelTab('canvas')).toBe(true);
    expect(isWorkspacePanelTab('preview')).toBe(false);
  });

  it('notifies after a tab change', () => {
    const seen: string[] = [];
    setWorkspacePanelTab('changes');
    expect(getWorkspacePanelTab()).toBe('changes');
    setWorkspacePanelTab('canvas');
    expect(getWorkspacePanelTab()).toBe('canvas');
    setWorkspacePanelTab('canvas');
    expect(seen).toEqual([]);
  });
});
