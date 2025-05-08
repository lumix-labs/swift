"use client";

import { createContext, useContext, ReactNode, useState, useCallback, useEffect, useMemo, useRef } from "react";
import { Message, SenderType, SENDERS, MessageRole } from "../../lib/types/message";
import { useRepository } from "./RepositoryContextProvider";
import { useRepositoryEvents } from "../../hooks/chat/useRepositoryEvents";
import { DownloadedRepository, getDownloadedRepository } from "../../lib/services/repo-download-service";
import { useSessionManagement } from "./useSessionManagement";
import { v4 as uuidv4 } from "uuid";
import { ChatContextType, ChatSession } from "./types";

// Create a chat context with default values
export const ChatContext = createContext<ChatContextType>({
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
  selectedAIAdvisorId: null,
  setSelectedAIAdvisorId: () => {},
  selectedRepositoryId: null,
  setSelectedRepositoryId: () => {},
  selectedModelId: null,
});

// Create the chat provider component
export function ChatProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAIAdvisorId, setSelectedAIAdvisorId] = useState<string | null>(null);
  const [isRepositoryReady, setRepositoryReady] = useState(false);
  const [downloadedRepo, setDownloadedRepo] = useState<DownloadedRepository | null>(null);
  const [userCanSendMessage, setUserCanSendMessage] = useState(true);
  const repositoryWelcomeShown = useRef<Record<string, boolean>>({});

  const { selectedRepositoryId, setSelectedRepositoryId } = useRepository();
  const { currentSessionId, setCurrentSessionMessages, sessions, createNewSession, switchSession, deleteSession } =
    useSessionManagement();

  // Add a new message to the chat with required id and timestamp
  const addMessage = useCallback(
    (message: { role: MessageRole | string; content: string; sender?: any; id?: string; timestamp?: Date }) => {
      const id = message.id || uuidv4();
      const timestamp = message.timestamp || new Date();
      const sender = message.sender || SENDERS[SenderType.USER];

      const completeMessage: Message = {
        id,
        content: message.content,
        timestamp,
        sender,
        role: message.role as MessageRole,
      };

      const updatedMessages = [...messages, completeMessage];
      setMessages(updatedMessages);

      // If we have a current session, update its messages too
      if (currentSessionId && setCurrentSessionMessages) {
        setCurrentSessionMessages(currentSessionId, updatedMessages);
      }

      // If a user message is added, temporarily disable sending until assistant responds
      if (message.role === "user") {
        setUserCanSendMessage(false);
        setIsLoading(true);
      }

      if (message.role === "assistant" || message.role === "model-response") {
        setIsLoading(false);
        setUserCanSendMessage(true);
      }
    },
    [messages, currentSessionId, setCurrentSessionMessages],
  );

  // Clear all messages from the chat
  const clearMessages = useCallback(() => {
    setMessages([]);

    // If we have a current session, clear its messages too
    if (currentSessionId && setCurrentSessionMessages) {
      setCurrentSessionMessages(currentSessionId, []);
    }
  }, [currentSessionId, setCurrentSessionMessages]);

  // Set up repository event handling
  const { handleRepositoryReadyMessages } = useRepositoryEvents({
    selectedRepositoryId,
    setRepositoryReady,
    setDownloadedRepo,
    setUserCanSendMessage,
    addMessage,
  });

  // Check messages for repository ready indications
  useEffect(() => {
    handleRepositoryReadyMessages(messages);
  }, [messages, handleRepositoryReadyMessages]);

  // When repository changes, update repository ready state and downloaded repo
  useEffect(() => {
    if (selectedRepositoryId) {
      const downloadedRepo = getDownloadedRepository(selectedRepositoryId);
      setDownloadedRepo(downloadedRepo || null);

      // Reset repository ready state
      setRepositoryReady(false);

      // Only show welcome message once per repository and only if there are no messages
      if (messages.length === 0 && !repositoryWelcomeShown.current[selectedRepositoryId]) {
        repositoryWelcomeShown.current[selectedRepositoryId] = true;
        
        addMessage({
          content: `Welcome to Swift! I'm here to help you with your repositories. ${
            downloadedRepo ? "I see you've added a repository. Let's start exploring it!" : ""
          }`,
          sender: SENDERS[SenderType.SWIFT_ASSISTANT],
          role: "assistant",
        });
      }
    } else {
      setDownloadedRepo(null);
      setRepositoryReady(false);
    }
  }, [selectedRepositoryId, messages.length, addMessage]);

  // Reset repository welcome shown when messages are cleared
  useEffect(() => {
    if (messages.length === 0) {
      repositoryWelcomeShown.current = {};
    }
  }, [messages.length]);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({
      messages,
      addMessage,
      clearMessages,
      isLoading,
      setIsLoading,
      sessions: sessions || [],
      currentSessionId,
      createNewSession,
      switchSession,
      deleteSession,
      selectedAIAdvisorId,
      setSelectedAIAdvisorId,
      selectedRepositoryId,
      setSelectedRepositoryId,
      selectedModelId: selectedAIAdvisorId, // For backward compatibility
      setCurrentSessionMessages,
    }),
    [
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
      setCurrentSessionMessages,
    ],
  );

  return <ChatContext.Provider value={contextValue}>{children}</ChatContext.Provider>;
}

// Custom hook to use the chat context
export function useChat() {
  return useContext(ChatContext);
}
