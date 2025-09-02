import React from 'react';

interface MiniYearSelectorProps {
  currentYear: number;
  availableYears: number[];
  onYearChange: (newYear: number) => void;
  isVisible: boolean;
  className?: string;
  position?: 'left' | 'center' | 'right';
}

const MiniYearSelector: React.FC<MiniYearSelectorProps> = ({
  currentYear,
  availableYears,
  onYearChange,
  isVisible,
  className = '',
  position = 'center'
}) => {
  if (!isVisible || availableYears.length <= 1) {
    return null;
  }

  const currentIndex = availableYears.indexOf(currentYear);
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < availableYears.length - 1;

  const handlePreviousYear = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent event bubbling to parent elements
    if (hasPrevious) {
      onYearChange(availableYears[currentIndex - 1]);
    }
  };

  const handleNextYear = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent event bubbling to parent elements
    if (hasNext) {
      onYearChange(availableYears[currentIndex + 1]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, action: 'previous' | 'next') => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation(); // Prevent event bubbling to parent elements
      
      // Create a synthetic mouse event for consistency
      const syntheticEvent = {
        preventDefault: () => {},
        stopPropagation: () => {}
      } as React.MouseEvent;
      
      if (action === 'previous') {
        handlePreviousYear(syntheticEvent);
      } else {
        handleNextYear(syntheticEvent);
      }
    }
  };

  const positionClasses = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end'
  };

  return (
    <div 
      className={`inline-flex items-center justify-center gap-0 bg-white/95 shadow-sm border border-gray-300 rounded-sm mx-auto ${className}`}
      role="group"
      aria-label="Year selector"
      onClick={(e) => e.stopPropagation()} // Prevent parent click events
      style={{ 
        height: '14px', 
        width: '58px', // Fixed width to fit in 100px column with padding
        fontSize: '9px',
        maxWidth: '58px' // Prevent overflow
      }}
    >
      {/* Previous Year Button */}
      <button
        type="button"
        onClick={handlePreviousYear}
        onKeyDown={(e) => handleKeyDown(e, 'previous')}
        disabled={!hasPrevious}
        className="flex items-center justify-center w-3 h-3 text-xs font-bold text-gray-600 hover:text-blue-700 hover:bg-blue-100 transition-all duration-100 ease-in-out disabled:opacity-20 disabled:cursor-not-allowed focus:outline-none active:bg-blue-200 rounded-l-sm flex-shrink-0"
        aria-label="Previous year"
        title={hasPrevious ? `Go to ${availableYears[currentIndex - 1]}` : 'No previous year available'}
        style={{ minWidth: '12px', maxWidth: '12px' }}
      >
        ‹
      </button>

      {/* Current Year Display */}
      <div 
        className="text-center px-0.5 select-none leading-none bg-gray-50 border-x border-gray-200 flex-1 flex items-center justify-center"
        style={{ 
          fontSize: '8px', 
          lineHeight: '14px',
          minWidth: '32px',
          maxWidth: '32px'
        }}
        aria-label={`Current year: ${currentYear}`}
        title={`Current year: ${currentYear}`}
      >
        <span className="font-medium text-gray-800 truncate">{currentYear}</span>
      </div>

      {/* Next Year Button */}
      <button
        type="button"
        onClick={handleNextYear}
        onKeyDown={(e) => handleKeyDown(e, 'next')}
        disabled={!hasNext}
        className="flex items-center justify-center w-3 h-3 text-xs font-bold text-gray-600 hover:text-blue-700 hover:bg-blue-100 transition-all duration-100 ease-in-out disabled:opacity-20 disabled:cursor-not-allowed focus:outline-none active:bg-blue-200 rounded-r-sm flex-shrink-0"
        aria-label="Next year"
        title={hasNext ? `Go to ${availableYears[currentIndex + 1]}` : 'No next year available'}
        style={{ minWidth: '12px', maxWidth: '12px' }}
      >
        ›
      </button>
    </div>
  );
};

export default MiniYearSelector;