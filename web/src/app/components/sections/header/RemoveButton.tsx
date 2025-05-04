"use client";

import React from "react";

interface RemoveButtonProps {
  onClick: (e: React.MouseEvent) => void;
  disabled?: boolean;
}

export function RemoveButton({ onClick, disabled = false }: RemoveButtonProps) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick(e);
      }}
      className={`p-1 rounded-md transition-all duration-200 ${
        disabled ? "opacity-50 cursor-not-allowed" : ""
      }`}
      aria-label="Remove"
      disabled={disabled}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-4 w-4 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 
                   hover:font-bold transition-colors duration-200"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={disabled ? 1.5 : 2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  );
}
