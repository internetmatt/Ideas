/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en-US' },
  }),
}));

const navigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => navigate,
}));

const login = vi.fn();
vi.mock('@/renderer/hooks/context/AuthContext', () => ({
  useAuth: () => ({
    status: 'unauthenticated',
    login,
  }),
}));

vi.mock('@renderer/hooks/context/AuthContext', () => ({
  useAuth: () => ({
    status: 'unauthenticated',
    login,
  }),
}));

vi.mock('@/renderer/services/i18n', () => ({
  changeLanguage: vi.fn(() => Promise.resolve()),
}));

vi.mock('@renderer/components/layout/AppLoader', () => ({
  default: () => <div data-testid='app-loader'>loading</div>,
}));

vi.mock('@renderer/pages/login/LoginPage.css', () => ({}));

import LoginPage from '@renderer/pages/login';

describe('LoginPage', () => {
  beforeEach(() => {
    login.mockReset();
    navigate.mockReset();
    document.body.className = '';
  });

  it('renders the ideus-shaped Ideas sign-in surface', () => {
    const { container } = render(<LoginPage />);

    expect(screen.getByTestId('auth-form')).toBeInTheDocument();
    expect(container.querySelector('h1.login-page__heading')?.textContent).toBe('login.heading');
    expect(container.querySelector('[role="img"]')?.getAttribute('aria-label')).toBe('login.brand');

    const email = screen.getByTestId('login-email') as HTMLInputElement;
    expect(email.id).toBe('emailOrLdapLoginId');
    expect(email.name).toBe('email');
    expect(email.autocomplete).toBe('username');
    expect(email.inputMode).toBe('email');

    const password = screen.getByTestId('login-password') as HTMLInputElement;
    expect(password.id).toBe('password');
    expect(password.type).toBe('password');
    expect(password.autocomplete).toBe('current-password');

    expect(container.querySelector('.login-page__submit')?.textContent).toContain('login.submit');
    expect(container.querySelector('.login-page__forgot')?.textContent).toBe('login.forgotPassword');
    expect(container.querySelector('#lang-select')).toBeTruthy();
  });

  it('blocks empty submit with a live error and does not call login', async () => {
    render(<LoginPage />);

    fireEvent.submit(screen.getByTestId('auth-form'));

    expect(await screen.findByRole('alert')).toHaveTextContent('login.errors.empty');
    expect(login).not.toHaveBeenCalled();
    expect(screen.getByTestId('login-email')).toHaveAttribute('aria-invalid', 'true');
  });

  it('submits email as username and opens local password-reset help', async () => {
    login.mockResolvedValue({ success: true });
    render(<LoginPage />);

    fireEvent.change(screen.getByTestId('login-email'), { target: { value: 'admin' } });
    fireEvent.change(screen.getByTestId('login-password'), { target: { value: 'secret' } });
    fireEvent.submit(screen.getByTestId('auth-form'));

    await waitFor(() => {
      expect(login).toHaveBeenCalledWith({ username: 'admin', password: 'secret' });
    });

    fireEvent.click(screen.getByRole('button', { name: 'login.forgotPassword' }));
    expect(screen.getByText('login.forgotPasswordHelp')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'login.backToSignIn' })).toBeInTheDocument();
  });
});
