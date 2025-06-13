import React, { ReactNode } from 'react';

export interface InputErrorProps {
  id?: string;
  children: ReactNode;
  className?: string;
  icon?: ReactNode;
  showIcon?: boolean;
}

const InputError: React.FC<InputErrorProps> = ({
  id,
  children,
  className = '',
  icon,
  showIcon = true
}) => {
  const defaultIcon = (
    <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 15.5c-.77.833.192 2.5 1.732 2.5z" />
    </svg>
  );

  const errorClasses = `
    mt-1 text-xs text-red-600 flex items-center
    ${className}
  `.trim().replace(/\s+/g, ' ');

  return (
    <p id={id} className={errorClasses} role="alert" aria-live="polite">
      {showIcon && (
        <span className="mr-1">
          {icon || defaultIcon}
        </span>
      )}
      {children}
    </p>
  );
};

export default InputError; 