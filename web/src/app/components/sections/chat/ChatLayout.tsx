"use client";

import React, { useState, useEffect } from "react";
import { Header } from "../header/Header";
import { Footer } from "../footer/Footer";
import { ChatMessageList } from "./ChatMessageList";
import { ChatInput } from "./ChatInput";
import { useChat } from "../../../context/ChatContext";
import { useDebounce } from "../../../hooks/useDebounce";
import { DebugSwitch } from "../shared/DebugSwitch";
import { toggleDebugMode } from "../../../lib/utils/debugMode";
import { ErrorBoundary } from "../../shared/ErrorBoundary";
import { LoadingIndicator } from "./LoadingIndicator";
import { LoadingSkeleton } from "./LoadingSkeleton";
import { usePerformanceMonitoring } from "../../../hooks/usePerformanceMonitoring";

/**
 * Main chat layout component that coordinates the different parts of the chat UI
 * Refactored to use smaller, dedicated components and optimize rendering
 */
export function ChatLayout() {
  const { isLoading, messages } = useChat();
  const [mounted, setMounted] = useState(false);

  // Ensure messages is always an array
  const safeMessages = Array.isArray(messages) ? messages : [];

  // Debounce loading state to prevent flickering UI
  const debouncedLoading = useDebounce(isLoading, 500);
  const debouncedMessages = useDebounce(safeMessages, 300);

  // Handle debug mode changes
  const handleDebugChange = (enabled: boolean) => {
    toggleDebugMode(enabled);
  };

  // Set up performance monitoring for event listeners
  usePerformanceMonitoring();

  // Safe mounting to avoid hydration issues
  useEffect(() => {
    setMounted(true);
  }, []);

  // Show loading skeleton during initial mount
  if (!mounted) {
    return (
      <div className="flex flex-col h-screen bg-white dark:bg-black text-black dark:text-white">
        <Header />
        <main className="flex-1 flex flex-col overflow-hidden relative">
          <LoadingSkeleton />
        </main>
        <Footer />
      </div>
    );
  }

  try {
    return (
      <ErrorBoundary>
        <div className="flex flex-col h-screen bg-white dark:bg-black text-black dark:text-white">
          <Header />

          <main className="flex-1 flex flex-col overflow-hidden relative max-w-4xl mx-auto w-full">
            <ChatMessageList messages={debouncedMessages} />
            <LoadingIndicator isLoading={debouncedLoading} />

            <div className="px-4 py-3 w-full border-t border-gray-200 dark:border-gray-800">
              <ChatInput />
            </div>
          </main>

          <Footer />

          {/* Debug mode toggle */}
          <DebugSwitch onChange={handleDebugChange} />
        </div>
      </ErrorBoundary>
    );
  } catch (error) {
    console.error("Error in ChatLayout:", error);
    return (
      <div className="flex flex-col h-screen bg-white dark:bg-black text-black dark:text-white items-center justify-center">
        <div className="p-6 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-600 dark:text-red-400">
          <h2 className="text-lg font-medium mb-2">Chat Layout Error</h2>
          <p className="text-sm">There was an error loading the chat interface. Please refresh the page.</p>
        </div>
      </div>
    );
  }
}
