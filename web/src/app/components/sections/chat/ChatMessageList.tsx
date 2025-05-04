"use client";

import React, { useRef, useEffect, useContext } from "react";
import { useChat } from "../../../context/ChatContext";
import { useTheme } from "../../../context/ThemeContext";
import { ChatMessage } from "./ChatMessage";
import { EmptyChatView } from "./EmptyChatView";
import { useMessageSubmission } from "../../../hooks/chat/useMessageSubmission";
import { useEntitySelection } from "../../../hooks/chat/useEntitySelection";

export function ChatMessageList() {
  const { messages, addMessage, selectedModelId, selectedRepositoryId, isLoading, setIsLoading } = useChat();
  const { resolvedTheme } = useTheme();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Get entity selection hook for current model and repo status
  const { currentModel, currentRepo, downloadedRepo, repositoryReady } = useEntitySelection(
    selectedModelId,
    selectedRepositoryId
  );

  // Scroll to bottom when new messages are added
  useEffect(() => {
    if (scrollContainerRef.current && messages.length > 0) {
      const scrollContainer = scrollContainerRef.current;
      // Use requestAnimationFrame to ensure DOM has updated before scrolling
      requestAnimationFrame(() => {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      });
    }
  }, [messages]);

  // Handle selecting a suggested prompt
  const handleSelectPrompt = (prompt: string) => {
    // Check if necessary requirements are met
    if (!currentModel || !currentRepo || !repositoryReady) {
      // Dispatch custom event to notify that requirements aren't met
      const errorEvent = new CustomEvent('suggestedPromptError', {
        detail: { 
          message: !currentModel 
            ? "Please select a model first" 
            : !currentRepo 
              ? "Please select a repository first" 
              : "Repository is not ready yet"
        }
      });
      window.dispatchEvent(errorEvent);
      return;
    }

    // Set the value in the textarea input instead of directly submitting
    // This is done through a custom event that the ChatInput will listen for
    const event = new CustomEvent('setPromptInInput', {
      detail: { prompt }
    });
    window.dispatchEvent(event);
  };

  return (
    <div className="flex-1 p-4 overflow-hidden h-full w-full">
      {messages.length === 0 ? (
        <EmptyChatView onSelectPrompt={handleSelectPrompt} />
      ) : (
        <div
          ref={scrollContainerRef}
          className={`max-w-4xl mx-auto h-full overflow-y-auto scrollbar-${resolvedTheme}`}
          style={{ overflowX: "hidden" }}
        >
          {messages.map((message, index) => (
            <div key={index} className="py-2">
              <ChatMessage message={message} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
