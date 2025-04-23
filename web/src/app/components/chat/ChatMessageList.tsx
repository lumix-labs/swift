"use client"

import { useRef, useEffect } from 'react';
import { ChatMessage } from './ChatMessage';
import { Message } from '../../context/ChatContext';

interface ChatMessageListProps {
  messages: Message[];
}

export function ChatMessageList({ messages }: ChatMessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when new messages are added
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  return (
    <div className="flex-1 p-4 overflow-y-auto">
      {messages.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-center max-w-md mx-auto">
            <h2 className="text-2xl font-bold mb-2">Welcome to Swift</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Swift lets you talk to your codebase. Connect your repository and start asking questions about your code.
            </p>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <h3 className="font-medium mb-1">Ask questions</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Ask about code structure, functionality, or dependencies
                </p>
              </div>
              <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <h3 className="font-medium mb-1">Generate code</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Get help writing new functions or refactoring existing ones
                </p>
              </div>
              <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <h3 className="font-medium mb-1">Debug issues</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Get help finding and fixing bugs in your code
                </p>
              </div>
              <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <h3 className="font-medium mb-1">Learn best practices</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Discover ways to improve your code quality
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto space-y-6">
          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}
          <div ref={messagesEndRef} />
        </div>
      )}
    </div>
  );
}
