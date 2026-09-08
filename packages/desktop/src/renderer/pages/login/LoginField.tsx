import React, { forwardRef } from 'react';

interface LoginFieldProps {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'email' | 'password';
  value: string;
  autoComplete: string;
  required?: boolean;
  invalid?: boolean;
  describedBy?: string;
  testId?: string;
  onChange: (value: string) => void;
  trailing?: React.ReactNode;
}

const LoginField = forwardRef<HTMLInputElement, LoginFieldProps>(function LoginField(
  {
    id,
    name,
    label,
    type,
    value,
    autoComplete,
    required,
    invalid,
    describedBy,
    testId,
    onChange,
    trailing,
  },
  ref
) {
  return (
    <div className='login-page__field'>
      <div className='login-page__label-row'>
        <label className='login-page__label' htmlFor={id}>
          {label}
        </label>
      </div>
      <div className='login-page__control'>
        <input
          ref={ref}
          id={id}
          name={name}
          type={type}
          className='login-page__input'
          autoComplete={autoComplete}
          inputMode={name === 'email' ? 'email' : undefined}
          value={value}
          required={required}
          aria-required={required ? 'true' : undefined}
          aria-invalid={invalid ? 'true' : 'false'}
          aria-describedby={describedBy}
          data-testid={testId}
          onChange={(event) => onChange(event.target.value)}
        />
        {trailing}
      </div>
    </div>
  );
});

export default LoginField;
