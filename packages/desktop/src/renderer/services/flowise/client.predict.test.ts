/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it } from 'vitest';
import { parseFlowisePredictResult } from './client';

describe('parseFlowisePredictResult', () => {
  it('reads string payloads', () => {
    expect(parseFlowisePredictResult('hello')).toEqual({ text: 'hello', raw: 'hello' });
  });

  it('reads text field from object payloads', () => {
    expect(parseFlowisePredictResult({ text: 'hi', chatId: 'c1', chatMessageId: 'm1' })).toEqual({
      text: 'hi',
      chatId: 'c1',
      chatMessageId: 'm1',
      raw: { text: 'hi', chatId: 'c1', chatMessageId: 'm1' },
    });
  });

  it('returns empty text for unknown shapes', () => {
    expect(parseFlowisePredictResult(null).text).toBe('');
    expect(parseFlowisePredictResult(42).text).toBe('');
  });
});
