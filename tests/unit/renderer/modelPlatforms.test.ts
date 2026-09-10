/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 *
 * Locks the MODEL_PLATFORMS presentation order: the array order is what the
 * add-platform picker renders, so partner placement is part of the contract.
 */

import { describe, expect, it } from 'vitest';

import { DEFAULT_PLATFORM_VALUE, MODEL_PLATFORMS } from '@renderer/utils/model/modelPlatforms';

describe('MODEL_PLATFORMS ordering', () => {
  it('keeps Custom first, then Ideas runtime presets, then both Moonshot entries', () => {
    const values = MODEL_PLATFORMS.map((p) => p.value);
    expect(values[0]).toBe('custom');
    expect(values[1]).toBe('PAIR');
    expect(values[2]).toBe('Ideas');
    expect(values[3]).toBe('Moonshot');
    expect(values[4]).toBe('Moonshot-Global');
  });

  it('defaults the add-model modal platform to the first list entry', () => {
    expect(DEFAULT_PLATFORM_VALUE).toBe(MODEL_PLATFORMS[0].value);
    expect(DEFAULT_PLATFORM_VALUE).toBe('custom');
  });

  it('pins PAIR (Projecto local) after the Moonshot pair', () => {
    const values = MODEL_PLATFORMS.map((p) => p.value);
    expect(values[3]).toBe('PAIR');
    expect(MODEL_PLATFORMS.find((p) => p.value === 'PAIR')?.base_url).toBe('http://127.0.0.1:8787/v1');
  });

  it('defines each Moonshot entry exactly once', () => {
    const moonshotEntries = MODEL_PLATFORMS.filter((p) => p.value.startsWith('Moonshot'));
    expect(moonshotEntries.map((p) => p.value)).toEqual(['Moonshot', 'Moonshot-Global']);
    expect(moonshotEntries.map((p) => p.base_url)).toEqual([
      'https://api.moonshot.cn/v1',
      'https://api.moonshot.ai/v1',
    ]);
  });
});
