"use client";

import { createContext, useContext, useMemo, ReactNode } from "react";
import { useSessionManagement } from "./session-management";
import { useMessageState } from "./messages/useMessageState";
import { useMessageActions } from "./messages/useMessageActions";
import { MessageContextType } from "./types";
import { Message, Sender } from "../../lib/types/message";

// Create the context with default values
const MessageContext = createContext<MessageContextType>({
  messages: [],
  addMessage: () => {},
  clearMessages: () => {},
  isLoading: false,
  setIsLoading: () => {},
});

// Create a provider component
export function MessageProvider({ children }: { children: ReactNode }) {
  // Get session management functions
  const { currentSessionId, messages, setMessages, setSessions, selectedAIAdvisorId } = useSessionManagement();

  // Get message state
  const { isLoading, setIsLoading, clearMessages } = useMessageState();

  // Get message actions
  const { addMessage, addMessageLegacy } = useMessageActions({
    setMessages,
    setSessions,
    currentSessionId,
    selectedAIAdvisorId,
  });

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({
      messages,
      addMessage: (message: { content: string; sender: Sender; isMarkdown?: boolean }) =>
        addMessage(message as Omit<Message, "id" | "timestamp">),
      clearMessages,
      isLoading,
      setIsLoading,
    }),
    [messages, addMessage, clearMessages, isLoading, setIsLoading],
  );

  return <MessageContext.Provider value={contextValue}>{children}</MessageContext.Provider>;
}

// Create a hook for using the message context
export function useMessages() {
  return useContext(MessageContext);
}
