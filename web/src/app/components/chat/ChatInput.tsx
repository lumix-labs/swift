"use client"

import { useState, FormEvent, useRef, useEffect, useCallback, memo } from 'react';
import { useChat } from '../../context/ChatContext';
import { chatService } from '../../lib/services/chat-service';
import { SuggestedPrompts } from './SuggestedPrompts';

// Memoize SuggestedPrompts to prevent unnecessary re-renders
const MemoizedSuggestedPrompts = memo(SuggestedPrompts);

export function ChatInput() {
  const { addMessage, setIsLoading, selectedModel, messages } = useChat();
  const [message, setMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [lastMessage, setLastMessage] = useState<string>('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Adjust textarea height based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.min(textareaRef.current.scrollHeight, 150);
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, [message]);

  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();

    if (!message.trim() || isSubmitting) return;

    const userMessageContent = message.trim();
    setIsSubmitting(true);
    setIsLoading(true);

    // Clear input field immediately to improve user experience
    setLastMessage(userMessageContent);
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
      // Restore last message so user can retry
      setMessage(lastMessage);
    } finally {
      setIsSubmitting(false);
      setIsLoading(false);

      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  }, [message, isSubmitting, addMessage, setIsLoading, selectedModel, lastMessage]);

  const handleSuggestedPrompt = useCallback((prompt: string) => {
    setMessage(prompt);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  const handleMessageChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as FormEvent);
    }
  }, [handleSubmit]);

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col">
      {messages.length === 0 && (
        <MemoizedSuggestedPrompts onSelectPrompt={handleSuggestedPrompt} />
      )}

      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-1 w-full"
      >
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg resize-none focus:outline-none focus:ring-0 transition-all min-h-[44px] max-h-[150px] overflow-auto align-middle"
            placeholder="Ask a question..."
            aria-label="Chat input"
            value={message}
            onChange={handleMessageChange}
            onKeyDown={handleKeyDown}
            rows={1}
            autoFocus
          />
        </div>
        <button
          type="submit"
          aria-label="Send message"
          disabled={isSubmitting || !message.trim()}
          className="flex items-center justify-center w-11 h-11 bg-gray-900 text-white rounded-lg border border-gray-300 dark:border-gray-700 shadow-sm hover:bg-gray-800 dark:hover:bg-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-600 disabled:bg-gray-300 dark:disabled:bg-gray-800 disabled:text-gray-500 dark:disabled:text-gray-600 disabled:cursor-not-allowed align-middle transition-colors"
        >
          {isSubmitting ? (
            <div className="w-5 h-5 border-2 border-gray-300 dark:border-gray-600 border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" style={{ transform: 'rotate(0deg)' }}>
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
            </svg>
          )}
        </button>
      </form>
    </div>
  );
}
