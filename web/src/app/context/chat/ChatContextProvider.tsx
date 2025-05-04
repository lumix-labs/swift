"use client";

import { createContext, useContext, useState, ReactNode, useCallback, useMemo } from "react";
import { ChatContextType, Message } from "./types";
import { useSessionManagement } from "./useSessionManagement";
import { saveSelectedModelId, saveSelectedRepositoryId } from "./storage-service";

// Create the context with default values
const ChatContext = createContext<ChatContextType>({
  messages: [],
  addMessage: () => {},
  clearMessages: () => {},
  isLoading: false,
  setIsLoading: () => {},
  sessions: [],
  currentSessionId: null,
  createNewSession: () => {},
  switchSession: () => {},
  deleteSession: () => {},
  selectedModelId: null,
  setSelectedModelId: () => {},
  selectedRepositoryId: null,
  setSelectedRepositoryId: () => {},
});

// Create a provider component
export function ChatProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);

  const {
    sessions,
    currentSessionId,
    selectedModelId,
    setSelectedModelId: setSelectedModelIdRaw,
    selectedRepositoryId,
    setSelectedRepositoryId: setSelectedRepositoryIdRaw,
    messages,
    setMessages,
    createNewSession,
    switchSession,
    deleteSession,
    generateId,
    setSessions,
  } = useSessionManagement();

  // Wrap setSelectedModelId to also update localStorage and session
  const setSelectedModelId = useCallback(
    (modelId: string | null) => {
      setSelectedModelIdRaw(modelId);
      saveSelectedModelId(modelId);

      // Update current session with selected model
      if (currentSessionId) {
        setSessions((prev) =>
          prev.map((session) => {
            if (session.id === currentSessionId) {
              return {
                ...session,
                modelId: modelId || undefined,
                updatedAt: new Date(),
              };
            }
            return session;
          }),
        );
      }
    },
    [currentSessionId, setSessions, setSelectedModelIdRaw],
  );

  // Wrap setSelectedRepositoryId to also update localStorage and session
  const setSelectedRepositoryId = useCallback(
    (repositoryId: string | null) => {
      setSelectedRepositoryIdRaw(repositoryId);
      saveSelectedRepositoryId(repositoryId);

      // Update current session with selected repository
      if (currentSessionId) {
        setSessions((prev) =>
          prev.map((session) => {
            if (session.id === currentSessionId) {
              return {
                ...session,
                repositoryId: repositoryId || undefined,
                updatedAt: new Date(),
              };
            }
            return session;
          }),
        );
      }
    },
    [currentSessionId, setSessions, setSelectedRepositoryIdRaw],
  );

  // Add a message to the chat
  const addMessage = useCallback(
    (message: Omit<Message, "id" | "timestamp">) => {
      const newMessage: Message = {
        ...message,
        id: generateId(),
        timestamp: new Date(),
      };

      setMessages((prevMessages) => [...prevMessages, newMessage]);

      // Update the current session with the new message
      if (currentSessionId) {
        setSessions((prev) =>
          prev.map((session) => {
            if (session.id === currentSessionId) {
              const updatedMessages = [...session.messages, newMessage];
              return {
                ...session,
                messages: updatedMessages,
                updatedAt: new Date(),
                // Update title based on first user message if this is the first message
                title:
                  session.messages.length === 0 && message.role === "user"
                    ? message.content.substring(0, 30) + (message.content.length > 30 ? "..." : "")
                    : session.title,
              };
            }
            return session;
          }),
        );
      }
    },
    [currentSessionId, generateId, setSessions, setMessages],
  );

  // Clear all messages in the current session
  const clearMessages = useCallback(() => {
    setMessages([]);

    // Update the current session to have no messages
    if (currentSessionId) {
      setSessions((prev) =>
        prev.map((session) => {
          if (session.id === currentSessionId) {
            return {
              ...session,
              messages: [],
              updatedAt: new Date(),
            };
          }
          return session;
        }),
      );
    }
  }, [currentSessionId, setSessions, setMessages]);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({
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
      selectedModelId,
      setSelectedModelId,
      selectedRepositoryId,
      setSelectedRepositoryId,
    }),
    [
      messages,
      addMessage,
      clearMessages,
      isLoading,
      sessions,
      currentSessionId,
      createNewSession,
      switchSession,
      deleteSession,
      selectedModelId,
      setSelectedModelId,
      selectedRepositoryId,
      setSelectedRepositoryId,
    ],
  );

  return <ChatContext.Provider value={contextValue}>{children}</ChatContext.Provider>;
}

// Create a hook for using the chat context
export function useChat() {
  return useContext(ChatContext);
}
