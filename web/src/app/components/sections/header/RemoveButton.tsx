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
      className={`p-1.5 rounded-full hover:bg-red-100 dark:hover:bg-red-900 
                 group transition-all duration-200 ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      aria-label="Remove"
      disabled={disabled}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-4 w-4 text-gray-500 dark:text-gray-400 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors duration-200"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  );
}
