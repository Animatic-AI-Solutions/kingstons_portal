import React, { useMemo } from 'react';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  Legend 
} from 'recharts';

// Define the type for fund data
interface Fund {
  id: string;
  name: string;
  amount: number;
  category?: string;
}

// Define the type for chart data
interface ChartData {
  name: string;
  value: number;
  percentage: string;
  color: string;
}

interface FundDistributionChartProps {
  data: Fund[];
  threshold?: number; // percentage threshold for "Other" category
  title: string;
  height?: number;
  width?: number;
  animated?: boolean;
}

// Color palette aligned with our design - purple, pink, green variations
const COLORS = [
  '#4B2D83', // primary-700 (dark purple)
  '#7c54c4', // primary-600 (medium purple)
  '#9975d5', // primary-500 (light purple)
  '#d100a8', // pink-600 (medium pink)
  '#a8007e', // pink-700 (dark pink)
  '#ee00c2', // pink-500 (light pink)
  '#17a46f', // green-600 (medium green)
  '#108356', // green-700 (dark green)
  '#27cb8b', // green-500 (light green)
  '#CCCCCC', // gray for "Other"
];

// Custom tooltip component
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-3 rounded-lg shadow-md border border-gray-100">
        <p className="font-medium text-gray-900">{data.name}</p>
        <p className="text-primary-700">
          {new Intl.NumberFormat('en-GB', {
            style: 'currency',
            currency: 'GBP',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
          }).format(data.value)}
        </p>
        <p className="text-gray-600">{data.percentage}%</p>
      </div>
    );
  }
  return null;
};

// Custom legend component that can wrap and handles long names better
const CustomLegend = ({ payload }: any) => {
  if (!payload || !payload.length) return null;
  
  return (
    <div className="flex flex-wrap justify-center gap-2 mt-4 px-2">
      {payload.map((entry: any, index: number) => (
        <div 
          key={`legend-${index}`} 
          className="flex items-center space-x-1 text-xs"
          style={{ maxWidth: '150px' }}
        >
          <div
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: entry.color }}
          />
          <span 
            className="text-gray-700 truncate" 
            title={entry.value}
          >
            {entry.value}
          </span>
        </div>
      ))}
    </div>
  );
};

const FundDistributionChart: React.FC<FundDistributionChartProps> = ({
  data,
  threshold = 5, // Changed from 2% to 5%
  title,
  height,
  width = '100%',
  animated = true
}) => {
  // Process the fund data to include the "Other" category for funds below threshold
  const chartData = useMemo(() => {
    const total = data.reduce((sum, fund) => sum + fund.amount, 0);
    
    // Filter funds above the threshold
    const significantFunds = data.filter(
      fund => (fund.amount / total * 100) >= threshold
    );
    
    // Calculate the total for "Other" category
    const otherAmount = total - significantFunds.reduce(
      (sum, fund) => sum + fund.amount, 0
    );
    
    // DEBUGGING: Log filtering results
    console.log(`📈 ${title} - Threshold Filtering:`);
    console.log(`   Total items: ${data.length}, Significant (>${threshold}%): ${significantFunds.length}`);
    console.log(`   Significant total: £${significantFunds.reduce((sum, fund) => sum + fund.amount, 0).toLocaleString()}`);
    console.log(`   Other amount: £${otherAmount.toLocaleString()}`);
    console.log(`   Chart will show: ${significantFunds.length + (otherAmount > 0 ? 1 : 0)} slices`);
    
    // Format data for the chart
    const result = significantFunds.map((fund, index) => ({
      name: fund.name,
      value: fund.amount,
      percentage: (fund.amount / total * 100).toFixed(1),
      color: COLORS[index % (COLORS.length - 1)] // Use last color (gray) only for "Other"
    }));
    
    // Add "Other" category if needed
    if (otherAmount > 0) {
      result.push({
        name: 'Other',
        value: otherAmount,
        percentage: (otherAmount / total * 100).toFixed(1),
        color: COLORS[COLORS.length - 1] // Gray for "Other"
      });
    }
    
    return result;
  }, [data, threshold, title]);

  // Calculate dynamic height based on number of items in legend
  const dynamicHeight = useMemo(() => {
    if (height) return height;
    
    const baseHeight = 300;
    const legendItems = chartData.length;
    const legendRows = Math.ceil(legendItems / 3); // Assuming 3 items per row
    const legendHeight = legendRows * 25; // Approximate height per row
    
    return Math.max(baseHeight, baseHeight + legendHeight);
  }, [chartData.length, height]);

  // Format currency for display
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  // Calculate total value for display
  const totalValue = useMemo(() => {
    const total = data.reduce((sum, fund) => sum + fund.amount, 0);
    console.log(`📊 ${title} - Total: £${total.toLocaleString()}, Items: ${data.length}`);
    console.log(`📊 ${title} - Data:`, data.map(d => `${d.name}: £${d.amount.toLocaleString()}`));
    return total;
  }, [data, title]);

  return (
    <div className="bg-white shadow-md rounded-lg overflow-hidden border border-gray-100 flex flex-col h-full">
      <div className="border-b border-gray-200 px-6 py-4 flex-shrink-0">
        <h2 className="text-lg font-semibold text-primary-800">{title}</h2>
      </div>
      <div className="p-6 flex-1 flex flex-col">
        <div className="text-center mb-4 flex-shrink-0">
          <p className="text-sm font-medium text-gray-500">Total Funds</p>
          <p className="text-2xl font-bold text-gray-800">{formatCurrency(totalValue)}</p>
        </div>
        
        <div className="flex-1 min-h-0" style={{ width }}>
          <ResponsiveContainer width="100%" height="100%" minHeight={dynamicHeight}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="45%" // Moved up slightly to make room for legend
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
                animationDuration={animated ? 800 : 0}
                animationBegin={animated ? 100 : 0}
                labelLine={false}
                label={false} // Remove labels on the pie chart
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                content={<CustomLegend />}
                wrapperStyle={{ paddingTop: '20px' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default React.memo(FundDistributionChart); 