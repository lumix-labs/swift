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

  // Helper to determine the appropriate sender for a message with enhanced safety
  const determineSender = useCallback((role: string | SenderType, aiAdvisorId?: string | null): Sender => {
    try {
      // Safety check: ensure SENDERS object exists
      if (!SENDERS || typeof SENDERS !== "object") {
        console.error("SENDERS object is not available");
        return {
          id: "fallback-user",
          type: SenderType.USER,
          name: "User",
          avatarUrl: "/avatars/user-avatar.png",
          includeInModelContext: true,
        };
      }

      if (typeof role === "string" && Object.values(SenderType).includes(role as SenderType)) {
        // If role is already a SenderType, use it directly
        const sender = SENDERS[role as SenderType];
        if (sender && sender.type && sender.id) {
          return sender;
        }
      }

      // If role is a legacy role type, map it to the appropriate sender
      if (typeof role === "string" && ROLE_TO_SENDER_TYPE && role in ROLE_TO_SENDER_TYPE) {
        const senderType = ROLE_TO_SENDER_TYPE[role];

        // Special case for model-response - use AI Advisor with customized info
        if (role === "model-response" && aiAdvisorId) {
          const advisor = getModelById(aiAdvisorId);
          if (advisor && advisor.id && advisor.name) {
            const advisorSender = createAdvisorSender(advisor);
            if (advisorSender && advisorSender.type && advisorSender.id) {
              return advisorSender;
            }
          }
        }

        const sender = SENDERS[senderType];
        if (sender && sender.type && sender.id) {
          return sender;
        }
      }

      // Default to user if can't determine sender
      const defaultSender = SENDERS[SenderType.USER];
      if (defaultSender && defaultSender.type && defaultSender.id) {
        return defaultSender;
      }

      // Final fallback if even default sender is invalid
      return {
        id: "fallback-user",
        type: SenderType.USER,
        name: "User",
        avatarUrl: "/avatars/user-avatar.png",
        includeInModelContext: true,
      };
    } catch (error) {
      console.error("Error in determineSender:", error);
      return {
        id: "error-user",
        type: SenderType.USER,
        name: "User",
        avatarUrl: "/avatars/user-avatar.png",
        includeInModelContext: true,
      };
    }
  }, []);

  // Add a message to the chat with proper typing and enhanced validation
  const addMessage = useCallback(
    (message: Omit<Message, "id" | "timestamp">) => {
      try {
        // Validate the incoming message
        if (!message || typeof message !== "object") {
          console.error("Invalid message object provided to addMessage:", message);
          return;
        }

        if (!message.content || typeof message.content !== "string") {
          console.error("Message content is missing or invalid:", message);
          return;
        }

        if (!message.sender || typeof message.sender !== "object") {
          console.error("Message sender is missing or invalid:", message);
          return;
        }

        // Validate sender has required properties
        if (!message.sender.type || !message.sender.id || !message.sender.name) {
          console.error("Message sender missing required properties:", message.sender);
          return;
        }

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
          if (SENDER_TYPE_TO_ROLE && newMessage.sender.type in SENDER_TYPE_TO_ROLE) {
            newMessage.role = SENDER_TYPE_TO_ROLE[newMessage.sender.type];
          }
        }

        setMessages((prevMessages) => {
          // Ensure prevMessages is an array
          const safePrevMessages = Array.isArray(prevMessages) ? prevMessages : [];
          return [...safePrevMessages, newMessage];
        });

        // Update the current session with the new message
        if (currentSessionId) {
          setSessions((prev) => {
            // Ensure prev is an array
            const safePrev = Array.isArray(prev) ? prev : [];
            return safePrev.map((session) => {
              if (session && session.id === currentSessionId) {
                const currentMessages = Array.isArray(session.messages) ? session.messages : [];
                const updatedMessages = [...currentMessages, newMessage];
                return {
                  ...session,
                  messages: updatedMessages,
                  updatedAt: new Date(),
                  // Update title based on first user message if this is the first message
                  title:
                    currentMessages.length === 0 && message.sender.type === SenderType.USER
                      ? message.content.substring(0, 30) + (message.content.length > 30 ? "..." : "")
                      : session.title,
                };
              }
              return session;
            });
          });
        }
      } catch (error) {
        console.error("Error in addMessage:", error, message);
      }
    },
    [currentSessionId, generateId, setSessions, setMessages],
  );

  // Add a message using the old format (for backward compatibility)
  const addMessageLegacy = useCallback(
    (message: { role: string; content: string; sender?: Sender }) => {
      try {
        if (!message || typeof message !== "object") {
          console.error("Invalid legacy message:", message);
          return;
        }

        if (!message.content || typeof message.content !== "string") {
          console.error("Legacy message content is missing or invalid:", message);
          return;
        }

        if (!message.role || typeof message.role !== "string") {
          console.error("Legacy message role is missing or invalid:", message);
          return;
        }

        // Use provided sender if available and valid, otherwise determine based on role
        let sender = message.sender;

        if (!sender || !sender.type || !sender.id || !sender.name) {
          sender = determineSender(message.role, selectedAIAdvisorId);
        }

        // Final validation of sender
        if (!sender || !sender.type || !sender.id || !sender.name) {
          console.error("Could not create valid sender for legacy message:", message);
          return;
        }

        // Create the new message with the sender
        const newMessage: Omit<Message, "id" | "timestamp"> = {
          sender,
          content: message.content,
          isMarkdown: sender.type === SenderType.AI_ADVISOR,
          role: message.role as MessageRole,
        };

        // Use the new addMessage function
        addMessage(newMessage);
      } catch (error) {
        console.error("Error in addMessageLegacy:", error, message);
      }
    },
    [addMessage, determineSender, selectedAIAdvisorId],
  );

  // Clear all messages in the current session
  const clearMessages = useCallback(() => {
    try {
      setMessages([]);

      // Update the current session to have no messages
      if (currentSessionId) {
        setSessions((prev) => {
          const safePrev = Array.isArray(prev) ? prev : [];
          return safePrev.map((session) => {
            if (session && session.id === currentSessionId) {
              return {
                ...session,
                messages: [],
                updatedAt: new Date(),
              };
            }
            return session;
          });
        });
      }
    } catch (error) {
      console.error("Error in clearMessages:", error);
    }
  }, [currentSessionId, setSessions, setMessages]);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({
      messages: Array.isArray(messages) ? messages : [],
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
