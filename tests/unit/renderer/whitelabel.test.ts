import {
  AIONUI_PROFILE,
  IDEAS_PROFILE,
  PROJECTO_PROFILE,
  applyWhitelabelAllowlist,
  isHostOwnedWhitelabel,
  resolveWhitelabelProfile,
} from '@/renderer/services/whitelabel';
import { describe, expect, it, vi } from 'vitest';

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

  it('resolves the Ideas host profile by id', () => {
    expect(resolveWhitelabelProfile('ideas')).toBe(IDEAS_PROFILE);
    expect(IDEAS_PROFILE.channels).toEqual([]);
    expect(isHostOwnedWhitelabel('ideas')).toBe(true);
    expect(isHostOwnedWhitelabel('projecto')).toBe(true);
    expect(isHostOwnedWhitelabel('aionui')).toBe(false);
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

describe('unknown profile ids are loud', () => {
  it('warns when a configured id matches no profile', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(resolveWhitelabelProfile('does-not-exist-either')).toBe(AIONUI_PROFILE);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toContain('does-not-exist-either');
    warn.mockRestore();
  });

  it('stays quiet for known ids and for no id at all', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    resolveWhitelabelProfile('projecto');
    resolveWhitelabelProfile('ideas');
    resolveWhitelabelProfile('aionui');
    resolveWhitelabelProfile(undefined);
    resolveWhitelabelProfile('');
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe('assistant aliases', () => {
  it('renames vendored third-party CLIs on the projecto profile', () => {
    // Projecto ships gemini-cli as the Pollux fork; showing the upstream name
    // would point users at a CLI this build does not actually run.
    expect(PROJECTO_PROFILE.assistantAliases?.['Gemini CLI']).toBe('Pollux CLI');
  });

  it('upstream profile declares no aliases', () => {
    expect(AIONUI_PROFILE.assistantAliases).toBeUndefined();
  });
});

describe('skill denylist', () => {
  it('hides upstream skills that do not apply to this deployment', () => {
    // These ship inside aioncore, so a branded build cannot delete them at
    // the source — it declines to surface them.
    for (const name of ['xiaohongshu-recruiter', 'x-recruiter', 'weixin-file-send']) {
      expect(PROJECTO_PROFILE.skillDenylist).toContain(name);
    }
  });

  it('keeps every other skill visible', () => {
    expect(PROJECTO_PROFILE.skillDenylist).not.toContain('aionui-config');
    expect(PROJECTO_PROFILE.skillDenylist).not.toContain('pdf');
  });

  it('upstream profile hides nothing', () => {
    expect(AIONUI_PROFILE.skillDenylist).toBeUndefined();
  });
});
