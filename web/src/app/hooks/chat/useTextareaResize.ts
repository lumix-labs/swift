"use client";

import { useEffect, RefObject } from 'react';

export function useTextareaResize(
  textareaRef: RefObject<HTMLTextAreaElement>,
  message: string
) {
  // Adjust textarea height based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.min(textareaRef.current.scrollHeight, 150);
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, [message, textareaRef]);

  // Define resizeTextarea function for manual triggering
  const resizeTextarea = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.min(textareaRef.current.scrollHeight, 150);
      textareaRef.current.style.height = `${newHeight}px`;
    }
  };

  // Reset textarea height
  const resetTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  return { resetTextareaHeight, resizeTextarea };
}
