"use client";
import React from "react";

export interface ModelsDropdownProps {
  show: boolean;
  setShow: (show: boolean) => void;
  resolvedTheme: string;
}

export function ModelsDropdown({ show, setShow, resolvedTheme }: ModelsDropdownProps) {
  // Dummy model list for demonstration
  const models = ["gpt-4", "gpt-3.5", "custom-model"];
  
  // Toggle dropdown visibility
  const handleToggle = () => {
    setShow(show);
  };

  return (
    <div className="relative">
      <button
        className={`p-2 sm:px-3 sm:py-1.5 text-sm font-medium rounded-md ${resolvedTheme === 'dark' ? 'bg-white text-black' : 'bg-black text-white'}`}
        onClick={handleToggle}
      >
        <span className="hidden sm:inline">Models</span>
        <span className="sm:hidden">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
          </svg>
        </span>
      </button>
      {show && (
        <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-900 rounded-md shadow-lg z-10">
          {models.map((model, idx) => (
            <div key={idx} className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
              {model}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
