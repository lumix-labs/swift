"use client";
import React from "react";

export interface CommonDropdownProps {
  label: string;
  options: string[];
  onSelect: (option: string) => void;
}

export function CommonDropdown({ label, options, onSelect }: CommonDropdownProps) {
  return (
    <div className="relative inline-block text-left">
      <button className="inline-flex justify-center w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none">
        {label}
      </button>
      <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
        <div className="py-1">
          {options.map((option, idx) => (
            <button
              key={idx}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
              onClick={() => onSelect(option)}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
