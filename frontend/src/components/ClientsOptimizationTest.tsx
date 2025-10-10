import React, { useState, useEffect } from 'react';
import { getBulkClientData, getBulkClientDataOptimized, getBulkClientDataWithOption } from '../services/api';

interface PerformanceResult {
  endpoint: string;
  duration: number;
  clientCount: number;
  totalFum: number;
  dataSource: string;
  error?: string;
}

/**
 * Test component for comparing performance between original and optimized client data endpoints
 * This component is for development/testing purposes only
 */
const ClientsOptimizationTest: React.FC = () => {
  const [results, setResults] = useState<PerformanceResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const runPerformanceTest = async (endpointName: string, endpointFunction: () => Promise<any>) => {
    const startTime = performance.now();

    try {
      const response = await endpointFunction();
      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);

      const result: PerformanceResult = {
        endpoint: endpointName,
        duration,
        clientCount: response.data.client_groups.length,
        totalFum: response.data.total_fum || 0,
        dataSource: response.data.metadata?.data_source || 'unknown'
      };

      return result;
      
    } catch (error) {
      console.error(`❌ ${endpointName} failed:`, error);
      return {
        endpoint: endpointName,
        duration: 0,
        clientCount: 0,
        totalFum: 0,
        dataSource: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  };

  const runComparisonTest = async () => {
    setIsLoading(true);
    setResults([]);

    // Test original endpoint
    const originalResult = await runPerformanceTest('Original (bulk_client_data)', getBulkClientData);
    setResults(prev => [...prev, originalResult]);

    // Small delay to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test optimized endpoint
    const optimizedResult = await runPerformanceTest('Optimized (client_groups_summary)', getBulkClientDataOptimized);
    setResults(prev => [...prev, optimizedResult]);

    setIsLoading(false);
  };

  const runSingleTest = async (endpoint: 'original' | 'optimized') => {
    setIsLoading(true);
    
    let result: PerformanceResult;
    if (endpoint === 'original') {
      result = await runPerformanceTest('Original Endpoint', getBulkClientData);
    } else {
      result = await runPerformanceTest('Optimized Endpoint', getBulkClientDataOptimized);
    }
    
    setResults(prev => [...prev, result]);
    setIsLoading(false);
  };

  const clearResults = () => {
    setResults([]);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Client Data Optimization Test</h2>
      
      <div className="mb-6">
        <p className="text-gray-600 mb-4">
          This test component compares the performance between the original <code>bulk_client_data</code> endpoint 
          and the new ultra-minimal <code>client_groups_summary</code> endpoint that only fetches 5 essential columns.
        </p>
        
        <div className="flex gap-4 mb-4">
          <button
            onClick={runComparisonTest}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? 'Testing...' : 'Run Comparison Test'}
          </button>
          
          <button
            onClick={() => runSingleTest('original')}
            disabled={isLoading}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
          >
            Test Original Only
          </button>
          
          <button
            onClick={() => runSingleTest('optimized')}
            disabled={isLoading}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            Test Optimized Only
          </button>
          
          <button
            onClick={clearResults}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Clear Results
          </button>
        </div>
      </div>

      {results.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Test Results</h3>
          
          {results.map((result, index) => (
            <div 
              key={`${result.endpoint}-${index}`}
              className={`p-4 rounded-lg border-2 ${
                result.error 
                  ? 'border-red-200 bg-red-50' 
                  : result.endpoint.includes('Optimized')
                    ? 'border-green-200 bg-green-50'
                    : 'border-blue-200 bg-blue-50'
              }`}
            >
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-semibold text-gray-900">{result.endpoint}</h4>
                {!result.error && (
                  <span className={`px-2 py-1 rounded text-sm ${
                    result.duration < 1000 ? 'bg-green-100 text-green-800' :
                    result.duration < 3000 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {result.duration}ms
                  </span>
                )}
              </div>
              
              {result.error ? (
                <p className="text-red-600">{result.error}</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-600">Duration:</span>
                    <p className="text-gray-900">{result.duration}ms</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Clients:</span>
                    <p className="text-gray-900">{result.clientCount}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Data Source:</span>
                    <p className="text-gray-900">{result.dataSource}</p>
                  </div>
                  {/* FUM removed for performance optimization */}
                  {/* <div>
                    <span className="font-medium text-gray-600">Total FUM:</span>
                    <p className="text-gray-900">£{result.totalFum.toLocaleString()}</p>
                  </div> */}
                </div>
              )}
            </div>
          ))}
          
          {results.length === 2 && !results.some(r => r.error) && (
            <div className="p-4 bg-purple-50 border-2 border-purple-200 rounded-lg">
              <h4 className="font-semibold text-purple-900 mb-2">Performance Comparison</h4>
              {(() => {
                const [original, optimized] = results;
                const improvement = ((original.duration - optimized.duration) / original.duration * 100);
                const speedup = original.duration / optimized.duration;
                
                return (
                  <div className="space-y-2 text-sm">
                    <p>
                      <span className="font-medium">Speed Improvement:</span> {improvement.toFixed(1)}% faster
                    </p>
                    <p>
                      <span className="font-medium">Speed Multiplier:</span> {speedup.toFixed(1)}x faster
                    </p>
                    <p>
                      <span className="font-medium">Time Saved:</span> {(original.duration - optimized.duration)}ms per request
                    </p>
                    {improvement > 50 && (
                      <p className="text-green-700 font-medium">🎉 Excellent optimization! Over 50% improvement.</p>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}
      
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-semibold text-gray-900 mb-2">Expected Results</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• <strong>Original endpoint:</strong> 5-10 seconds (complex view with detailed calculations)</li>
          <li>• <strong>Ultra-minimal endpoint:</strong> Under 100ms (only 5 columns, no JOINs or calculations)</li>
          <li>• <strong>Expected improvement:</strong> 95-98% faster performance</li>
          <li>• <strong>Data changes:</strong> Only essential columns (Name, Type, Advisor, Status, ID)</li>
          <li>• <strong>Performance gain:</strong> Single table query with simple WHERE clause - maximum speed</li>
        </ul>
      </div>
    </div>
  );
};

export default ClientsOptimizationTest; 