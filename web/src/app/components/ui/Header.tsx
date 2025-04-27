"use client"

import { ModelSelector } from './ModelSelector';
import Link from 'next/link';
import { useChat } from '../../context/ChatContext';
import { ThemeToggle } from './ThemeToggle';

export function Header() {
  const { createNewSession, setSelectedModel } = useChat();

  const handleNewChat = () => {
    createNewSession();
  };

  const handleSelectModel = (modelId: string) => {
    setSelectedModel(modelId);
  };

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between px-4 h-14 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
      <div className="flex items-center space-x-2">
        <Link href="/" onClick={() => window.location.reload()}>
          <div className="flex items-center space-x-2 cursor-pointer">
            <div>
  <h1 className="font-semibold text-lg flex items-center">{`⚡ Swift`}</h1>
  <p className="text-xs font-medium leading-tight -mt-1">by Lumix Labs</p>
</div>
          </div>
        </Link>
      </div>

      <div className="flex items-center space-x-2">
        <a
          href="https://calendly.com/karoriwal/swift"
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 sm:px-3 sm:py-1.5 text-sm bg-black text-white dark:bg-white dark:text-black rounded-md font-medium hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
          aria-label="Book a Demo"
        >
          <span className="hidden sm:inline">Book a Demo</span>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:hidden" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
          </svg>
        </a>
        <a
          href="https://docs.google.com/presentation/d/1i3VbI0HzMQcodzJs8n_66absswe0SxkKM0BaPPBFJHA/edit?usp=sharing"
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 sm:px-3 sm:py-1.5 text-sm bg-gray-800 text-white dark:bg-gray-100 dark:text-black rounded-md font-medium hover:bg-gray-900 dark:hover:bg-gray-200 transition-colors flex items-center space-x-1"
          aria-label="Investors Pitch Deck"
        >
          <span className="hidden sm:inline">Investors Pitch Deck</span>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m4 0h1v4h1M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </a>
        <div className="hidden sm:block">
          <ModelSelector onSelectModel={handleSelectModel} />
        </div>
        <button
          onClick={handleNewChat}
          className="p-2 sm:flex sm:items-center sm:space-x-1 sm:px-3 sm:py-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none"
          aria-label="New Chat"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-4 sm:w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          <span className="hidden sm:inline text-sm font-medium">New Chat</span>
        </button>
        <ThemeToggle />
      </div>
    </header>
  );
}
