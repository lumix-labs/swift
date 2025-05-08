"use client";

import React, { useRef, useEffect } from "react";
// Removed unused import: useTextareaResize

interface MessageInputProps {
  message: string;
  isDisabled: boolean;
  placeholderMessage: string;
  handleMessageChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  resizeTextarea: () => void;
  setMessage: (message: string) => void;
}

export function MessageInput({
  message,
  isDisabled,
  placeholderMessage,
  handleMessageChange,
  handleKeyDown,
  resizeTextarea,
  setMessage,
}: MessageInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Listen for prompt suggestions from ChatMessageList
  useEffect(() => {
    const handleSetPromptInInput = (event: Event) => {
      const customEvent = event as CustomEvent;
      const prompt = customEvent.detail?.prompt;

      if (prompt) {
        // Set the prompt in the input
        setMessage(prompt);

        // Focus the textarea
        if (textareaRef.current) {
          textareaRef.current.focus();
          // Place cursor at the end
          setTimeout(() => {
            if (textareaRef.current) {
              textareaRef.current.selectionStart = textareaRef.current.selectionEnd = prompt.length;
              // Resize the textarea to fit the content
              resizeTextarea();
            }
          }, 50);
        }
      }
    };

    window.addEventListener("setPromptInInput", handleSetPromptInInput);

    return () => {
      window.removeEventListener("setPromptInInput", handleSetPromptInInput);
    };
  }, [setMessage, resizeTextarea]);

  return (
    <div className="flex-1 relative">
      <textarea
        ref={textareaRef}
        className={`w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 border
                   border-gray-300 dark:border-gray-700 rounded-lg resize-none 
                   focus:outline-none focus:ring-0 transition-all min-h-[44px] 
                   max-h-[150px] overflow-auto align-middle ${isDisabled ? "opacity-70 cursor-not-allowed" : ""}`}
        placeholder={placeholderMessage}
        aria-label="Chat input"
        value={message}
        onChange={(e) => {
          handleMessageChange(e);
          resizeTextarea();
        }}
        onKeyDown={handleKeyDown}
        rows={1}
        // Fixed accessibility issue by removing autoFocus
        disabled={isDisabled}
      />
    </div>
  );
}
