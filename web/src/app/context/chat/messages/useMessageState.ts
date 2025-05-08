"use client";

import { useState, useCallback } from "react";
import { Message } from "../../../lib/types/message";

export function useMessageState() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Clear all messages
  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    setMessages,
    isLoading,
    setIsLoading,
    clearMessages,
  };
}
