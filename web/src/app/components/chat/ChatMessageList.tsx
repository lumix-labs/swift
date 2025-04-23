"use client"
import { useEffect, useRef } from 'react';
import { useChat } from 'src/app/context/ChatContext';
import { ChatMessage } from './ChatMessage';

export function ChatMessageList() {
  const { messages, isLoading } = useChat();
  const bottomRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Welcome message when no messages
  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-4 text-center">
        <h1 className="text-4xl font-bold mb-6">What can I help with?</h1>
        <div className="grid grid-cols-2 gap-3 max-w-lg mb-8">
          {['Summarize text', 'Analyze data', 'Make a plan', 'Brainstorm', 'Help me write'].map((prompt) => (
            <button
              key={prompt}
              className="py-2 px-4 border border-gray-200 dark:border-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors text-sm"
            >
              {prompt}
            </button>
          ))}
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md">
          Conversations will not be saved to history at this time.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="flex flex-col space-y-6 max-w-3xl mx-auto">
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}
        
        {/* Loading indicator */}
        {isLoading && (
          <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
            <div className="animate-pulse flex space-x-1">
              <div className="h-2 w-2 bg-gray-400 dark:bg-gray-600 rounded-full"></div>
              <div className="h-2 w-2 bg-gray-400 dark:bg-gray-600 rounded-full animation-delay-200"></div>
              <div className="h-2 w-2 bg-gray-400 dark:bg-gray-600 rounded-full animation-delay-400"></div>
            </div>
            <span className="text-sm">Thinking...</span>
          </div>
        )}
        
        {/* Auto-scroll anchor */}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
