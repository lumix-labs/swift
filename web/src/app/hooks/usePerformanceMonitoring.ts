"use client";

import { useEffect } from "react";

/**
 * Hook to set up performance monitoring for event listeners
 * This helps identify slow event handlers that might cause UI lag
 */
export function usePerformanceMonitoring() {
  useEffect(() => {
    // Store the original addEventListener
    const originalAddEventListener = window.addEventListener;

    // Define a type for the wrapped listener function
    type WrappedListener = (this: typeof window, event: Event) => unknown;

    // Override addEventListener with performance tracking
    window.addEventListener = function (
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | AddEventListenerOptions,
    ) {
      // Create a wrapped listener that tracks execution time
      const wrappedListener: WrappedListener = function (this: typeof window, event: Event) {
        const start = performance.now();

        // Call the original listener with the proper context
        const result =
          typeof listener === "function" ? listener.call(this, event) : listener.handleEvent.call(listener, event);

        const end = performance.now();
        const duration = end - start;

        if (duration > 100) {
          console.warn(`Event listener for '${type}' took ${duration.toFixed(2)}ms to execute`);
        }

        return result;
      };

      return originalAddEventListener.call(this, type, wrappedListener as EventListener, options);
    };

    // Cleanup function to restore original addEventListener
    return () => {
      window.addEventListener = originalAddEventListener;
    };
  }, []);
}
