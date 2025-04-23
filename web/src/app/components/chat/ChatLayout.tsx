"use client"

import { useState, useEffect } from 'react';
import { Header } from '../ui/Header';
import { Footer } from '../ui/Footer';
import { ChatMessageList } from './ChatMessageList';
import { ChatInput } from './ChatInput';
import { useChat } from '../../context/ChatContext';
import { useDebounce } from '../../hooks/useDebounce';
import { Message } from '../../context/ChatContext';

export function ChatLayout() {
  const { isLoading, messages } = useChat();
  const [mounted, setMounted] = useState(false);
  const [displayMessages, setDisplayMessages] = useState<Message[]>([]);
  const debouncedLoading = useDebounce(isLoading, 300); // Debounce loading state to prevent flickering

  // Safely update display messages to prevent disappearing messages
  useEffect(() => {
    // Ensure that new messages are always added and don't disappear
    setDisplayMessages(messages);
  }, [messages]);

  // Safe mounting to avoid hydration issues
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex flex-col h-screen bg-white dark:bg-black text-black dark:text-white">
        <Header />
        <main className="flex-1 flex flex-col overflow-hidden relative">
          {/* Loading skeleton */}
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="animate-pulse space-y-4 max-w-4xl mx-auto">
              <div className="h-10 bg-gray-200 dark:bg-gray-800 rounded-md w-3/4"></div>
              <div className="h-20 bg-gray-200 dark:bg-gray-800 rounded-md w-full"></div>
              <div className="h-16 bg-gray-200 dark:bg-gray-800 rounded-md w-5/6"></div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-black text-black dark:text-white">
      <Header />
      
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <ChatMessageList messages={displayMessages} />
        
        {debouncedLoading && (
          <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 bg-gray-100 dark:bg-gray-800 rounded-full px-4 py-2 flex items-center space-x-2">
            <div className="w-3 h-3 bg-black dark:bg-white rounded-full animate-pulse"></div>
            <div className="w-3 h-3 bg-black dark:bg-white rounded-full animate-pulse delay-150"></div>
            <div className="w-3 h-3 bg-black dark:bg-white rounded-full animate-pulse delay-300"></div>
          </div>
        )}
        
        <div className="px-4 py-3 w-full border-t border-gray-200 dark:border-gray-800">
          <ChatInput />
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
