/**
 * Declarative Ideas sign-in form. Labels are i18n keys so the 3011 surface
 * can render the same field graph the runtime FormRenderer understands.
 */
export type LoginFieldName = 'email' | 'password';

export interface LoginFieldDefinition {
  name: LoginFieldName;
  type: 'email' | 'password';
  widget: 'text' | 'password';
  labelKey: string;
  autocomplete: string;
  required: true;
  testId: string;
}

export const LOGIN_FORM_ID = 'ideas-signin';

export const LOGIN_FIELDS: readonly LoginFieldDefinition[] = [
  {
    name: 'email',
    type: 'email',
    widget: 'text',
    labelKey: 'login.email',
    autocomplete: 'username',
    required: true,
    testId: 'login-email',
  },
  {
    name: 'password',
    type: 'password',
    widget: 'password',
    labelKey: 'login.password',
    autocomplete: 'current-password',
    required: true,
    testId: 'login-password',
  },
] as const;
