import React, { ReactNode } from 'react';

export interface InputLabelProps {
  htmlFor: string;
  children: ReactNode;
  required?: boolean;
  optional?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  helpText?: string;
  helpIcon?: ReactNode;
}

const InputLabel: React.FC<InputLabelProps> = ({
  htmlFor,
  children,
  required = false,
  optional = false,
  size = 'md',
  className = '',
  helpText,
  helpIcon
}) => {
  // Size classes for labels
  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };
  
  // Base label classes
  const labelClasses = `
    block font-medium text-gray-700 mb-1
    ${sizeClasses[size]}
    ${className}
  `.trim().replace(/\s+/g, ' ');
  
  const defaultHelpIcon = (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );

  return (
    <div className="flex items-center justify-between mb-1">
      <label htmlFor={htmlFor} className={labelClasses}>
        <span className="flex items-center">
          {children}
          
          {/* Required Indicator */}
          {required && (
            <span className="text-red-500 ml-1" aria-label="Required field">
              *
            </span>
          )}
          
          {/* Optional Indicator */}
          {optional && !required && (
            <span className="text-gray-400 ml-1 text-xs font-normal">
              (optional)
            </span>
          )}
          
          {/* Help Icon with Tooltip */}
          {helpText && (
            <div className="relative group ml-2">
              <button
                type="button"
                className="text-gray-400 hover:text-gray-600 focus:outline-none focus:text-gray-600 transition-colors duration-150"
                aria-label="Show help text"
              >
                {helpIcon || defaultHelpIcon}
              </button>
              
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 text-xs text-white bg-gray-900 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                {helpText}
                {/* Tooltip Arrow */}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900"></div>
              </div>
            </div>
          )}
        </span>
      </label>
    </div>
  );
};

export default InputLabel; 