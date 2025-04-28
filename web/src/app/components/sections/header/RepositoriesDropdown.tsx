"use client";
import React from "react";

export interface RepositoriesDropdownProps {
  show: boolean;
  setShow: (show: boolean) => void;
  resolvedTheme: string;
}

export function RepositoriesDropdown({ show, setShow, resolvedTheme }: RepositoriesDropdownProps) {
  // Dummy repo list for demonstration
  const repos = ["repo-1", "repo-2", "repo-3"];
  
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
        <span className="hidden sm:inline">Repositories</span>
        <span className="sm:hidden">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
        </span>
      </button>
      {show && (
        <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-900 rounded-md shadow-lg z-10">
          {repos.map((repo, idx) => (
            <div key={idx} className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
              {repo}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
