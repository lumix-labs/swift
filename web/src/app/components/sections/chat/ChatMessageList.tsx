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
  if (messages.length === 0) {
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

    // Create a temporary "loading" message
    const lastMessage = messages[messages.length - 1];
    const lastSender = lastMessage?.sender;

    // Only show loading if the last message was from a user
    if (lastSender?.type !== SenderType.USER) {
      return null;
    }

    // Get the selected AI advisor to create a customized sender
    const currentAdvisor = selectedAIAdvisorId ? getModelById(selectedAIAdvisorId) : null;
    const loadingSender = currentAdvisor
      ? createAdvisorSender(currentAdvisor)
      : {
          id: "ai-advisor",
          type: SenderType.AI_ADVISOR,
          name: "AI Advisor",
          avatarUrl: "/avatars/two.png",
          includeInModelContext: true,
        };

    const loadingMessage: Message = {
      id: "loading",
      sender: loadingSender,
      content: "...",
      timestamp: new Date(),
      isMarkdown: true,
    };

    return <ChatMessage key={loadingMessage.id} message={loadingMessage} isLoading={true} />;
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-6">
      {messages.map((message) => (
        <ChatMessage key={message.id} message={message} />
      ))}

      {renderLoadingIndicator()}

      <div ref={messagesEndRef} className="h-4" />
    </div>
  );
}
