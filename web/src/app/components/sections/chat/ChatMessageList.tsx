"use client";

import React, { useRef, useEffect } from 'react';
import { useChat } from '../../../context/ChatContext';
import { useTheme } from '../../../context/ThemeContext';
import { ChatMessage } from './ChatMessage';
import { HeroSection } from '../hero/HeroSection';

export function ChatMessageList() {
  const { messages } = useChat();
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

  return (
    <div className="flex-1 p-4 overflow-hidden h-full w-full">
      {messages.length === 0 ? (
        <HeroSection />
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
