"use client";

import React, { memo } from "react";

interface LoadingIndicatorProps {
  isLoading: boolean;
}

/**
 * Loading indicator component that shows a pulsing animation
 * when the chat is waiting for a response
 */
export const LoadingIndicator = memo(function LoadingIndicator({ isLoading }: LoadingIndicatorProps) {
  if (!isLoading) {
    return null;
  }

  return (
    <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 bg-gray-100 dark:bg-gray-800 rounded-full px-4 py-2 flex items-center space-x-2">
      <div className="w-3 h-3 bg-black dark:bg-white rounded-full animate-pulse"></div>
      <div className="w-3 h-3 bg-black dark:bg-white rounded-full animate-pulse delay-150"></div>
      <div className="w-3 h-3 bg-black dark:bg-white rounded-full animate-pulse delay-300"></div>
    </div>
  );
});
