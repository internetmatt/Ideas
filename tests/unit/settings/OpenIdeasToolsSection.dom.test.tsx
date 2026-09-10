/**
 * @license
 * Copyright 2026 Projecto / Ideas fork
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';

const flowise = vi.hoisted(() => ({
  pingFlowise: vi.fn(async () => true),
  listTools: vi.fn(async () => [{ id: 'tool-1', name: 'search', description: 'Find things' }]),
  listCustomMcpServers: vi.fn(async () => []),
  createTool: vi.fn(),
  updateTool: vi.fn(),
  deleteTool: vi.fn(),
  createCustomMcpServer: vi.fn(),
  deleteCustomMcpServer: vi.fn(),
  authorizeCustomMcpServer: vi.fn(),
  parseFlowiseCustomMcpTools: () => [],
  resolveFlowiseUrl: () => 'http://127.0.0.1:3010',
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@renderer/services/flowise', () => flowise);

import OpenIdeasToolsSection from '@/renderer/pages/settings/ToolsSettings/OpenIdeasToolsSection';

describe('OpenIdeasToolsSection', () => {
  beforeEach(() => {
    flowise.pingFlowise.mockResolvedValue(true);
    flowise.listTools.mockResolvedValue([{ id: 'tool-1', name: 'search', description: 'Find things' }]);
    flowise.listCustomMcpServers.mockResolvedValue([]);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('lists OpenIdeas tools from the typed client', async () => {
    render(<OpenIdeasToolsSection />);

    expect(await screen.findByTestId('openideas-tools')).toBeTruthy();
    expect(await screen.findByTestId('openideas-tool-row')).toHaveTextContent('search');
    await waitFor(() => {
      expect(flowise.listTools).toHaveBeenCalledWith('http://127.0.0.1:3010');
    });
    expect(flowise.listCustomMcpServers).toHaveBeenCalledWith('http://127.0.0.1:3010');
  });

  it('shows an offline hint instead of a nested catalog iframe', async () => {
    flowise.pingFlowise.mockResolvedValue(false);
    render(<OpenIdeasToolsSection />);

    expect(await screen.findByTestId('openideas-tools-offline')).toBeTruthy();
    expect(screen.queryByTestId('openideas-tool-row')).toBeNull();
    expect(flowise.listTools).not.toHaveBeenCalled();
  });
});
