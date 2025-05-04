"use client";

import React, { useState, useEffect } from "react";

interface DebugSwitchProps {
  onChange?: (enabled: boolean) => void;
}

export function DebugSwitch({ onChange }: DebugSwitchProps) {
  const [debugEnabled, setDebugEnabled] = useState(false);
  const [visible, setVisible] = useState(false);

  // Toggle debug mode
  const toggleDebug = () => {
    const newState = !debugEnabled;
    setDebugEnabled(newState);
    if (onChange) {
      onChange(newState);
    }
    
    // Save preference to localStorage
    try {
      localStorage.setItem('swift_debug_mode', newState ? 'true' : 'false');
    } catch (error) {
      console.error('Failed to save debug preference:', error);
    }
  };

  // Load debug state from localStorage on mount
  useEffect(() => {
    try {
      const savedState = localStorage.getItem('swift_debug_mode');
      if (savedState) {
        const isEnabled = savedState === 'true';
        setDebugEnabled(isEnabled);
        if (onChange) {
          onChange(isEnabled);
        }
      }
    } catch (error) {
      console.error('Failed to load debug preference:', error);
    }
    
    // Check for debug flag
    if (window.location.search.includes('debug=true')) {
      setVisible(true);
    }

    // Setup keyboard shortcut to toggle visibility (Ctrl+Shift+D)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        setVisible(prevVisible => !prevVisible);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onChange]);

  if (!visible) return null;

  return (
    <div className="fixed bottom-2 right-2 z-50 bg-gray-100 dark:bg-gray-800 rounded-md p-2 shadow-md text-sm opacity-70 hover:opacity-100 transition-opacity">
      <label className="flex items-center cursor-pointer">
        <div className="mr-2 text-xs font-mono">Debug</div>
        <div className="relative">
          <input 
            type="checkbox" 
            className="sr-only" 
            checked={debugEnabled} 
            onChange={toggleDebug} 
          />
          <div className={`block w-10 h-6 rounded-full ${debugEnabled ? 'bg-green-500' : 'bg-gray-400'}`}></div>
          <div className={`absolute left-1 top-1 w-4 h-4 rounded-full transition-transform duration-200 ease-in-out bg-white ${debugEnabled ? 'transform translate-x-4' : ''}`}></div>
        </div>
      </label>
    </div>
  );
}
