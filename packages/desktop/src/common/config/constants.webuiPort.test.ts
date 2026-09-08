/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it } from 'vitest';
import { WEBUI_DEFAULT_PORT } from '@/common/config/constants';
import { DEFAULT_FLOWISE_URL } from '@/renderer/services/flowise/resolveFlowiseUrl';

describe('Ideas / Projecto local port map', () => {
  it('defaults Ideas WebUI to 3011', () => {
    expect(WEBUI_DEFAULT_PORT).toBe(3011);
  });

  it('keeps Flowise embed default on 3010', () => {
    expect(DEFAULT_FLOWISE_URL).toBe('http://127.0.0.1:3010');
  });
});
