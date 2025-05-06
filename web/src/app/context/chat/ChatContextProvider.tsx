"use client";

import { ReactNode, createContext, useContext } from "react";
import { SessionProvider } from "./SessionContextProvider";
import { ModelSelectionProvider } from "./ModelSelectionContextProvider";
import { RepositoryProvider } from "./RepositoryContextProvider";
import { MessageProvider } from "./MessageContextProvider";
import { useMessages } from "./MessageContextProvider";
import { useSession } from "./SessionContextProvider";
import { useModelSelection } from "./ModelSelectionContextProvider";
import { useRepository } from "./RepositoryContextProvider";
import { ChatContextType } from "./types";

// Create the ChatContext here instead of importing it
export const ChatContext = createContext<ChatContextType | undefined>(undefined);

// Export useChat hook for consumers
export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
}

/**
 * Unified provider that combines all chat-related context providers
 * This maintains backward compatibility with the original ChatContext
 */
export function ChatProvider({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ModelSelectionProvider>
        <RepositoryProvider>
          <MessageProvider>
            <ChatContextWrapper>{children}</ChatContextWrapper>
          </MessageProvider>
        </RepositoryProvider>
      </ModelSelectionProvider>
    </SessionProvider>
  );
}

/**
 * Wrapper component that maps the new context structure to the old ChatContext
 * This ensures backward compatibility with components that use the old context
 */
function ChatContextWrapper({ children }: { children: ReactNode }) {
  // Get values from all the new context providers
  const { messages, addMessageLegacy: addMessage, clearMessages, isLoading, setIsLoading } = useMessages();

  const { sessions, currentSessionId, createNewSession, switchSession, deleteSession } = useSession();

  const { selectedAIAdvisorId, setSelectedAIAdvisorId, selectedModelId } = useModelSelection();

  const { selectedRepositoryId, setSelectedRepositoryId } = useRepository();

  // Create the combined context value with the same shape as the original ChatContext
  const contextValue = {
    messages,
    addMessage,
    clearMessages,
    isLoading,
    setIsLoading,
    sessions,
    currentSessionId,
    createNewSession,
    switchSession,
    deleteSession,
    selectedAIAdvisorId,
    setSelectedAIAdvisorId,
    selectedRepositoryId,
    setSelectedRepositoryId,
    selectedModelId,
  };

  return <ChatContext.Provider value={contextValue}>{children}</ChatContext.Provider>;
}
