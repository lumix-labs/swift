"use client"

import * as React from 'react';
import { useRef, useEffect, useMemo } from 'react';
import { ChatMessage } from './ChatMessage';
import { Message } from '../../context/ChatContext';
import { useTheme } from '../../context/ThemeContext';

interface ChatMessageListProps {
  messages: Message[];
}

export function ChatMessageList({ messages }: ChatMessageListProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  
  // Scroll to bottom when new messages are added
  useEffect(() => {
    if (scrollContainerRef.current && messages.length > 0) {
      const scrollContainer = scrollContainerRef.current;
      // Use requestAnimationFrame to ensure DOM has updated before scrolling
      requestAnimationFrame(() => {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      });
    }
  }, [messages]);

  // Memoize the empty state to prevent unnecessary re-renders
  const EmptyState = useMemo(() => (
    <div className="flex items-center justify-center h-full">
      <div className="text-center max-w-md mx-auto">
        <h2 className="text-2xl font-bold mb-2">Enterprise Intelligence Hub</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Swift transforms your technology assets into strategic business advantages. Make faster executive decisions with AI-powered insights.
        </p>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <h3 className="font-medium mb-1">Strategic Planning</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Align technology initiatives with core business objectives
            </p>
          </div>
          <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <h3 className="font-medium mb-1">Risk Management</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Identify technical vulnerabilities and compliance concerns
            </p>
          </div>
          <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <h3 className="font-medium mb-1">Digital Transformation</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Accelerate innovation and modernization initiatives
            </p>
          </div>
          <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <h3 className="font-medium mb-1">Resource Optimization</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Maximize ROI on technology investments and talent
            </p>
          </div>
        </div>
      </div>
    </div>
  ), []);

  return (
    <div className="flex-1 p-4 overflow-hidden h-full w-full">
      {messages.length === 0 ? (
        EmptyState
      ) : (
        <div 
          ref={scrollContainerRef}
          className={`max-w-4xl mx-auto h-full overflow-y-auto scrollbar-${resolvedTheme}`}
          style={{ overflowX: 'hidden' }}
        >
          {messages.map((message, index) => (
            <div key={index} className="py-2">
              <ChatMessage message={message} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}