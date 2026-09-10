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
  listApiKeys: vi.fn(async () => [{ id: 'k1', keyName: 'prod', apiKey: 'sk-test' }]),
  createApiKey: vi.fn(),
  deleteApiKey: vi.fn(),
  resolveFlowiseUrl: () => '/canvas-island',
  readCanvasHostKind: () => 'local',
  writeCanvasHostKind: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@renderer/services/flowise', () => flowise);

import OpenIdeasApiKeysSection from '@/renderer/pages/settings/ApiKeysSettings/OpenIdeasApiKeysSection';

describe('OpenIdeasApiKeysSection', () => {
  beforeEach(() => {
    flowise.pingFlowise.mockResolvedValue(true);
    flowise.listApiKeys.mockResolvedValue([{ id: 'k1', keyName: 'prod', apiKey: 'sk-test' }]);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('lists OpenIdeas API keys from the typed client', async () => {
    render(<OpenIdeasApiKeysSection />);

    expect(await screen.findByTestId('openideas-api-keys')).toBeTruthy();
    expect(await screen.findByTestId('openideas-api-key-row')).toHaveTextContent('prod');
    await waitFor(() => {
      expect(flowise.listApiKeys).toHaveBeenCalledWith('/canvas-island');
    });
  });

  it('shows an offline hint instead of a nested catalog iframe', async () => {
    flowise.pingFlowise.mockResolvedValue(false);
    render(<OpenIdeasApiKeysSection />);

    expect(await screen.findByTestId('openideas-api-keys-offline')).toBeTruthy();
    expect(screen.queryByTestId('openideas-api-key-row')).toBeNull();
    expect(flowise.listApiKeys).not.toHaveBeenCalled();
  });
});
