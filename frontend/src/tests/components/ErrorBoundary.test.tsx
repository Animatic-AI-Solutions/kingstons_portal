/**
 * ErrorBoundary Component Tests (RED Phase)
 *
 * Tests for React Error Boundary that catches component errors
 * and displays fallback UI.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Test component that throws an error
const ThrowError: React.FC<{ shouldThrow?: boolean; errorMessage?: string }> = ({
  shouldThrow = true,
  errorMessage = 'Test error',
}) => {
  if (shouldThrow) {
    throw new Error(errorMessage);
  }
  return <div>No error</div>;
};

// Suppress console.error for cleaner test output
const originalError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalError;
});

describe('ErrorBoundary Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Error Catching', () => {
    it('should catch errors thrown by child components', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      // Should show error fallback UI
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });

    it('should display custom error message when provided', () => {
      const customMessage = 'Custom error occurred';

      render(
        <ErrorBoundary>
          <ThrowError errorMessage={customMessage} />
        </ErrorBoundary>
      );

      expect(screen.getByText(customMessage)).toBeInTheDocument();
    });

    it('should not affect rendering when no error occurs', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByText('No error')).toBeInTheDocument();
      expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument();
    });
  });

  describe('Fallback UI', () => {
    it('should show fallback UI when error is caught', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      // Should show error icon or visual indicator
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('should display error title', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });

    it('should display error details in development mode', () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      render(
        <ErrorBoundary>
          <ThrowError errorMessage="Detailed error message" />
        </ErrorBoundary>
      );

      expect(screen.getByText('Detailed error message')).toBeInTheDocument();

      process.env.NODE_ENV = originalNodeEnv;
    });

    it('should hide error details in production mode', () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      render(
        <ErrorBoundary>
          <ThrowError errorMessage="Detailed error message" />
        </ErrorBoundary>
      );

      // Should show generic message, not detailed error
      expect(screen.queryByText('Detailed error message')).not.toBeInTheDocument();
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();

      process.env.NODE_ENV = originalNodeEnv;
    });
  });

  describe('Try Again Button', () => {
    it('should show "Try Again" button in fallback UI', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });

    it('should reset error state when "Try Again" is clicked', () => {
      let shouldThrow = true;

      const DynamicError = () => {
        if (shouldThrow) {
          throw new Error('Test error');
        }
        return <div>Success after retry</div>;
      };

      const { rerender } = render(
        <ErrorBoundary>
          <DynamicError />
        </ErrorBoundary>
      );

      // Error should be shown
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();

      // Fix the error
      shouldThrow = false;

      // Click "Try Again"
      fireEvent.click(screen.getByRole('button', { name: /try again/i }));

      // Should attempt to re-render the component
      rerender(
        <ErrorBoundary>
          <DynamicError />
        </ErrorBoundary>
      );

      expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument();
    });
  });

  describe('Error State Reset', () => {
    it('should reset error state when component remounts', () => {
      const { unmount, rerender } = render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();

      unmount();

      rerender(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByText('No error')).toBeInTheDocument();
    });

    it('should clear error when children change', () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();

      // Render with different children
      rerender(
        <ErrorBoundary>
          <div>New content</div>
        </ErrorBoundary>
      );

      expect(screen.getByText('New content')).toBeInTheDocument();
    });
  });

  describe('Error Logging', () => {
    it('should log errors to console in development', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      render(
        <ErrorBoundary>
          <ThrowError errorMessage="Logged error" />
        </ErrorBoundary>
      );

      expect(consoleErrorSpy).toHaveBeenCalled();

      process.env.NODE_ENV = originalNodeEnv;
      consoleErrorSpy.mockRestore();
    });

    it('should call error reporting service if configured', () => {
      const mockErrorReporter = jest.fn();

      render(
        <ErrorBoundary onError={mockErrorReporter}>
          <ThrowError errorMessage="Reported error" />
        </ErrorBoundary>
      );

      expect(mockErrorReporter).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Reported error',
        }),
        expect.any(Object) // error info
      );
    });
  });

  describe('Component Isolation', () => {
    it('should not crash entire app when error is caught', () => {
      const SafeComponent = () => <div>Safe component still works</div>;

      render(
        <div>
          <ErrorBoundary>
            <ThrowError />
          </ErrorBoundary>
          <SafeComponent />
        </div>
      );

      // Error boundary shows fallback
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();

      // Other components still render
      expect(screen.getByText('Safe component still works')).toBeInTheDocument();
    });

    it('should allow multiple error boundaries', () => {
      render(
        <div>
          <ErrorBoundary>
            <ThrowError errorMessage="Error 1" />
          </ErrorBoundary>
          <ErrorBoundary>
            <ThrowError errorMessage="Error 2" />
          </ErrorBoundary>
        </div>
      );

      // Both error boundaries should catch their respective errors
      expect(screen.getAllByText(/something went wrong/i)).toHaveLength(2);
    });

    it('should isolate errors to nearest boundary', () => {
      render(
        <ErrorBoundary>
          <div>
            <div>Outer content</div>
            <ErrorBoundary>
              <ThrowError />
            </ErrorBoundary>
          </div>
        </ErrorBoundary>
      );

      // Inner boundary catches error
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();

      // Outer content still renders
      expect(screen.getByText('Outer content')).toBeInTheDocument();
    });
  });

  describe('Custom Fallback', () => {
    it('should support custom fallback UI', () => {
      const CustomFallback = ({ error }: { error: Error }) => (
        <div>Custom error: {error.message}</div>
      );

      render(
        <ErrorBoundary fallback={CustomFallback}>
          <ThrowError errorMessage="Custom handled error" />
        </ErrorBoundary>
      );

      expect(screen.getByText('Custom error: Custom handled error')).toBeInTheDocument();
    });

    it('should pass error and errorInfo to custom fallback', () => {
      const CustomFallback = ({ error, errorInfo }: any) => (
        <div>
          <div>{error.message}</div>
          <div>{errorInfo ? 'Has error info' : 'No error info'}</div>
        </div>
      );

      render(
        <ErrorBoundary fallback={CustomFallback}>
          <ThrowError errorMessage="Test" />
        </ErrorBoundary>
      );

      expect(screen.getByText('Test')).toBeInTheDocument();
      expect(screen.getByText('Has error info')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle errors in componentDidMount', () => {
      class MountError extends React.Component {
        componentDidMount() {
          throw new Error('Mount error');
        }

        render() {
          return <div>Should not render</div>;
        }
      }

      render(
        <ErrorBoundary>
          <MountError />
        </ErrorBoundary>
      );

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });

    it('should handle errors in event handlers', () => {
      const EventError = () => {
        const handleClick = () => {
          throw new Error('Event handler error');
        };

        return <button onClick={handleClick}>Click to error</button>;
      };

      render(
        <ErrorBoundary>
          <EventError />
        </ErrorBoundary>
      );

      // Error boundaries don't catch event handler errors
      // This is a known React limitation
      expect(screen.getByText('Click to error')).toBeInTheDocument();
    });

    it('should handle null children', () => {
      render(<ErrorBoundary>{null}</ErrorBoundary>);

      // Should render nothing, no error
      expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument();
    });

    it('should handle undefined children', () => {
      render(<ErrorBoundary>{undefined}</ErrorBoundary>);

      // Should render nothing, no error
      expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument();
    });
  });
});
