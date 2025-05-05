"use client";

import { useEffect, useRef } from "react";
import { Message, SenderType } from "../../../lib/types/message";
import { ChatMessage } from "./ChatMessage";
import { useChat } from "../../../context/ChatContext";

interface ChatMessageListProps {
  messages: Message[];
}

export function ChatMessageList({ messages }: ChatMessageListProps) {
  const { isLoading } = useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading]);

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

    const loadingSender = messages.find((m) =>
      [SenderType.GEMINI, SenderType.CLAUDE, SenderType.OPENAI].includes(m.sender.type),
    )?.sender || {
      id: "model",
      type: SenderType.GEMINI,
      name: "AI Assistant",
      avatarUrl: "/avatars/gemini-avatar.png",
      includeInModelContext: true,
    };

    const loadingMessage: Message = {
      id: "loading",
      sender: loadingSender,
      content: "...",
      timestamp: new Date(),
      isMarkdown: true,
    };

    return <ChatMessage message={loadingMessage} isLoading={true} />;
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
