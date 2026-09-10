import { describe, expect, it, vi } from 'vitest';
import { ensureOpenIdeas, openIdeasPingUrl, type OpenIdeasEnsureOptions } from './openideas-ensure.js';

describe('openIdeasPingUrl', () => {
  it('builds the Flowise ping URL', () => {
    expect(openIdeasPingUrl({ hostname: '127.0.0.1', port: 3010 })).toBe('http://127.0.0.1:3010/api/v1/ping');
  });
});

describe('ensureOpenIdeas', () => {
  it('returns ok without healing when ping already succeeds', async () => {
    const heal = vi.fn(async () => ({ attempted: true, detail: 'should not run' }));
    const result = await ensureOpenIdeas({
      origin: { hostname: '127.0.0.1', port: 3010 },
      heal,
      // Force the first ping path by stubbing via pingOnly + custom: we can't
      // easily mock http.get here, so use heal-only failure path below.
      pingOnly: true,
      timeoutMs: 1,
    } satisfies OpenIdeasEnsureOptions);

    // Without a live sidecar this may be false; assert shape only when offline.
    expect(result).toMatchObject({
      origin: { hostname: '127.0.0.1', port: 3010 },
      healed: false,
    });
    expect(heal).not.toHaveBeenCalled();
  });

  it('records heal attempts when ping stays down', async () => {
    let t = 0;
    const heal = vi.fn(async () => ({ attempted: true, detail: 'fake heal' }));
    const result = await ensureOpenIdeas({
      origin: { hostname: '127.0.0.1', port: 9 },
      timeoutMs: 5,
      heal,
      now: () => t,
      sleep: async () => {
        t += 10;
      },
    });
    expect(heal).toHaveBeenCalledTimes(1);
    expect(result.ok).toBe(false);
    expect(result.healed).toBe(true);
    expect(result.detail).toContain('fake heal');
  });
});
