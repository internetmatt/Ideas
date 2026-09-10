import React from 'react';
import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, isProjectoHostedShell, useAuth } from '@/renderer/hooks/context/AuthContext';

describe('isProjectoHostedShell', () => {
  it('keeps branding-only Ideas on local /login', () => {
    expect(isProjectoHostedShell({ whitelabel: 'ideas' })).toBe(false);
    expect(isProjectoHostedShell({ whitelabel: 'ideas', identity: {} })).toBe(false);
  });

  it('treats Projecto or Ideas-plus-identity as a host shell', () => {
    expect(isProjectoHostedShell({ whitelabel: 'projecto' })).toBe(true);
    expect(isProjectoHostedShell({ whitelabel: 'ideas', identity: { email: 'matt@example.com' } })).toBe(true);
  });
});

type AuthSnapshot = ReturnType<typeof useAuth>;

let auth: AuthSnapshot;

const AuthProbe: React.FC = () => {
  auth = useAuth();
  return null;
};

afterEach(() => {
  delete window.__PROJECTO_INTEGRATIONS__;
  delete (window as Window & { electronAPI?: unknown }).electronAPI;
  vi.unstubAllGlobals();
  cleanup();
});

describe('host-owned Ideas authentication', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'electronAPI', {
      value: undefined,
      configurable: true,
      writable: true,
    });
  });
  it('authenticates against Ideas aioncore instead of the injected Projecto operator', async () => {
    window.__PROJECTO_INTEGRATIONS__ = {
      whitelabel: 'projecto',
      identity: {
        sub: 'user-42',
        email: 'operator@projecto.local',
        tenant_id: 'tenant-7',
      },
    };

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, user: { id: 'ideas-admin', username: 'admin' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(auth.status).not.toBe('checking');
    });
    expect(auth.status).toBe('authenticated');
    expect(auth.user).toEqual({ id: 'ideas-admin', username: 'admin' });
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/user', expect.anything());
  });

  it('prefixes Ideas auth when Projecto hosts the WebUI on cowork', async () => {
    window.__PROJECTO_INTEGRATIONS__ = {
      whitelabel: 'ideas',
      apiBase: '/apps/agent-workspace/cowork',
      identity: { email: 'operator@projecto.local' },
    };

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: false }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>
    );

    await waitFor(() => expect(auth.status).toBe('unauthenticated'));
    expect(auth.user).toBeNull();
    expect(fetchMock).toHaveBeenCalledWith('/apps/agent-workspace/cowork/api/auth/user', expect.anything());
  });

  it('does not skip Ideas login when Electron is attached to the cowork plane', async () => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { pathname: '/apps/agent-workspace/cowork/', origin: 'http://localhost:4715', port: '4715' },
    });
    (window as Window & { electronAPI?: unknown }).electronAPI = { emit: vi.fn(), on: vi.fn() };
    window.__PROJECTO_INTEGRATIONS__ = {
      apiBase: '/apps/agent-workspace/cowork',
      identity: { email: 'operator@projecto.local' },
    };

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: false }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>
    );

    await waitFor(() => expect(auth.status).toBe('unauthenticated'));
    expect(auth.user).toBeNull();
    expect(fetchMock).toHaveBeenCalledWith('/apps/agent-workspace/cowork/api/auth/user', expect.anything());
  });

  it('does not trust an injected identity from an unknown profile', async () => {
    window.__PROJECTO_INTEGRATIONS__ = {
      whitelabel: 'unknown-host',
      identity: { sub: 'spoofed-user', email: 'spoofed@example.com' },
    };

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ success: false }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    );

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>
    );

    await waitFor(() => expect(auth.status).toBe('unauthenticated'));
    expect(auth.user).toBeNull();
  });
});
