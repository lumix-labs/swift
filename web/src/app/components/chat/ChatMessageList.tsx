"use client"

import { useEffect, useRef } from 'react';
import { useChat } from '../../context/ChatContext';
import { ChatMessage } from './ChatMessage';

export function ChatMessageList() {
  const { messages } = useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.length === 0 ? (
        <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
          <div className="text-center space-y-3">
            <h3 className="text-xl font-semibold">Welcome to Swift</h3>
            <p>Ask any question about your code or repository.</p>
          </div>
        </div>
      ) : (
        messages.map((message, index) => (
          <ChatMessage key={index} message={message} />
        ))
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}
