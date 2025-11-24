import React from 'react';
import MiniYearSelector from './MiniYearSelector';

interface ProviderSwitch {
  id: number;
  switch_date: string;
  previous_provider_id: number | null;
  new_provider_id: number;
  description: string | null;
  previous_provider_name: string | null;
  new_provider_name: string | null;
}

interface EnhancedMonthHeaderProps {
  month: string;
  currentYear: number;
  availableYears: number[];
  onYearChange: (newYear: number) => void;
  onMonthHeaderClick: (month: string) => void;
  isInFixedMode: boolean;
  providerSwitch?: ProviderSwitch;
  columnIndex: number;
  columnPositions: {left: number, width: number}[];
  headerTop: number | null;
}

const EnhancedMonthHeader: React.FC<EnhancedMonthHeaderProps> = ({
  month,
  currentYear,
  availableYears,
  onYearChange,
  onMonthHeaderClick,
  isInFixedMode,
  providerSwitch,
  columnIndex,
  columnPositions,
  headerTop
}) => {
  // Format month string to display format (e.g., "2024-01" -> "Jan 24")
  const formatMonth = (monthStr: string): string => {
    const [year, monthNum] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
    const monthAbbr = date.toLocaleDateString('en-GB', { month: 'short' });
    const yearShort = year.slice(-2);
    return `${monthAbbr} ${yearShort}`;
  };

  const showMiniYearSelector = isInFixedMode && availableYears.length > 1;

  // Increase height when mini year selector is shown to prevent content clipping
  const headerHeight = showMiniYearSelector ? '38px' : '24px';

  return (
    <th 
      key={month} 
      className="px-1 py-0 text-right font-medium text-gray-800 whitespace-nowrap bg-blue-50 border-b border-gray-300 relative group sticky top-0 z-40"
      style={{
        ...(headerTop !== null && columnPositions[columnIndex] ? {
          position: 'absolute',
          left: `${columnPositions[columnIndex].left}px`,
          width: `${columnPositions[columnIndex].width}px`,
          height: headerHeight,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 40
        } : {
          width: 'auto',
          height: headerHeight
        })
      }}
    >
      {/* Month Display - Clickable area for bulk edit */}
      <div
        className="flex flex-col items-center justify-center w-full h-full cursor-pointer hover:bg-blue-100/50 rounded-sm px-2 transition-colors duration-150"
        onClick={() => onMonthHeaderClick(month)}
        title="Click to bulk edit activities for this month"
        style={{ minHeight: headerHeight, maxWidth: '100px' }}
      >
        {/* Month name - adjust size based on whether mini selector is shown */}
        <div className={`font-medium text-gray-800 leading-none text-center ${showMiniYearSelector ? 'text-xs mb-1' : 'text-sm'}`}>
          {formatMonth(month)}
        </div>
        
        {/* Mini Year Selector - Ultra compact for fixed mode with strict containment */}
        {showMiniYearSelector && (
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: '58px', minWidth: '58px' }}
            className="flex justify-center flex-shrink-0"
          >
            <MiniYearSelector
              currentYear={currentYear}
              availableYears={availableYears}
              onYearChange={onYearChange}
              isVisible={true}
              className=""
              position="center"
            />
          </div>
        )}
      </div>

      {/* Provider Switch Indicator */}
      {providerSwitch && (
        <div className="absolute -top-1 -right-1 z-50">
          <div className="relative group">
            <div className="w-2 h-2 bg-orange-500 rounded-full border border-white shadow-sm"></div>
            <div className="absolute top-6 right-0 bg-white border border-gray-200 rounded-lg shadow-lg p-3 min-w-[200px] opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none group-hover:pointer-events-auto z-50">
              <div className="text-xs font-semibold text-orange-700 mb-1">Provider Switch</div>
              <div className="text-xs text-gray-600 space-y-1">
                <div>From: {providerSwitch.previous_provider_name || 'Unknown'}</div>
                <div>To: {providerSwitch.new_provider_name}</div>
                {providerSwitch.description && (
                  <div className="mt-1 text-xs italic">{providerSwitch.description}</div>
                )}
                <div className="text-xs text-gray-500 mt-1">
                  {new Date(providerSwitch.switch_date).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </th>
  );
};

export default EnhancedMonthHeader;