import Image from 'next/image';
import Link from 'next/link';
import { ThemeToggle } from './ThemeToggle';
import { useChat } from 'src/app/context/ChatContext';

export function Header() {
  const { clearMessages } = useChat();
  
  const handleNewChat = () => {
    clearMessages();
  };
  
  return (
    <header className="w-full border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-black/80 backdrop-blur-sm sticky top-0 z-10">
      <div className="flex items-center justify-between h-16 px-4 max-w-7xl mx-auto">
        {/* Logo and name */}
        <div className="flex items-center space-x-4">
          <Link href="/" className="flex items-center space-x-2">
            <Image 
              src="/swift-logo.svg" 
              alt="Swift Logo" 
              width={30} 
              height={30}
              className="dark:invert" 
            />
            <span className="font-semibold text-lg hidden sm:inline-block">Swift</span>
          </Link>
          
          {/* New chat button */}
          <button
            onClick={handleNewChat}
            className="inline-flex items-center space-x-1 px-3 py-1.5 text-sm rounded-md hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>New chat</span>
          </button>
        </div>
        
        {/* Right side controls */}
        <div className="flex items-center space-x-2">
          {/* Model selector - placeholder for future implementation */}
          <div className="hidden md:block">
            <select
              className="bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
              defaultValue="default"
            >
              <option value="default">Default model</option>
              <option disabled>More models coming soon</option>
            </select>
          </div>
          
          {/* Theme toggle */}
          <ThemeToggle />
          
          {/* Auth buttons - placeholders for future implementation */}
          <div className="hidden md:flex items-center space-x-2">
            <button className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-800 rounded-md hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors">
              Log in
            </button>
            <button className="px-3 py-1.5 text-sm bg-black dark:bg-white text-white dark:text-black rounded-md hover:opacity-90 transition-opacity">
              Sign up
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
