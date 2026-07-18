/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { afterEach, describe, expect, it } from 'vitest';
import { resolveBackendAssetUrl } from '@/renderer/utils/platform';

type TestWindow = Window & {
  __aionuiWebBasePath?: string;
  __backendPort?: number;
};

afterEach(() => {
  const testWindow = window as TestWindow;
  delete testWindow.__aionuiWebBasePath;
  delete testWindow.__backendPort;
});

describe('resolveBackendAssetUrl', () => {
  it('keeps backend-served assets inside the WebUI base path', () => {
    (window as TestWindow).__aionuiWebBasePath = '/integrations/aion/';

    expect(resolveBackendAssetUrl('/api/assets/logos/aion.svg')).toBe(
      '/integrations/aion/api/assets/logos/aion.svg'
    );
  });

  it('preserves root behavior when no WebUI base path is configured', () => {
    expect(resolveBackendAssetUrl('/api/assets/logos/aion.svg')).toBe('/api/assets/logos/aion.svg');
  });

  it('preserves absolute and data URLs', () => {
    expect(resolveBackendAssetUrl('https://cdn.example.test/aion.svg')).toBe('https://cdn.example.test/aion.svg');
    expect(resolveBackendAssetUrl('data:image/svg+xml;base64,PHN2Zz4=')).toBe('data:image/svg+xml;base64,PHN2Zz4=');
  });
});
