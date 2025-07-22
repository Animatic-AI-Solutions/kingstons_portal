import React from 'react';

interface DynamicPageContainerProps {
  children: React.ReactNode;
  maxWidth?: string;
  className?: string;
  customPadding?: string; // Optional custom padding override
}

/**
 * DynamicPageContainer - A responsive page layout wrapper component
 * 
 * What it does: Provides a consistent page container with responsive width management
 * Why it's needed: Ensures consistent page layout across different screen sizes while allowing customizable max-width
 * How it works: 
 *   1. Wraps page content in a responsive container
 *   2. Applies max-width constraint for better readability on large screens
 *   3. Provides consistent horizontal padding and centering
 *   4. Allows custom padding override for special cases
 * Expected output: A centered, responsive container for page content
 */
const DynamicPageContainer: React.FC<DynamicPageContainerProps> = ({
  children,
  maxWidth = '1200px',
  className = '',
  customPadding
}) => {
  const defaultPadding = 'px-4 sm:px-6 lg:px-8';
  const paddingClass = customPadding || defaultPadding;
  
  return (
    <div 
      className={`w-full mx-auto ${paddingClass} ${className}`}
      style={{ maxWidth }}
    >
      {children}
    </div>
  );
};

export default DynamicPageContainer; 