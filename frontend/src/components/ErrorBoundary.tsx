/**
 * ErrorBoundary Component
 *
 * React error boundary that catches JavaScript errors in child components,
 * logs errors, and displays fallback UI instead of crashing the entire app.
 *
 * Usage:
 * <ErrorBoundary>
 *   <MyComponent />
 * </ErrorBoundary>
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: React.ComponentType<{ error: Error; errorInfo: ErrorInfo | null }>;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so next render shows fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Store error info in state
    this.setState({
      errorInfo,
    });
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    // Reset error state when children change
    if (this.state.hasError && prevProps.children !== this.props.children) {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
      });
    }
  }

  handleReset = (): void => {
    // Reset error state when "Try Again" is clicked
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      const { fallback: CustomFallback } = this.props;
      const { error, errorInfo } = this.state;

      // Use custom fallback if provided
      if (CustomFallback && error) {
        return <CustomFallback error={error} errorInfo={errorInfo} />;
      }

      // Default fallback UI
      return (
        <div
          role="alert"
          style={{
            padding: '20px',
            margin: '20px',
            border: '1px solid #ef4444',
            borderRadius: '8px',
            backgroundColor: '#fef2f2',
          }}
        >
          <h2 style={{ color: '#dc2626', marginTop: 0 }}>Something went wrong</h2>

          {/* Show error message in development/test mode, hide in production */}
          {process.env.NODE_ENV !== 'production' && error && (
            <div style={{ marginTop: '16px', marginBottom: '16px' }}>
              <p style={{ fontFamily: 'monospace', color: '#7f1d1d', margin: '8px 0' }}>
                {error.message}
              </p>
            </div>
          )}

          {/* Try Again button */}
          <button
            onClick={this.handleReset}
            style={{
              padding: '8px 16px',
              backgroundColor: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
