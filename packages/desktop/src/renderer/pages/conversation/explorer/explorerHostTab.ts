/**
 * Shared tab state for the project-side host. Conversation header actions live
 * outside ExplorerContainer, so a tiny external store keeps Canvas navigation
 * synchronized without coupling either component to the layout hierarchy.
 */

import { useSyncExternalStore } from 'react';

export type ExplorerHostTab = 'files' | 'changes' | 'canvas';

let currentTab: ExplorerHostTab = 'files';
const listeners = new Set<() => void>();

export const getExplorerHostTab = (): ExplorerHostTab => currentTab;

export const setExplorerHostTab = (tab: ExplorerHostTab): void => {
  if (tab === currentTab) return;
  currentTab = tab;
  for (const listener of listeners) listener();
};

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useExplorerHostTab = (): ExplorerHostTab =>
  useSyncExternalStore(subscribe, getExplorerHostTab, getExplorerHostTab);

export const resetExplorerHostTabForTest = (): void => {
  currentTab = 'files';
  listeners.clear();
};
