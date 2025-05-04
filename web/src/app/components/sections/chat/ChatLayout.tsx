"use client"

import React, { useState, useEffect, useMemo, Component, ErrorInfo, ReactNode } from 'react';
import { Header } from '../header/Header';
import { Footer } from '../footer/Footer';
import { ChatMessageList } from './ChatMessageList';
import { ChatInput } from './ChatInput';
import { useChat } from '../../../context/ChatContext';
import { useDebounce } from '../../../hooks/useDebounce';

// Error boundary to catch and handle errors in the chat components
class ChatErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught error:', error);
    console.error('Component stack:', info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col h-screen items-center justify-center bg-white dark:bg-black text-black dark:text-white">
          <h1 className="text-2xl font-bold mb-2">Something went wrong.</h1>
          <p className="mb-4">Please refresh the page or try again later.</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-800 rounded-md hover:bg-gray-300 dark:hover:bg-gray-700"
          >
            Refresh Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export function ChatLayout() {
  const { isLoading, messages } = useChat();
  const [mounted, setMounted] = useState(false);

  // Debounce loading state to prevent flickering UI
  const debouncedLoading = useDebounce(isLoading, 500);
  const debouncedMessages = useDebounce(messages, 300);

  // Safe mounting to avoid hydration issues
  useEffect(() => {
    setMounted(true);

    // Add performance monitoring to track long-running handlers
    const originalAddEventListener = window.addEventListener;
    
    // Define a type for the wrapped listener function
    type WrappedListener = (this: typeof window, event: Event) => unknown;
    
    // Override addEventListener with performance tracking
    window.addEventListener = function (type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) {
      // Create a wrapped listener that tracks execution time
      const wrappedListener: WrappedListener = function(this: typeof window, event: Event) {
        const start = performance.now();
        
        // Call the original listener with the proper context
        const result = typeof listener === 'function'
          ? listener.call(this, event)
          : listener.handleEvent.call(listener, event);
          
        const end = performance.now();
        const duration = end - start;
        
        if (duration > 100) {
          console.warn(`Event listener for '${type}' took ${duration.toFixed(2)}ms to execute`);
        }

        return result;
      };

      return originalAddEventListener.call(this, type, wrappedListener as EventListener, options);
    };

    return () => {
      // Restore original addEventListener
      window.addEventListener = originalAddEventListener;
    };
  }, []);

  // Determine if we're in an active chat session
  const hasMessages = debouncedMessages.length > 0;

  // Memoize the loading indicator to prevent unnecessary re-renders
  const loadingIndicator = useMemo(() =>
    debouncedLoading && (
      <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 bg-gray-100 dark:bg-gray-800 rounded-full px-4 py-2 flex items-center space-x-2">
        <div className="w-3 h-3 bg-black dark:bg-white rounded-full animate-pulse"></div>
        <div className="w-3 h-3 bg-black dark:bg-white rounded-full animate-pulse delay-150"></div>
        <div className="w-3 h-3 bg-black dark:bg-white rounded-full animate-pulse delay-300"></div>
      </div>
    ), [debouncedLoading]);

  // Memoize the skeleton loading state to prevent re-renders
  const loadingSkeleton = useMemo(() => (
    <div className="flex-1 p-4 overflow-y-auto">
      <div className="animate-pulse space-y-4 max-w-4xl mx-auto">
        <div className="h-10 bg-gray-200 dark:bg-gray-800 rounded-md w-3/4"></div>
        <div className="h-20 bg-gray-200 dark:bg-gray-800 rounded-md w-full"></div>
        <div className="h-16 bg-gray-200 dark:bg-gray-800 rounded-md w-5/6"></div>
      </div>
    </div>
  ), []);

  if (!mounted) {
    return (
      <div className="flex flex-col h-screen bg-white dark:bg-black text-black dark:text-white">
        <Header />
        <main className="flex-1 flex flex-col overflow-hidden relative">
          {loadingSkeleton}
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <ChatErrorBoundary>
      <div className="flex flex-col h-screen bg-white dark:bg-black text-black dark:text-white">
        <Header />

        <main className="flex-1 flex flex-col overflow-hidden relative">
          <ChatMessageList />
          {loadingIndicator}

          <div className="px-4 py-3 w-full border-t border-gray-200 dark:border-gray-800">
            <ChatInput />
          </div>
        </main>

        <Footer />
      </div>
    </ChatErrorBoundary>
  );
}
