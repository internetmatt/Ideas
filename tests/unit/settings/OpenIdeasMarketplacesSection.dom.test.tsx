/**
 * @license
 * Copyright 2026 Projecto / Ideas fork
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const navigateMock = vi.fn();

const flowise = vi.hoisted(() => ({
  pingFlowise: vi.fn(async () => true),
  listMarketplaceTemplates: vi.fn(async () => [
    {
      id: 'tpl-1',
      templateName: 'Translator',
      type: 'AgentflowV2',
      kind: 'AGENTFLOW',
      description: 'Translate text',
      flowData: '{"nodes":[],"edges":[]}',
    },
  ]),
  cloneMarketplaceTemplate: vi.fn(async () => ({ id: 'flow-9', name: 'Translator', type: 'AGENTFLOW' })),
  marketplaceKindFromType: (value: string) => (String(value).toUpperCase().includes('AGENT') ? 'AGENTFLOW' : 'CHATFLOW'),
  marketplaceTemplateHasScheduleInput: () => false,
  withIdeasScheduledTaskTemplate: (templates: unknown[]) => templates,
  resolveFlowiseUrl: () => '/canvas-island',
  readCanvasHostKind: () => 'local',
  writeCanvasHostKind: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});

vi.mock('@renderer/services/flowise', () => flowise);

import OpenIdeasMarketplacesSection from '@/renderer/pages/settings/MarketplacesSettings/OpenIdeasMarketplacesSection';

describe('OpenIdeasMarketplacesSection', () => {
  beforeEach(() => {
    flowise.pingFlowise.mockResolvedValue(true);
    navigateMock.mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('clones a template onto canvas when Use template is clicked', async () => {
    render(
      <MemoryRouter>
        <OpenIdeasMarketplacesSection />
      </MemoryRouter>
    );

    expect(await screen.findByTestId('openideas-marketplace-row')).toHaveTextContent('Translator');
    fireEvent.click(screen.getByTestId('openideas-marketplace-use'));

    await waitFor(() => {
      expect(flowise.cloneMarketplaceTemplate).toHaveBeenCalled();
    });
    expect(navigateMock).toHaveBeenCalledWith('/canvas?flowId=flow-9&type=AGENTFLOW');
  });
});
