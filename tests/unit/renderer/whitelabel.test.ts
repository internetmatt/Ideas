import {
  AIONUI_PROFILE,
  PROJECTO_PROFILE,
  applyWhitelabelAllowlist,
  resolveWhitelabelProfile,
} from '@/renderer/services/whitelabel';
import { describe, expect, it } from 'vitest';

type Item = { id: string };

const items: Item[] = [{ id: 'light' }, { id: 'dark' }, { id: 'hello-kitty' }, { id: 'retro-windows' }];
const idOf = (item: Item) => item.id;

describe('whitelabel profile resolution', () => {
  it('falls back to upstream AionUi when no profile is configured', () => {
    expect(resolveWhitelabelProfile(undefined)).toBe(AIONUI_PROFILE);
    expect(resolveWhitelabelProfile(null)).toBe(AIONUI_PROFILE);
    expect(resolveWhitelabelProfile('')).toBe(AIONUI_PROFILE);
  });

  it('falls back to upstream rather than hiding surfaces on an unknown id', () => {
    expect(resolveWhitelabelProfile('does-not-exist')).toBe(AIONUI_PROFILE);
  });

  it('resolves the Projecto profile by id', () => {
    expect(resolveWhitelabelProfile('projecto')).toBe(PROJECTO_PROFILE);
  });
});

describe('applyWhitelabelAllowlist', () => {
  it('keeps everything upstream ships when the allowlist is undefined', () => {
    expect(applyWhitelabelAllowlist(items, undefined, idOf)).toEqual(items);
  });

  it('removes the surface entirely for an empty allowlist', () => {
    expect(applyWhitelabelAllowlist(items, [], idOf)).toEqual([]);
  });

  it('keeps only allowed ids, preserving upstream order', () => {
    expect(applyWhitelabelAllowlist(items, ['dark', 'light'], idOf).map(idOf)).toEqual(['light', 'dark']);
  });

  it('ignores allowlist entries that upstream does not ship', () => {
    expect(applyWhitelabelAllowlist(items, ['light', 'not-a-theme'], idOf).map(idOf)).toEqual(['light']);
  });

  it('does not mutate the input', () => {
    const source = [...items];
    applyWhitelabelAllowlist(source, ['light'], idOf);
    expect(source).toEqual(items);
  });
});

describe('Projecto profile contents', () => {
  it('drops every IM channel — Projecto owns messaging and tenant identity', () => {
    expect(PROJECTO_PROFILE.channels).toEqual([]);
  });

  it('keeps neutral themes and excludes the novelty ones', () => {
    const themes = PROJECTO_PROFILE.themes ?? [];
    expect(themes).toContain('light');
    expect(themes).toContain('dark');
    for (const novelty of [
      'misaka-mikoto-theme',
      'hello-kitty',
      'retro-windows',
      'retroma-y2k-jp-v42-pure',
      'retroma-obsidian-book',
    ]) {
      expect(themes).not.toContain(novelty);
    }
  });
});
