"use client";

import React, { useState, useEffect, useCallback } from "react";
import { toggleDebugMode, getDebugModeState } from "../../../lib/utils/debugMode";

interface DebugSwitchProps {
  onChange?: (enabled: boolean) => void;
}

export function DebugSwitch({ onChange }: DebugSwitchProps) {
  const [debugEnabled, setDebugEnabled] = useState(false);
  const [visible, setVisible] = useState(false);

  // Toggle debug mode - wrap in useCallback to avoid dependency changes
  const toggleDebug = useCallback(() => {
    setDebugEnabled(prevState => {
      const newState = !prevState;
      
      // Update the debug mode state and dispatch event
      toggleDebugMode(newState);
      
      // Call the onChange handler if provided
      if (onChange) {
        onChange(newState);
      }
      
      return newState;
    });
  }, [onChange]);

  // Load debug state from localStorage on mount
  useEffect(() => {
    // Get current debug state
    const currentDebugState = getDebugModeState();
    setDebugEnabled(currentDebugState);

    // Call the onChange handler if provided
    if (onChange) {
      onChange(currentDebugState);
    }

    // Check for debug flag in URL
    if (window.location.search.includes("debug=true")) {
      setVisible(true);
    }

    // Setup keyboard shortcut to toggle debug mode (Cmd+Shift+D or Ctrl+Shift+D)
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for cmd+shift+D (Mac) or ctrl+shift+D (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === "d" || e.key === "D")) {
        e.preventDefault();
        // Toggle visibility and debug state
        setVisible(true); // Always show the debug switch when using the shortcut
        toggleDebug(); // Toggle the debug state
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onChange, toggleDebug]);

  if (!visible) {
    return null;
  }

  return (
    <div className="fixed bottom-2 right-2 z-50 bg-gray-100 dark:bg-gray-800 rounded-md p-2 shadow-md text-sm opacity-70 hover:opacity-100 transition-opacity">
      <label className="flex items-center cursor-pointer">
        <div className="mr-2 text-xs font-mono">Debug</div>
        <div className="relative">
          <input type="checkbox" className="sr-only" checked={debugEnabled} onChange={toggleDebug} />
          <div 
            className={`block w-10 h-6 rounded-full ${
              debugEnabled ? "bg-green-500" : "bg-gray-400"
            }`}
          ></div>
          <div
            className={`absolute left-1 top-1 w-4 h-4 rounded-full transition-transform duration-200 
              ease-in-out bg-white ${debugEnabled ? "transform translate-x-4" : ""}`}
          ></div>
        </div>
      </label>
    </div>
  );
}
