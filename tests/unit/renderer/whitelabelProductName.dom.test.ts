import { resolveBrandProductName } from '@renderer/services/whitelabel';
import { afterEach, describe, expect, it } from 'vitest';

afterEach(() => {
  delete window.__PROJECTO_INTEGRATIONS__;
});

describe('resolveBrandProductName', () => {
  it('falls back to the provided default when no Projecto inject is present', () => {
    expect(resolveBrandProductName('AionUi')).toBe('AionUi');
  });

  it('falls back when __PROJECTO_INTEGRATIONS__ is present but productName is unset', () => {
    window.__PROJECTO_INTEGRATIONS__ = { whitelabel: 'projecto' };
    expect(resolveBrandProductName('AionUi')).toBe('AionUi');
  });

  it('falls back when the injected productName is blank', () => {
    window.__PROJECTO_INTEGRATIONS__ = { productName: '   ' };
    expect(resolveBrandProductName('AionUi')).toBe('AionUi');
  });

  it('prefers the Projecto-injected productName over the fallback', () => {
    window.__PROJECTO_INTEGRATIONS__ = { whitelabel: 'projecto', productName: 'Cowork' };
    expect(resolveBrandProductName('AionUi')).toBe('Cowork');
  });
});
