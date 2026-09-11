/**
 * @license
 * Copyright 2026 Projecto / Ideas fork
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Compatibility facade over explorerHostTab. The session-canvas header button
 * and Explorer tab strip share one store so Files / Changes / Canvas stay on
 * one chrome.
 */

import {
  getExplorerHostTab,
  resetExplorerHostTabForTest,
  setExplorerHostTab,
  useExplorerHostTab,
  type ExplorerHostTab,
} from './explorerHostTab';

export const WORKSPACE_PANEL_TABS = ['files', 'changes', 'canvas'] as const;

export type WorkspacePanelTab = ExplorerHostTab;

export function isWorkspacePanelTab(value: unknown): value is WorkspacePanelTab {
  return typeof value === 'string' && (WORKSPACE_PANEL_TABS as readonly string[]).includes(value);
}

export const getWorkspacePanelTab = getExplorerHostTab;
export const setWorkspacePanelTab = setExplorerHostTab;
export const useWorkspacePanelTab = useExplorerHostTab;
export const resetWorkspacePanelTabForTest = resetExplorerHostTabForTest;
