"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { clearStorageAndRefreshState } from "../../lib/utils/storage";
import { handleStorageError } from "../../lib/utils/errorHandling";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary component that catches errors in child components
 * and handles storage-related errors appropriately
 */
export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);

    // Check if error is likely related to localStorage
    const errorString = error.toString().toLowerCase();
    const isStorageError =
      errorString.includes("localstorage") ||
      errorString.includes("storage") ||
      errorString.includes("quota") ||
      errorString.includes("corrupted") ||
      (errorString.includes("json") && errorString.includes("parse")) ||
      errorString.includes("serialized");

    if (isStorageError) {
      // Handle as storage error with automatic recovery
      handleStorageError(error, undefined, true);
    }
  }

  public render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        this.props.fallback || (
          <div className="flex flex-col items-center justify-center min-h-screen p-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
              <h2 className="text-xl font-semibold text-red-700 mb-2">Something went wrong</h2>
              <p className="text-gray-700 mb-4">
                We encountered an issue with your session data. The application will automatically recover by clearing
                stored data.
              </p>
              <button
                onClick={() => {
                  clearStorageAndRefreshState();
                }}
                className="py-2 px-4 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
              >
                Reset & Refresh
              </button>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

/**
 * HOC wrapper for ErrorBoundary
 * @param Component The component to wrap with error boundary
 * @returns Wrapped component with error handling
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode,
): React.FC<P> {
  const WithErrorBoundary: React.FC<P> = (props: P) => (
    <ErrorBoundary fallback={fallback}>
      <Component {...props} />
    </ErrorBoundary>
  );

  // Set display name for the HOC
  WithErrorBoundary.displayName = `WithErrorBoundary(${Component.displayName || Component.name || "Component"})`;

  return WithErrorBoundary;
}
