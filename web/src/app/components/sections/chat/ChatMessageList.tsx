"use client";

import React, { useRef, useEffect } from 'react';
import { useChat } from '../../../context/ChatContext';
import { useTheme } from '../../../context/ThemeContext';
import { ChatMessage } from './ChatMessage';
import { EmptyChatView } from './EmptyChatView';

export function ChatMessageList() {
  const { messages, addMessage } = useChat();
  const { resolvedTheme } = useTheme();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

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

  // Handle selecting a suggested prompt
  const handleSelectPrompt = (prompt: string) => {
    addMessage({
      role: 'user' as const,
      content: prompt
    });
  };

  return (
    <div className="flex-1 p-4 overflow-hidden h-full w-full">
      {messages.length === 0 ? (
        <EmptyChatView onSelectPrompt={handleSelectPrompt} />
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
