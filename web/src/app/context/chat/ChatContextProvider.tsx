"use client";

import { createContext, useContext, useState, ReactNode, useCallback, useMemo } from "react";
import { ChatContextType } from "./types";
import {
  Message,
  Sender,
  SenderType,
  SENDERS,
  ROLE_TO_SENDER_TYPE,
  SENDER_TYPE_TO_ROLE,
  MessageRole,
} from "../../lib/types/message";
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
  selectedAIAdvisorId: null,
  setSelectedAIAdvisorId: () => {},
  selectedRepositoryId: null,
  setSelectedRepositoryId: () => {},
  selectedModelId: null,
});

// Create a provider component
export function ChatProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);

  const {
    sessions,
    currentSessionId,
    selectedAIAdvisorId,
    setSelectedAIAdvisorId: setSelectedAIAdvisorIdRaw,
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

  // Define selectedModelId as an alias to selectedAIAdvisorId for backward compatibility
  const selectedModelId = selectedAIAdvisorId;

  // Wrap setSelectedAIAdvisorId to also update localStorage and session
  const setSelectedAIAdvisorId = useCallback(
    (aiAdvisorId: string | null) => {
      setSelectedAIAdvisorIdRaw(aiAdvisorId);
      saveSelectedModelId(aiAdvisorId);

      // Update current session with selected AI advisor
      if (currentSessionId) {
        setSessions((prev) =>
          prev.map((session) => {
            if (session.id === currentSessionId) {
              return {
                ...session,
                aiAdvisorId: aiAdvisorId || undefined,
                modelId: aiAdvisorId || undefined, // Also update modelId for backward compatibility
                updatedAt: new Date(),
              };
            }
            return session;
          }),
        );
      }
    },
    [currentSessionId, setSessions, setSelectedAIAdvisorIdRaw],
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

  // Helper to determine the appropriate sender for a message
  const determineSender = useCallback((role: string | SenderType, aiAdvisorId?: string | null): Sender => {
    if (typeof role === "string" && Object.values(SenderType).includes(role as SenderType)) {
      // If role is already a SenderType, use it directly
      return SENDERS[role as SenderType];
    }

    // If role is a legacy role type, map it to the appropriate sender
    if (typeof role === "string" && role in ROLE_TO_SENDER_TYPE) {
      const senderType = ROLE_TO_SENDER_TYPE[role];

      // Special case for model-response - use the specific model type if available
      if (role === "model-response" && aiAdvisorId) {
        const aiAdvisors: Record<string, SenderType> = {
          gemini: SenderType.GEMINI,
          claude: SenderType.CLAUDE,
          openai: SenderType.OPENAI,
        };

        // Get the AI advisor provider from the advisor ID or service
        // This is a simplification, in a real app you would look up the model type
        const aiAdvisorProvider = aiAdvisorId.includes("gemini")
          ? "gemini"
          : aiAdvisorId.includes("claude")
            ? "claude"
            : aiAdvisorId.includes("gpt")
              ? "openai"
              : "gemini";

        if (aiAdvisorProvider in aiAdvisors) {
          return SENDERS[aiAdvisors[aiAdvisorProvider as keyof typeof aiAdvisors]];
        }
      }

      return SENDERS[senderType];
    }

    // Default to user if can't determine sender
    return SENDERS[SenderType.USER];
  }, []);

  // Add a message to the chat with proper typing
  const addMessage = useCallback(
    (message: Omit<Message, "id" | "timestamp">) => {
      const newMessage: Message = {
        ...message,
        id: generateId(),
        timestamp: new Date(),
        // Set default isMarkdown for model messages
        isMarkdown:
          message.isMarkdown !== undefined
            ? message.isMarkdown
            : [SenderType.GEMINI, SenderType.CLAUDE, SenderType.OPENAI].includes(message.sender.type),
      };

      // Add role property for backward compatibility if not present
      if (!newMessage.role && newMessage.sender && newMessage.sender.type) {
        newMessage.role = SENDER_TYPE_TO_ROLE[newMessage.sender.type];
      }

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
                  session.messages.length === 0 && message.sender.type === SenderType.USER
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

  // Add a message using the old format (for backward compatibility)
  const addMessageLegacy = useCallback(
    (message: { role: string; content: string }) => {
      // Determine the sender based on the role
      const sender = determineSender(message.role, selectedAIAdvisorId);

      // Create the new message with the sender
      const newMessage: Omit<Message, "id" | "timestamp"> = {
        sender,
        content: message.content,
        isMarkdown: [SenderType.GEMINI, SenderType.CLAUDE, SenderType.OPENAI].includes(sender.type),
        role: message.role as MessageRole,
      };

      // Use the new addMessage function
      addMessage(newMessage);
    },
    [addMessage, determineSender, selectedAIAdvisorId],
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
      addMessage: addMessageLegacy,
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
      selectedModelId, // Include for backward compatibility
    }),
    [
      messages,
      addMessageLegacy,
      clearMessages,
      isLoading,
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
    ],
  );

  return <ChatContext.Provider value={contextValue}>{children}</ChatContext.Provider>;
}

// Create a hook for using the chat context
export function useChat() {
  return useContext(ChatContext);
}
