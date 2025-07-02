/**
 * ReportErrorBoundary - Error boundary for report components
 * Phase 3: Optimization and Finalization - Error Handling
 * 
 * This component provides graceful error handling for the report system:
 * - Catches JavaScript errors anywhere in the report component tree
 * - Provides fallback UI with recovery options
 * - Logs errors for debugging and monitoring
 * - Follows accessibility guidelines for error states
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ReportErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error for debugging and monitoring
    console.error('Report Error Boundary caught an error:', error, errorInfo);
    
    // Update state with error details
    this.setState({
      error,
      errorInfo
    });

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // TODO: In production, send error to monitoring service
    // Example: Sentry.captureException(error, { contexts: { errorInfo } });
  }

  private handleRetry = () => {
    // Reset error state to retry rendering
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  private handleReloadPage = () => {
    // Reload the entire page as a last resort
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      // Custom fallback UI can be provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI with recovery options
      return (
        <div 
          className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8"
          role="alert"
          aria-live="assertive"
        >
          <div className="sm:mx-auto sm:w-full sm:max-w-md">
            <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
              <div className="text-center">
                <ExclamationTriangleIcon 
                  className="mx-auto h-12 w-12 text-red-600" 
                  aria-hidden="true"
                />
                <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
                  Report Error
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600">
                  Something went wrong while displaying your report.
                </p>
              </div>

              <div className="mt-6">
                <div className="space-y-4">
                  {/* Primary action - Retry */}
                  <button
                    type="button"
                    onClick={this.handleRetry}
                    className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
                    aria-describedby="retry-description"
                  >
                    <ArrowPathIcon className="h-5 w-5 mr-2" aria-hidden="true" />
                    Try Again
                  </button>
                  
                  {/* Secondary action - Reload page */}
                  <button
                    type="button"
                    onClick={this.handleReloadPage}
                    className="w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
                  >
                    Reload Page
                  </button>
                </div>

                {/* Error details for development */}
                {process.env.NODE_ENV === 'development' && this.state.error && (
                  <details className="mt-6 p-4 bg-gray-100 rounded-md">
                    <summary className="cursor-pointer text-sm font-medium text-gray-900">
                      Error Details (Development Only)
                    </summary>
                    <div className="mt-2 text-xs text-gray-700 font-mono overflow-auto">
                      <p className="font-semibold text-red-600 mb-2">
                        {this.state.error.name}: {this.state.error.message}
                      </p>
                      <pre className="whitespace-pre-wrap break-all">
                        {this.state.error.stack}
                      </pre>
                      {this.state.errorInfo && (
                        <>
                          <p className="font-semibold text-red-600 mt-4 mb-2">
                            Component Stack:
                          </p>
                          <pre className="whitespace-pre-wrap break-all">
                            {this.state.errorInfo.componentStack}
                          </pre>
                        </>
                      )}
                    </div>
                  </details>
                )}

                {/* Help text */}
                <div className="mt-6 text-center">
                  <p 
                    className="text-xs text-gray-500"
                    id="retry-description"
                  >
                    If this problem persists, please contact support with the error details above.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ReportErrorBoundary; 