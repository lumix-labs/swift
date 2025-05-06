"use client";

import React, { memo } from "react";

/**
 * Loading skeleton component to display while the page is mounting
 * or when data is loading initially
 */
export const LoadingSkeleton = memo(function LoadingSkeleton() {
  return (
    <div className="flex-1 p-4 overflow-y-auto">
      <div className="animate-pulse space-y-4 max-w-4xl mx-auto">
        <div className="h-10 bg-gray-200 dark:bg-gray-800 rounded-md w-3/4"></div>
        <div className="h-20 bg-gray-200 dark:bg-gray-800 rounded-md w-full"></div>
        <div className="h-16 bg-gray-200 dark:bg-gray-800 rounded-md w-5/6"></div>
      </div>
    </div>
  );
});
