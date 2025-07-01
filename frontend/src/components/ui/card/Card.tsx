import React, { ReactNode } from 'react';

interface CardProps {
  title?: string;
  children: ReactNode;
  className?: string;
  titleColor?: 'primary' | 'white';
}

const Card: React.FC<CardProps> = ({ 
  title, 
  children, 
  className = '',
  titleColor = 'primary'
}) => {
  return (
    <div className={`bg-white shadow-md rounded-lg border border-gray-100 ${className}`}>
      {title && (
        <div className={`px-6 py-4 ${titleColor === 'white' ? 'bg-primary-700' : ''}`}>
          <h2 className={`text-lg font-semibold ${titleColor === 'white' ? 'text-white' : 'text-primary-800'}`}>
            {title}
          </h2>
        </div>
      )}
      <div className={`${title ? 'px-6 py-6' : 'p-6'}`}>
        {children}
      </div>
    </div>
  );
};

export default Card; 