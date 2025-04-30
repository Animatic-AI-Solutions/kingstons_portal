import React from 'react';

interface YearNavigatorProps {
  selectedYear: number;
  onYearChange: (year: number) => void;
}

const YearNavigator: React.FC<YearNavigatorProps> = ({ selectedYear, onYearChange }) => {
  // Calculate the current year
  const currentYear = new Date().getFullYear();
  
  // Calculate the start year of a 5-year block that includes the reference year
  // Always displays the current year and 4 years before it in the first block
  const getBlockStartYear = (year: number): number => {
    // The start year is the current year minus the remainder of the 5-year block
    // This ensures that current year is always the last year in a block
    const yearsFromCurrentYear = currentYear - year;
    const blockOffset = yearsFromCurrentYear % 5;
    
    // If the year is the current year or up to 4 years before it, start from (currentYear - 4)
    // Otherwise, calculate the appropriate block
    if (year > currentYear - 5) {
      return currentYear - 4;
    } else {
      return year - (year % 5);
    }
  };
  
  // Initialize with a block that includes the selected year
  // If selected year is current year or within 4 years before it, show the current block
  const [startYear, setStartYear] = React.useState<number>(
    selectedYear > currentYear - 5 
      ? currentYear - 4 
      : getBlockStartYear(selectedYear)
  );
  
  // Generate the array of years to display (5 years)
  // For the first block, this will be [currentYear-4, currentYear-3, currentYear-2, currentYear-1, currentYear]
  const yearsToDisplay = Array.from({ length: 5 }, (_, i) => startYear + i)
    .filter(year => year <= currentYear); // Ensure no future years
  
  // Navigate to previous 5 years
  const handlePrevious = () => {
    setStartYear(Math.max(startYear - 5, 1970)); // Don't go before 1970
  };
  
  // Navigate to next 5 years, but never beyond the block containing the current year
  const handleNext = () => {
    const nextStartYear = startYear + 5;
    // Only allow navigation to next block if it doesn't exceed the block containing current year
    if (nextStartYear <= currentYear - 4) {
      setStartYear(nextStartYear);
    } else {
      setStartYear(currentYear - 4); // Go to the block containing current year
    }
  };
  
  // Check if we can navigate forward (only if not already at the current year block)
  const canNavigateNext = startYear < currentYear - 4;
  
  // Check if we can navigate backward (if we're not at the minimum year already)
  const canNavigatePrevious = startYear > 1970;
  
  // Update startYear when selectedYear changes
  React.useEffect(() => {
    // Check if selectedYear is within the current block
    if (selectedYear < startYear || selectedYear > startYear + 4) {
      // If selected year is current year or within 4 years before it, show the current block
      if (selectedYear > currentYear - 5) {
        setStartYear(currentYear - 4);
      } else {
        // Otherwise calculate the appropriate block for the selected year
        setStartYear(getBlockStartYear(selectedYear));
      }
    }
  }, [selectedYear, startYear, currentYear]);
  
  return (
    <div className="flex items-center justify-center mb-6 space-x-2">
      <button
        onClick={handlePrevious}
        disabled={!canNavigatePrevious}
        className={`p-2 rounded-md ${
          canNavigatePrevious 
            ? 'text-gray-700 hover:bg-gray-200 hover:text-gray-900' 
            : 'text-gray-400 cursor-not-allowed'
        }`}
        aria-label="Previous years"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      </button>
      
      <div className="flex space-x-1">
        {yearsToDisplay.map(year => (
          <button
            key={year}
            onClick={() => onYearChange(year)}
            className={`px-4 py-2 rounded-md ${
              selectedYear === year
                ? 'bg-blue-600 text-white font-medium'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {year}
          </button>
        ))}
      </div>
      
      <button
        onClick={handleNext}
        disabled={!canNavigateNext}
        className={`p-2 rounded-md ${
          canNavigateNext 
            ? 'text-gray-700 hover:bg-gray-200 hover:text-gray-900' 
            : 'text-gray-400 cursor-not-allowed'
        }`}
        aria-label="Next years"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
        </svg>
      </button>
    </div>
  );
};

export default YearNavigator; 