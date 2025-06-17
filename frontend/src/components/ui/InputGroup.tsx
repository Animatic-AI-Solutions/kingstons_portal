import React, { ReactNode } from 'react';

export interface InputGroupProps {
  children: ReactNode;
  className?: string;
  orientation?: 'horizontal' | 'vertical';
  spacing?: 'none' | 'sm' | 'md' | 'lg';
  align?: 'start' | 'center' | 'end' | 'stretch';
  fullWidth?: boolean;
}

const InputGroup: React.FC<InputGroupProps> = ({
  children,
  className = '',
  orientation = 'horizontal',
  spacing = 'sm',
  align = 'stretch',
  fullWidth = true
}) => {
  // Spacing classes
  const spacingClasses = {
    none: 'gap-0',
    sm: 'gap-1',
    md: 'gap-2',
    lg: 'gap-4'
  };
  
  // Alignment classes
  const alignClasses = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
    stretch: 'items-stretch'
  };
  
  // Base classes
  const baseClasses = orientation === 'horizontal' ? 'flex' : 'flex flex-col';
  const widthClasses = fullWidth ? 'w-full' : '';
  
  const groupClasses = `
    ${baseClasses}
    ${spacingClasses[spacing]}
    ${alignClasses[align]}
    ${widthClasses}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  return (
    <div className={groupClasses}>
      {children}
    </div>
  );
};

// Sub-components for specific input group patterns
export const InputWithButton: React.FC<{
  children: ReactNode;
  className?: string;
}> = ({ children, className = '' }) => (
  <div className={`flex ${className}`}>
    {children}
  </div>
);

export const InputWithAddon: React.FC<{
  children: ReactNode;
  className?: string;
  position?: 'left' | 'right';
}> = ({ children, className = '', position = 'right' }) => {
  const positionClasses = position === 'left' ? 'flex-row' : 'flex-row-reverse';
  
  return (
    <div className={`flex ${positionClasses} ${className}`}>
      {children}
    </div>
  );
};

export const InputRow: React.FC<{
  children: ReactNode;
  className?: string;
  gap?: 'sm' | 'md' | 'lg';
}> = ({ children, className = '', gap = 'md' }) => {
  const gapClasses = {
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6'
  };
  
  return (
    <div className={`flex flex-col sm:flex-row ${gapClasses[gap]} ${className}`}>
      {children}
    </div>
  );
};

export const InputColumn: React.FC<{
  children: ReactNode;
  className?: string;
  gap?: 'sm' | 'md' | 'lg';
}> = ({ children, className = '', gap = 'md' }) => {
  const gapClasses = {
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6'
  };
  
  return (
    <div className={`flex flex-col ${gapClasses[gap]} ${className}`}>
      {children}
    </div>
  );
};

export default InputGroup; 