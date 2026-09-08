/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

type SessionWorkflowContextValue = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
};

const SessionWorkflowContext = createContext<SessionWorkflowContextValue | null>(null);

export const SessionWorkflowProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((value) => !value), []);
  const value = useMemo(() => ({ isOpen, open, close, toggle }), [isOpen, open, close, toggle]);
  return <SessionWorkflowContext.Provider value={value}>{children}</SessionWorkflowContext.Provider>;
};

export function useSessionWorkflow(): SessionWorkflowContextValue {
  const ctx = useContext(SessionWorkflowContext);
  if (!ctx) {
    throw new Error('useSessionWorkflow must be used within SessionWorkflowProvider');
  }
  return ctx;
}

export function useOptionalSessionWorkflow(): SessionWorkflowContextValue | null {
  return useContext(SessionWorkflowContext);
}
