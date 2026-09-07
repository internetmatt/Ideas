import React from 'react';

interface IdeasWordmarkProps {
  title: string;
}

const IdeasWordmark: React.FC<IdeasWordmarkProps> = ({ title }) => (
  <div className='login-page__logo' role='img' aria-label={title}>
    <svg className='login-page__mark' viewBox='0 0 32 32' fill='none' aria-hidden='true'>
      <circle cx='16' cy='7' r='3.1' fill='currentColor' />
      <circle cx='7.5' cy='23' r='3.1' fill='currentColor' />
      <circle cx='24.5' cy='23' r='3.1' fill='currentColor' />
      <path
        d='M14.2 9.4 9.4 20.6M17.8 9.4l4.8 11.2M10.8 23h10.4'
        stroke='currentColor'
        strokeWidth='1.8'
        strokeLinecap='round'
      />
    </svg>
    <span className='login-page__wordmark'>{title}</span>
  </div>
);

export default IdeasWordmark;
