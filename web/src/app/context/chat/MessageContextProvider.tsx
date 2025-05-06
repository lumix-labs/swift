"use client";

import { createContext, useContext, useState, ReactNode, useCallback, useMemo } from "react";
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
import { useModelSelection } from "./ModelSelectionContextProvider";
import { createAdvisorSender, getModelById } from "../../lib/services/entity-service";

export interface MessageContextType {
  messages: Message[];
  addMessage: (message: Omit<Message, "id" | "timestamp">) => void;
  addMessageLegacy: (message: { role: string; content: string; sender?: Sender }) => void;
  clearMessages: () => void;
  isLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;
}

// Create the context with default values
const MessageContext = createContext<MessageContextType>({
  messages: [],
  addMessage: () => {},
  addMessageLegacy: () => {},
  clearMessages: () => {},
  isLoading: false,
  setIsLoading: () => {},
});

// Create a provider component
export function MessageProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const { selectedAIAdvisorId } = useModelSelection();

  const { currentSessionId, messages, setMessages, generateId, setSessions } = useSessionManagement();

  // Helper to determine the appropriate sender for a message
  const determineSender = useCallback((role: string | SenderType, aiAdvisorId?: string | null): Sender => {
    if (typeof role === "string" && Object.values(SenderType).includes(role as SenderType)) {
      // If role is already a SenderType, use it directly
      return SENDERS[role as SenderType];
    }

    // If role is a legacy role type, map it to the appropriate sender
    if (typeof role === "string" && role in ROLE_TO_SENDER_TYPE) {
      const senderType = ROLE_TO_SENDER_TYPE[role];

      // Special case for model-response - use AI Advisor with customized info
      if (role === "model-response" && aiAdvisorId) {
        const advisor = getModelById(aiAdvisorId);
        if (advisor) {
          return createAdvisorSender(advisor);
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
          message.isMarkdown !== undefined ? message.isMarkdown : message.sender.type === SenderType.AI_ADVISOR,
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
    (message: { role: string; content: string; sender?: Sender }) => {
      // Use provided sender if available, otherwise determine based on role
      const sender = message.sender || determineSender(message.role, selectedAIAdvisorId);

      // Create the new message with the sender
      const newMessage: Omit<Message, "id" | "timestamp"> = {
        sender,
        content: message.content,
        isMarkdown: sender.type === SenderType.AI_ADVISOR,
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
      addMessage,
      addMessageLegacy,
      clearMessages,
      isLoading,
      setIsLoading,
    }),
    [messages, addMessage, addMessageLegacy, clearMessages, isLoading],
  );

  return <MessageContext.Provider value={contextValue}>{children}</MessageContext.Provider>;
}

// Create a hook for using the message context
export function useMessages() {
  return useContext(MessageContext);
}
