import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import AppLoader from '@renderer/components/layout/AppLoader';
import { changeLanguage } from '@/renderer/services/i18n';
import { resolveBrandProductName } from '@renderer/services/whitelabel';
import { useAuth } from '../../hooks/context/AuthContext';
import IdeasWordmark from './IdeasWordmark';
import LoginField from './LoginField';
import { LOGIN_FIELDS } from './loginForm';
import './LoginPage.css';

type MessageState = {
  type: 'error' | 'success';
  text: string;
};

const LAST_EMAIL_KEY = 'ideas.webui.lastLoginEmail';

function readRememberedEmail(): string {
  if (typeof window === 'undefined') return '';
  try {
    return window.localStorage.getItem(LAST_EMAIL_KEY)?.trim() || '';
  } catch {
    return '';
  }
}

function writeRememberedEmail(email: string, remember: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    if (remember && email) {
      window.localStorage.setItem(LAST_EMAIL_KEY, email);
    } else {
      window.localStorage.removeItem(LAST_EMAIL_KEY);
    }
  } catch {
    // private mode
  }
}

const LoginPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { status, login } = useAuth();

  const [email, setEmail] = useState(() => readRememberedEmail());
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [message, setMessage] = useState<MessageState | null>(null);
  const [loading, setLoading] = useState(false);

  const emailRef = useRef<HTMLInputElement | null>(null);
  const passwordRef = useRef<HTMLInputElement | null>(null);
  const messageTimer = useRef<number | undefined>(undefined);
  const messageId = 'login-form-message';
  const brandName = useMemo(() => resolveBrandProductName(t('login.brand')), [t]);

  useEffect(() => {
    document.body.classList.add('login-page-active');
    return () => {
      document.body.classList.remove('login-page-active');
      if (messageTimer.current) {
        window.clearTimeout(messageTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  useEffect(() => {
    const mode = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.MODE;
    if (mode === 'test') {
      return;
    }
    emailRef.current?.focus();
  }, []);

  const clearMessageLater = useCallback(() => {
    if (messageTimer.current) {
      window.clearTimeout(messageTimer.current);
    }
    messageTimer.current = window.setTimeout(() => {
      setMessage((prev) => (prev?.type === 'success' ? prev : null));
    }, 5000);
  }, []);

  const showMessage = useCallback(
    (next: MessageState) => {
      setMessage(next);
      if (next.type === 'error') {
        clearMessageLater();
      }
    },
    [clearMessageLater]
  );

  const supportedLanguages = useMemo<{ code: string; label: string }[]>(
    () => [
      { code: 'zh-CN', label: '简体中文' },
      { code: 'zh-TW', label: '繁體中文' },
      { code: 'ja-JP', label: '日本語' },
      { code: 'ko-KR', label: '한국어' },
      { code: 'tr-TR', label: 'Türkçe' },
      { code: 'uk-UA', label: 'Українська' },
      { code: 'pt-BR', label: 'Português (BR)' },
      { code: 'de-DE', label: 'Deutsch' },
      { code: 'es-ES', label: 'Español' },
      { code: 'fa-IR', label: 'فارسی' },
      { code: 'fr-FR', label: 'Français' },
      { code: 'ru-RU', label: 'Русский' },
      { code: 'en-US', label: 'English' },
    ],
    []
  );

  const handleLanguageChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    changeLanguage(event.target.value).catch((error: Error) => {
      console.error('Failed to change language:', error);
    });
  }, []);

  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      const trimmed = email.trim();

      if (!trimmed || !password) {
        showMessage({ type: 'error', text: t('login.errors.empty') });
        return;
      }

      setLoading(true);
      setMessage(null);

      const result = await login({ username: trimmed, password, remember });

      if (result.success) {
        writeRememberedEmail(trimmed, remember);
        showMessage({ type: 'success', text: t('login.success') });
        window.setTimeout(() => {
          void navigate('/guid', { replace: true });
        }, 600);
      } else {
        const errorText = (() => {
          switch (result.code) {
            case 'invalidCredentials':
              return t('login.errors.invalidCredentials');
            case 'tooManyAttempts':
              return t('login.errors.tooManyAttempts');
            case 'networkError':
              return t('login.errors.networkError');
            case 'serverError':
              return t('login.errors.serverError');
            default:
              return result.message ?? t('login.errors.unknown');
          }
        })();
        showMessage({ type: 'error', text: errorText });
      }

      setLoading(false);
    },
    [email, login, navigate, password, remember, showMessage, t]
  );

  if (status === 'checking') {
    return <AppLoader />;
  }

  const emailField = LOGIN_FIELDS[0];
  const passwordField = LOGIN_FIELDS[1];

  return (
    <div className='login-page'>
      <div className='login-page__atmosphere' aria-hidden='true' />

      <label className='login-page__lang' htmlFor='lang-select'>
        <span className='sr-only'>{t('login.languageToggle')}</span>
        <select
          id='lang-select'
          className='login-page__lang-select'
          value={i18n.language}
          onChange={handleLanguageChange}
          aria-label={t('login.languageToggle')}
        >
          {supportedLanguages.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.label}
            </option>
          ))}
        </select>
      </label>

      <div className='login-page__shell'>
        <IdeasWordmark title={brandName} />

        <div className='login-page__card'>
          {forgotOpen ? (
            <>
              <h1 className='login-page__heading'>{t('login.forgotPassword')}</h1>
              <p className='login-page__help'>{t('login.forgotPasswordHelp')}</p>
              <button type='button' className='login-page__forgot' onClick={() => setForgotOpen(false)}>
                {t('login.backToSignIn')}
              </button>
            </>
          ) : (
            <form
              className='login-page__form dilly-form-box'
              data-test-id='auth-form'
              data-testid='auth-form'
              onSubmit={handleSubmit}
              noValidate
            >
              <h1 className='login-page__heading'>{t('login.heading')}</h1>

              <LoginField
                ref={emailRef}
                id='emailOrLdapLoginId'
                name={emailField.name}
                label={t(emailField.labelKey)}
                type='text'
                value={email}
                autoComplete={emailField.autocomplete}
                required
                invalid={message?.type === 'error'}
                describedBy={message ? messageId : undefined}
                testId={emailField.testId}
                onChange={setEmail}
              />

              <LoginField
                ref={passwordRef}
                id='password'
                name={passwordField.name}
                label={t(passwordField.labelKey)}
                type={passwordVisible ? 'text' : 'password'}
                value={password}
                autoComplete={passwordField.autocomplete}
                required
                invalid={message?.type === 'error'}
                describedBy={message ? messageId : undefined}
                testId={passwordField.testId}
                onChange={setPassword}
                trailing={
                  <button
                    type='button'
                    className='login-page__toggle-password'
                    onClick={() => setPasswordVisible((prev) => !prev)}
                    aria-label={passwordVisible ? t('login.hidePassword') : t('login.showPassword')}
                  >
                    <svg viewBox='0 0 24 24' width='18' height='18' fill='none' stroke='currentColor' strokeWidth='2'>
                      {passwordVisible ? (
                        <>
                          <path d='M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24' />
                          <line x1='1' y1='1' x2='23' y2='23' />
                        </>
                      ) : (
                        <>
                          <path d='M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z' />
                          <circle cx='12' cy='12' r='3' />
                        </>
                      )}
                    </svg>
                  </button>
                }
              />

              <label className='login-page__remember'>
                <input
                  type='checkbox'
                  checked={remember}
                  onChange={(event) => setRemember(event.target.checked)}
                  data-testid='login-remember'
                />
                <span>{t('login.rememberMe')}</span>
              </label>

              <button type='submit' className='login-page__submit' disabled={loading}>
                <span className='login-page__submit-row'>
                  {loading && (
                    <svg className='login-page__spinner' viewBox='0 0 24 24' width='18' height='18' aria-hidden='true'>
                      <circle
                        cx='12'
                        cy='12'
                        r='10'
                        stroke='currentColor'
                        strokeWidth='3'
                        fill='none'
                        strokeDasharray='50'
                        strokeDashoffset='25'
                        strokeLinecap='round'
                      />
                    </svg>
                  )}
                  <span>{loading ? t('login.submitting') : t('login.submit')}</span>
                </span>
              </button>

              <p
                id={messageId}
                role='alert'
                aria-live='polite'
                className={`login-page__message ${message ? `login-page__message--${message.type}` : ''}`}
              >
                {message?.text ?? ''}
              </p>

              <button type='button' className='login-page__forgot' onClick={() => setForgotOpen(true)}>
                {t('login.forgotPassword')}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
