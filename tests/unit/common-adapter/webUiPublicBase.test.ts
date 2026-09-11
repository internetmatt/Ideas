import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_IDEAS_COWORK_LOGIN_PATH,
  DEFAULT_IDEAS_HOST_ORIGIN,
  DEFAULT_IDEAS_WEBUI_ORIGIN,
  getWebUiPublicBase,
  ideasWebUiOrigin,
  isProjectoCoworkHost,
  resolveIdeasHostShellUrl,
  webUiPath,
} from '@/common/adapter/webUiPublicBase';

describe('webUiPublicBase', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns an empty prefix on standalone :3011', () => {
    vi.stubGlobal('window', { location: { pathname: '/', origin: 'http://127.0.0.1:3011', port: '3011' } });
    expect(getWebUiPublicBase()).toBe('');
    expect(webUiPath('/login')).toBe('/login');
    expect(ideasWebUiOrigin()).toBe('http://127.0.0.1:3011');
  });

  it('prefixes cowork so login and auth hit Ideas, not Projecto Express', () => {
    vi.stubGlobal('window', {
      location: { pathname: '/apps/agent-workspace/cowork/', origin: 'http://localhost:4715', port: '4715' },
    });
    expect(isProjectoCoworkHost()).toBe(true);
    expect(getWebUiPublicBase()).toBe('/apps/agent-workspace/cowork');
    expect(webUiPath('/login')).toBe('/apps/agent-workspace/cowork/login');
    expect(webUiPath('/api/auth/user')).toBe('/apps/agent-workspace/cowork/api/auth/user');
    expect(ideasWebUiOrigin()).toBe(DEFAULT_IDEAS_WEBUI_ORIGIN);
  });

  it('prefers an injected loopback Ideas origin', () => {
    vi.stubGlobal('window', {
      location: { pathname: '/apps/agent-workspace/cowork/', origin: 'http://localhost:4715', port: '4715' },
      __PROJECTO_INTEGRATIONS__: { ideasOrigin: 'http://127.0.0.1:3011' },
    });
    expect(ideasWebUiOrigin()).toBe('http://127.0.0.1:3011');
  });
});

describe('resolveIdeasHostShellUrl', () => {
  it('returns null unless attach env is set (dev)', () => {
  it('returns null unless attach env is set', () => {
    expect(resolveIdeasHostShellUrl({})).toBeNull();
  });

  it('builds the Ideas login plane on :4715 when attaching to host', () => {
    expect(resolveIdeasHostShellUrl({ AIONUI_ATTACH_HOST: '1' })).toBe(
      `${DEFAULT_IDEAS_HOST_ORIGIN}${DEFAULT_IDEAS_COWORK_LOGIN_PATH}`
    );
  });

  it('defaults packaged Ideas.app onto the Projecto Ideas login plane', () => {
    expect(resolveIdeasHostShellUrl({}, { isPackaged: true })).toBe(
      `${DEFAULT_IDEAS_HOST_ORIGIN}${DEFAULT_IDEAS_COWORK_LOGIN_PATH}`
    );
  });

  it('lets AIONUI_ATTACH_HOST=0 keep the bundled renderer when packaged', () => {
    expect(resolveIdeasHostShellUrl({ AIONUI_ATTACH_HOST: '0' }, { isPackaged: true })).toBeNull();
  });

  it('lets AIONUI_START_URL win over attach defaults', () => {
    expect(
      resolveIdeasHostShellUrl({
        AIONUI_ATTACH_HOST: '1',
        AIONUI_START_URL: 'http://localhost:4715/apps/agent-workspace/cowork/?plane=ideas#/login',
      })
    ).toBe('http://localhost:4715/apps/agent-workspace/cowork/?plane=ideas#/login');
  });
});
