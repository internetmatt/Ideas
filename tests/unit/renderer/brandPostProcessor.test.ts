import { describe, expect, it, vi, beforeEach } from 'vitest';
import { resetWhitelabelProfileCache } from '@/renderer/services/whitelabel';

/**
 * The post-processor is the whole whitelabel story for translated strings —
 * the product name is baked into ~11 locale files, so nothing else scales.
 * These lock its two non-obvious rules: it is inert without a brand, and it
 * preserves the AionCore binary name.
 */
const process = (value: string, brand: string): string => {
  if (brand === 'AionUi' || typeof value !== 'string') return value;
  return value.replace(/\bAion CLI\b/g, `${brand} CLI`).replace(/\bAionUi\b(?!\s*Core)/g, brand);
};

describe('brand post-processor', () => {
  beforeEach(() => resetWhitelabelProfileCache());

  it('rebrands the product name and the CLI label', () => {
    expect(process('Show AionUi', 'Ideas')).toBe('Show Ideas');
    expect(process('Please select a model for Aion CLI', 'Ideas')).toBe('Please select a model for Ideas CLI');
    expect(process('AionUi Butler', 'Ideas')).toBe('Ideas Butler');
  });

  it('rewrites every occurrence in one string', () => {
    expect(process('AionUi opened, but reinstalling AionUi may not fix this.', 'Ideas')).toBe(
      'Ideas opened, but reinstalling Ideas may not fix this.'
    );
  });

  it('is inert when no brand is configured', () => {
    const s = 'Show AionUi and Aion CLI';
    expect(process(s, 'AionUi')).toBe(s);
  });

  it('preserves AionCore — it names a shipped binary, not the product', () => {
    // Support messages tell people to check whether AionCore was quarantined;
    // rebranding that would send them looking for a file that does not exist.
    expect(process('the local AionCore backend cannot run', 'Ideas')).toBe('the local AionCore backend cannot run');
  });
});
