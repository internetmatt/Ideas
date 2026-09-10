/**
 * @license
 * Copyright 2026 Projecto / Ideas fork
 * SPDX-License-Identifier: Apache-2.0
 *
 * Ideas chat and the OpenIdeas chatbot stay parallel. This store only
 * decides how the canvas chat sits on the Ideas thread: a picture-in-picture
 * card, or a cover overlay. It never opens a third column.
 */

import { useSyncExternalStore } from 'react';

export type SessionChatOverlayMode = 'off' | 'pip' | 'cover';

let currentMode: SessionChatOverlayMode = 'off';
const listeners = new Set<() => void>();

export function getSessionChatOverlay(): SessionChatOverlayMode {
  return currentMode;
}

export function setSessionChatOverlay(mode: SessionChatOverlayMode): void {
  if (mode === currentMode) return;
  currentMode = mode;
  for (const listener of listeners) listener();
}

export function toggleSessionChatOverlay(): SessionChatOverlayMode {
  setSessionChatOverlay(currentMode === 'off' ? 'pip' : 'off');
  return currentMode;
}

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export function useSessionChatOverlay(): SessionChatOverlayMode {
  return useSyncExternalStore(subscribe, getSessionChatOverlay, getSessionChatOverlay);
}

export function resetSessionChatOverlayForTest(): void {
  currentMode = 'off';
  listeners.clear();
}
