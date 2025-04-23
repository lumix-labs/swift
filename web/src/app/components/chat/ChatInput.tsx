"use client"

import { useState, FormEvent } from 'react';
import { useChat } from '../../context/ChatContext';
import { chatService } from '../../lib/services/chat-service';

export function ChatInput() {
  const { addMessage } = useChat();
  const [message, setMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!message.trim() || isSubmitting) return;
    
    setIsSubmitting(true);
    const userMessage = { role: 'user' as const, content: message };
    
    // Add the user message to the chat
    addMessage(userMessage);
    setMessage('');
    
    try {
      // Get AI response
      const response = await chatService.sendMessage(message);
      
      // Add the AI response to the chat
      addMessage({
        role: 'assistant' as const,
        content: response
      });
    } catch (error) {
      // Handle error
      console.error('Error getting response:', error);
      
      // Add an error message
      addMessage({
        role: 'assistant' as const,
        content: 'Sorry, I encountered an error processing your request. Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form 
      onSubmit={handleSubmit} 
      className="flex items-end gap-2 p-4 border-t border-gray-200 dark:border-gray-800"
    >
      <div className="flex-1 relative">
        <textarea
          className="w-full p-3 pr-10 bg-gray-100 dark:bg-gray-800 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 h-10 min-h-10 max-h-32 overflow-auto"
          placeholder="Ask a question..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
          rows={1}
        />
      </div>
      <button
        type="submit"
        disabled={isSubmitting || !message.trim()}
        className="flex items-center justify-center w-10 h-10 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? (
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
          </svg>
        )}
      </button>
    </form>
  );
}
