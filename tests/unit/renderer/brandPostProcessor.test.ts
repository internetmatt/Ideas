import { describe, expect, it } from 'vitest';
import { UPSTREAM_BRAND, type BrandNames } from '@/renderer/services/whitelabel';

/**
 * Mirrors the post-processor in services/i18n/index.ts. Order matters:
 * "Aion CLI" and "AionCore" must be replaced before the bare "AionUi",
 * otherwise a shorter match could claim part of a longer token.
 */
const process = (value: string, brand: BrandNames): string => {
  if (
    brand.product === UPSTREAM_BRAND.product &&
    brand.cli === UPSTREAM_BRAND.cli &&
    brand.core === UPSTREAM_BRAND.core
  ) {
    return value;
  }
  return value
    .replace(new RegExp(`\\b${UPSTREAM_BRAND.cli}\\b`, 'g'), brand.cli)
    .replace(new RegExp(`\\b${UPSTREAM_BRAND.core}\\b`, 'g'), brand.core)
    .replace(new RegExp(`\\b${UPSTREAM_BRAND.product}\\b`, 'g'), brand.product);
};

const IDEAS: BrandNames = { product: 'Ideas', cli: 'OpenIdea CLI', core: 'ideacore' };

describe('brand post-processor — three tokens', () => {
  it('rebrands the product, the CLI and the core binary', () => {
    expect(process('Show AionUi', IDEAS)).toBe('Show Ideas');
    expect(process('Please select a model for Aion CLI', IDEAS)).toBe('Please select a model for OpenIdea CLI');
    expect(process('the local AionCore backend cannot run', IDEAS)).toBe('the local ideacore backend cannot run');
  });

  it('does not let the product token eat the CLI or core tokens', () => {
    // "Aion CLI"/"AionCore" are replaced first; a naive product-first pass
    // would leave "Ideas CLI"/"IdeasCore" style corruption behind.
    expect(process('AionCore and Aion CLI and AionUi', IDEAS)).toBe('ideacore and OpenIdea CLI and Ideas');
  });

  it('rewrites every occurrence in one string', () => {
    expect(process('AionUi opened, but reinstalling AionUi may not fix this.', IDEAS)).toBe(
      'Ideas opened, but reinstalling Ideas may not fix this.'
    );
  });

  it('is inert when nothing is rebranded', () => {
    const s = 'Show AionUi and Aion CLI and AionCore';
    expect(process(s, UPSTREAM_BRAND)).toBe(s);
  });

  it('keeps diagnostic copy pointing at the binary that actually ships', () => {
    // A whitelabeled build ships its core under the branded name, so telling
    // people to check for "AionCore" would name a file that is not on disk.
    expect(process('check whether antivirus quarantined AionCore', IDEAS)).toBe(
      'check whether antivirus quarantined ideacore'
    );
  });
});

describe('brandDataString — backend-supplied names', () => {
  it('rebrands the generated CLI assistant name from aioncore', () => {
    // aioncore persists this as data; i18n never sees it, which is why it
    // survived in an otherwise fully branded UI.
    expect(process('Aion CLI', IDEAS)).toBe('OpenIdea CLI');
  });

  it('leaves unrelated assistant names untouched', () => {
    expect(process('Claude Code', IDEAS)).toBe('Claude Code');
    expect(process('Codex CLI', IDEAS)).toBe('Codex CLI');
  });
});
