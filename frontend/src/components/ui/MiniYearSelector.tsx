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
      className={`flex items-center justify-center gap-0 bg-white/90 shadow-xs border border-gray-300 rounded-sm ${className}`}
      role="group"
      aria-label="Year selector"
      onClick={(e) => e.stopPropagation()} // Prevent parent click events
      style={{ height: '16px', fontSize: '10px' }} // Ultra-compact size
    >
      {/* Previous Year Button */}
      <button
        type="button"
        onClick={handlePreviousYear}
        onKeyDown={(e) => handleKeyDown(e, 'previous')}
        disabled={!hasPrevious}
        className="flex items-center justify-center w-4 h-4 text-xs font-bold text-gray-600 hover:text-blue-700 hover:bg-blue-100 transition-all duration-100 ease-in-out disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none active:bg-blue-200 border-r border-gray-200"
        aria-label="Previous year"
        title={hasPrevious ? `Go to ${availableYears[currentIndex - 1]}` : 'No previous year available'}
      >
        ‹
      </button>

      {/* Current Year Display */}
      <span 
        className="text-xs font-medium text-gray-800 min-w-[28px] text-center px-0.5 select-none leading-none"
        style={{ fontSize: '9px', lineHeight: '16px' }}
        aria-label={`Current year: ${currentYear}`}
        title={`Current year: ${currentYear}`}
      >
        {currentYear}
      </span>

      {/* Next Year Button */}
      <button
        type="button"
        onClick={handleNextYear}
        onKeyDown={(e) => handleKeyDown(e, 'next')}
        disabled={!hasNext}
        className="flex items-center justify-center w-4 h-4 text-xs font-bold text-gray-600 hover:text-blue-700 hover:bg-blue-100 transition-all duration-100 ease-in-out disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none active:bg-blue-200 border-l border-gray-200"
        aria-label="Next year"
        title={hasNext ? `Go to ${availableYears[currentIndex + 1]}` : 'No next year available'}
      >
        ›
      </button>
    </div>
  );
};

export default MiniYearSelector;