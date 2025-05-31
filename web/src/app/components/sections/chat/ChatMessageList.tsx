"use client";

import { useEffect, useRef } from "react";
import { Message, SenderType, SENDER_TYPE_TO_ROLE } from "../../../lib/types/message";
import { ChatMessage } from "./ChatMessage";
import { useChat } from "../../../context/ChatContext";
import { EmptyChatView } from "./EmptyChatView";
import { getModelById, createAdvisorSender } from "../../../lib/services/entity-service";

interface ChatMessageListProps {
  messages: Message[];
}

export function ChatMessageList({ messages }: ChatMessageListProps) {
  const { isLoading, addMessage, selectedAIAdvisorId } = useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading]);

  // Show empty state when there are no messages
  if (!Array.isArray(messages) || messages.length === 0) {
    return (
      <EmptyChatView
        onSelectPrompt={(prompt) =>
          addMessage({
            role: "user", // Add the required role property
            content: prompt,
            sender: {
              id: "user",
              type: SenderType.USER,
              name: "You",
              avatarUrl: "/avatars/user-avatar.png",
              includeInModelContext: true,
            },
            // timestamp property is handled by addMessage function
          })
        }
      />
    );
  }

  // Show loading indicator for model messages
  const renderLoadingIndicator = () => {
    if (!isLoading) {
      return null;
    }

    try {
      // Create a temporary "loading" message
      const lastMessage = messages[messages.length - 1];
      const lastSender = lastMessage?.sender;

      // Only show loading if the last message was from a user
      if (!lastSender || lastSender.type !== SenderType.USER) {
        return null;
      }

      // Get the selected AI advisor to create a customized sender
      const currentAdvisor = selectedAIAdvisorId ? getModelById(selectedAIAdvisorId) : null;
      const loadingSender =
        currentAdvisor && currentAdvisor.id
          ? createAdvisorSender(currentAdvisor)
          : {
              id: "ai-advisor",
              type: SenderType.AI_ADVISOR,
              name: "AI Advisor",
              avatarUrl: "/avatars/two.png",
              includeInModelContext: true,
            };

      // Validate the loading sender has required properties
      if (!loadingSender || !loadingSender.type || !loadingSender.id) {
        console.warn("Invalid loading sender created:", loadingSender);
        return null;
      }

      const loadingMessage: Message = {
        id: "loading",
        sender: loadingSender,
        content: "...",
        timestamp: new Date(),
        isMarkdown: true,
      };

      return <ChatMessage key={loadingMessage.id} message={loadingMessage} isLoading={true} />;
    } catch (error) {
      console.error("Error rendering loading indicator:", error);
      return null;
    }
  };

  // Filter and validate messages before rendering
  const validMessages = messages.filter((message) => {
    if (!message || typeof message !== "object") {
      console.warn("Invalid message object:", message);
      return false;
    }

    if (!message.id || !message.content || !message.sender) {
      console.warn("Message missing required properties:", message);
      return false;
    }

    if (!message.sender.type || !message.sender.id || !message.sender.name) {
      console.warn("Message sender missing required properties:", message.sender);
      return false;
    }

    return true;
  });

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-6">
      {validMessages.map((message) => {
        try {
          return <ChatMessage key={message.id} message={message} />;
        } catch (error) {
          console.error("Error rendering message:", error, message);
          // Return a safe fallback message
          return (
            <div
              key={message.id || `error-${Math.random()}`}
              className="p-3 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800"
            >
              <p className="text-red-600 dark:text-red-400 text-sm">
                Error rendering message: {message.content?.substring(0, 100) || "Unknown content"}
              </p>
            </div>
          );
        }
      })}

      {renderLoadingIndicator()}

      <div ref={messagesEndRef} className="h-4" />
    </div>
  );
}
