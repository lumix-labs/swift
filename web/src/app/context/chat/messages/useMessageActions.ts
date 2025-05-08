"use client";

import { useCallback } from "react";
import { Message, SenderType, MessageRole, SENDER_TYPE_TO_ROLE } from "../../../lib/types/message";
import { determineSender } from "./messageFormatters";
import { generateId } from "../../../lib/utils/id";

export function useMessageActions(props: {
  setMessages: (updater: (prev: Message[]) => Message[]) => void;
  setSessions?: (updater: (prev: any[]) => any[]) => void;
  currentSessionId?: string | null;
  selectedAIAdvisorId?: string | null;
}) {
  const { setMessages, setSessions, currentSessionId, selectedAIAdvisorId } = props;

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
      if (currentSessionId && setSessions) {
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
    [currentSessionId, setSessions, setMessages],
  );

  // Add a message using the old format (for backward compatibility)
  const addMessageLegacy = useCallback(
    (message: { role: string; content: string; sender?: any }) => {
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
    [addMessage, selectedAIAdvisorId],
  );

  return {
    addMessage,
    addMessageLegacy,
  };
}
