"use client"
import { useState, FormEvent, KeyboardEvent, useRef, useEffect } from 'react';
import { useChat } from '@/app/context/ChatContext';
import { chatService } from '@/app/lib/services/chat-service';

export function ChatInput() {
  const [input, setInput] = useState('');
  const { addMessage, isLoading, setIsLoading } = useChat();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  const handleSubmit = async (e?: FormEvent) => {
    e?.preventDefault();
    
    if (!input.trim() || isLoading) return;
    
    // Add user message to the chat
    addMessage({ role: 'user', content: input });
    setInput('');
    
    // Set loading state and get assistant response
    setIsLoading(true);
    try {
      const response = await chatService.sendMessage(input);
      addMessage({ role: 'assistant', content: response });
    } catch (error) {
      console.error('Error getting response:', error);
      addMessage({ 
        role: 'assistant', 
        content: 'Sorry, I encountered an error processing your request.' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <form 
      onSubmit={handleSubmit} 
      className="w-full max-w-3xl bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm focus-within:ring-1 focus-within:ring-black dark:focus-within:ring-white"
    >
      <div className="flex items-end">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything..."
          rows={1}
          className="w-full resize-none bg-transparent px-4 py-3 max-h-[200px] focus:outline-none placeholder:text-gray-500 dark:placeholder:text-gray-400 font-sans text-sm md:text-base"
          disabled={isLoading}
        />
        <div className="flex px-3 py-2">
          {/* File attachment button - just UI for now */}
          <button
            type="button"
            className="p-1 rounded-md text-gray-500 hover:text-black dark:hover:text-white"
            disabled={isLoading}
            aria-label="Attach file"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="20" 
              height="20" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
            </svg>
          </button>
          
          {/* Send button */}
          <button
            type="submit"
            className={`p-1 rounded-md ml-1 ${input.trim() && !isLoading 
              ? 'text-black dark:text-white' 
              : 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
            }`}
            disabled={!input.trim() || isLoading}
            aria-label="Send message"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="20" 
              height="20" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>
      
      {/* Tools toolbar - placeholder for future features */}
      <div className="flex items-center px-3 py-2 border-t border-gray-200 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400">
        <span>Tools will be implemented in future updates</span>
      </div>
    </form>
  );
}