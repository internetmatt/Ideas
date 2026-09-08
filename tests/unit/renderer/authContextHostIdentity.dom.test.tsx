import React from 'react';
import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
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
  cleanup();
});

describe('host-owned Ideas authentication', () => {
  it('authenticates the identity injected by the Projecto Ideas host', async () => {
    window.__PROJECTO_INTEGRATIONS__ = {
      whitelabel: 'ideas',
      identity: {
        sub: 'user-42',
        email: 'matt@example.com',
        tenant_id: 'tenant-7',
      },
    };

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>
    );

    await waitFor(() => expect(auth.status).toBe('authenticated'));
    expect(auth.ready).toBe(true);
    expect(auth.user).toEqual({ id: 'user-42', username: 'matt@example.com' });
  });

  it('does not trust an injected identity from an unknown profile', async () => {
    window.__PROJECTO_INTEGRATIONS__ = {
      whitelabel: 'unknown-host',
      identity: { sub: 'spoofed-user', email: 'spoofed@example.com' },
    };

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>
    );

    await waitFor(() => expect(auth.status).toBe('authenticated'));
    expect(auth.user).toBeNull();
  });
});
