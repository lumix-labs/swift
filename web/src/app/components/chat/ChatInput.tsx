"use client"

import { useState, FormEvent, useRef, useEffect } from 'react';
import { useChat } from '../../context/ChatContext';
import { chatService } from '../../lib/services/chat-service';
import { SuggestedPrompts } from './SuggestedPrompts';

export function ChatInput() {
  const { addMessage, setIsLoading, selectedModel } = useChat();
  const [message, setMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Adjust textarea height based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [message]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!message.trim() || isSubmitting) return;
    
    const userMessageContent = message.trim();
    setIsSubmitting(true);
    setIsLoading(true);
    
    // Clear input field immediately to improve user experience
    setMessage('');
    
    // Add the user message to the chat first - this ensures it's visible immediately
    addMessage({ 
      role: 'user' as const, 
      content: userMessageContent 
    });
    
    try {
      // Get AI response based on selected model
      const response = await chatService.sendMessage(userMessageContent, selectedModel);
      
      // Add the AI response to the chat
      addMessage({
        role: 'assistant' as const,
        content: response
      });
    } catch (error) {
      console.error('Error getting response:', error);
      
      // Add an error message
      addMessage({
        role: 'assistant' as const,
        content: 'Sorry, I encountered an error processing your request. Please try again.'
      });
    } finally {
      setIsSubmitting(false);
      setIsLoading(false);
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleSuggestedPrompt = (prompt: string) => {
    setMessage(prompt);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col">
      <SuggestedPrompts onSelectPrompt={handleSuggestedPrompt} />
      
      <form 
        onSubmit={handleSubmit} 
        className="flex items-end gap-2 w-full"
      >
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            className="w-full p-3 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white transition-all min-h-[44px] max-h-[150px] overflow-auto"
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
          className="flex items-center justify-center w-10 h-10 bg-black text-white rounded-lg hover:bg-gray-800 dark:hover:bg-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-600 disabled:bg-gray-300 dark:disabled:bg-gray-800 disabled:text-gray-500 dark:disabled:text-gray-600 disabled:cursor-not-allowed mb-0"
        >
          {isSubmitting ? (
            <div className="w-5 h-5 border-2 border-gray-300 dark:border-gray-600 border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
            </svg>
          )}
        </button>
      </form>
    </div>
  );
}
