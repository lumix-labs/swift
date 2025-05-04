"use client";

import React from "react";

interface InputControlsProps {
  isDisabled: boolean;
  isInputEmpty: boolean;
}

export function InputControls({ isDisabled, isInputEmpty }: InputControlsProps) {
  return (
    <button
      type="submit"
      aria-label="Send message"
      disabled={isDisabled || isInputEmpty}
      className="flex items-center justify-center w-11 h-11 bg-gray-900 text-white 
               rounded-lg border border-gray-300 dark:border-gray-700 shadow-sm 
               hover:bg-gray-800 dark:hover:bg-gray-700 focus:outline-none 
               focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-600 
               disabled:bg-gray-300 dark:disabled:bg-gray-800 disabled:text-gray-500 
               dark:disabled:text-gray-600 disabled:cursor-not-allowed align-middle 
               transition-colors"
    >
      {isDisabled ? (
        <div
          className="w-5 h-5 border-2 border-gray-300 dark:border-gray-600 
                    border-t-transparent rounded-full animate-spin"
        />
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path
            d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 
               009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 
               001.17-1.408l-7-14z"
          />
        </svg>
      )}
    </button>
  );
}
