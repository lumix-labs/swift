"use client"

import { useState } from 'react';
import { ThemeToggle } from './ThemeToggle';
import { useChat } from '../../context/ChatContext';
import Image from 'next/image';

export function Header() {
  const { clearMessages } = useChat();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between px-4 h-14 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
      <div className="flex items-center space-x-2">
        <Image src="/swift-logo.svg" alt="Swift Logo" className="h-8 w-8" />
        <h1 className="font-semibold text-lg">Swift</h1>
      </div>
      
      <div className="flex items-center space-x-2">
        <ThemeToggle />
        
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </button>
          
          {menuOpen && (
            <div 
              className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 ring-1 ring-black ring-opacity-5 focus:outline-none"
              role="menu"
              aria-orientation="vertical"
              aria-labelledby="options-menu"
            >
              <button
                onClick={() => {
                  clearMessages();
                  setMenuOpen(false);
                }}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                role="menuitem"
              >
                New Chat
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
