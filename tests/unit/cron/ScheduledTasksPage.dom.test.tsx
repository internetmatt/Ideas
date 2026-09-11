/**
 * @license
 * Copyright 2026 Projecto / Ideas fork
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en-US' },
  }),
}));

vi.mock('@renderer/hooks/context/LayoutContext', () => ({
  useLayoutContext: () => ({ isMobile: false }),
}));

vi.mock('@renderer/pages/cron/useCronJobs', () => ({
  useAllCronJobs: () => ({ jobs: [], loading: false, pauseJob: vi.fn(), resumeJob: vi.fn() }),
}));

vi.mock('@renderer/pages/conversation/hooks/useConversationAssistants', () => ({
  useConversationAssistants: () => ({ presetAssistants: [] }),
}));

vi.mock('@renderer/utils/model/agentLogo', () => ({
  useAgentLogos: () => ({}),
}));

vi.mock('@/common/config/configService', () => ({
  configService: {
    get: () => false,
    setLocal: vi.fn(),
    whenReady: () => Promise.resolve(),
  },
}));

vi.mock('@/renderer/hooks/context/ThemeContext', () => ({
  useThemeContext: () => ({ theme: 'light', fontScale: 1 }),
}));

vi.mock('@/common/adapter/ipcBridge', () => ({
  systemSettings: { setKeepAwake: { invoke: vi.fn() } },
}));

vi.mock('@renderer/pages/cron/ScheduledTasksPage/CreateTaskDialog', () => ({
  default: () => null,
}));

import ScheduledTasksPage from '@/renderer/pages/cron/ScheduledTasksPage';

describe('ScheduledTasksPage create extras', () => {
  afterEach(() => {
    cleanup();
  });

  it('shows the OpenIdeas scheduled-template extra on New task', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ScheduledTasksPage />
      </MemoryRouter>
    );

    await user.click(screen.getByTestId('btn-new-task'));
    expect(await screen.findByTestId('btn-new-task-scheduled-template')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('btn-new-task-scheduled-template').closest('[role="menuitem"]') as HTMLElement);
  });
});
