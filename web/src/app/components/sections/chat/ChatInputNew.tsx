"use client";

import React, { useRef, useEffect } from "react";
import { useChat } from "../../../context/ChatContext";
import { useEntitySelection } from "../../../hooks/chat/useEntitySelection";
import { useMessageSubmission } from "../../../hooks/chat/useMessageSubmission";
import { useRepositoryEvents } from "../../../hooks/chat/useRepositoryEvents";
import { useTextareaResize } from "../../../hooks/chat/useTextareaResize";
import { useDebounce } from "../../../hooks/useDebounce";
import { Message } from "../../../context/chat/types";

export function ChatInput() {
  const { addMessage, isLoading, setIsLoading, selectedModelId, selectedRepositoryId, messages } = useChat();

  // Use custom hooks to manage component state
  const { currentModel, currentRepo, downloadedRepo, repositoryReady, setRepositoryReady, setDownloadedRepo } =
    useEntitySelection(selectedModelId, selectedRepositoryId);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { resetTextareaHeight } = useTextareaResize(textareaRef, "");

  // State for managing user interaction
  const [userCanSendMessage, setUserCanSendMessage] = React.useState<boolean>(true);

  // Set up repository event handling
  const repositoryEvents = useRepositoryEvents({
    selectedRepositoryId,
    setRepositoryReady,
    setDownloadedRepo,
    setUserCanSendMessage,
  });

  // Process messages to check for repository readiness
  useEffect(() => {
    if (repositoryEvents && repositoryEvents.handleRepositoryReadyMessages && messages) {
      // No need to convert messages - use them directly with Message type
      // The repository events handler should accept Message[] directly
      repositoryEvents.handleRepositoryReadyMessages(messages);
    }
  }, [messages, repositoryEvents]);

  // Message submission handling
  const { message, isSubmitting, waitingForResponse, handleSubmit, handleMessageChange, handleKeyDown } =
    useMessageSubmission({
      addMessage,
      setIsLoading,
      currentModel,
      currentRepo,
      downloadedRepo,
      repositoryReady,
    });

  // Use debounced states to avoid unnecessary re-renders
  const debouncedIsLoading = useDebounce(isLoading, 300);
  const debouncedWaitingForResponse = useDebounce(waitingForResponse, 300);

  // Determine if the input should be disabled
  const isInputDisabled = isSubmitting || debouncedIsLoading || debouncedWaitingForResponse || !userCanSendMessage;

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-1 w-full max-w-4xl mx-auto">
      <div className="flex-1 relative">
        <textarea
          ref={textareaRef}
          className={`w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 border 
                      border-gray-300 dark:border-gray-700 rounded-lg resize-none 
                      focus:outline-none focus:ring-0 transition-all min-h-[44px] 
                      max-h-[150px] overflow-auto align-middle ${
                        isInputDisabled ? "opacity-70 cursor-not-allowed" : ""
                      }`}
          placeholder={
            isInputDisabled
              ? "Waiting for response..."
              : currentRepo && !repositoryReady
                ? "Waiting for repository to download..."
                : currentModel && currentRepo && repositoryReady
                  ? `Ask about the ${currentRepo.name} repository...`
                  : currentModel
                    ? "Ask a question..."
                    : "Please select a model first"
          }
          aria-label="Chat input"
          value={message}
          onChange={handleMessageChange}
          onKeyDown={handleKeyDown}
          rows={1}
          autoFocus
          disabled={isInputDisabled || (currentRepo && !repositoryReady) || !currentModel}
        />
      </div>
      <button
        type="submit"
        aria-label="Send message"
        disabled={isInputDisabled || !message.trim() || (currentRepo && !repositoryReady) || !currentModel}
        className="flex items-center justify-center w-11 h-11 bg-gray-900 text-white 
                  rounded-lg border border-gray-300 dark:border-gray-700 shadow-sm 
                  hover:bg-gray-800 dark:hover:bg-gray-700 focus:outline-none 
                  focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-600 
                  disabled:bg-gray-300 dark:disabled:bg-gray-800 disabled:text-gray-500 
                  dark:disabled:text-gray-600 disabled:cursor-not-allowed align-middle 
                  transition-colors"
      >
        {isInputDisabled ? (
          <div
            className="w-5 h-5 border-2 border-gray-300 dark:border-gray-600 
                          border-t-transparent rounded-full animate-spin"
          />
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
            style={{ transform: "rotate(0deg)" }}
          >
            <path
              d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 
                    009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 
                    001.17-1.408l-7-14z"
            />
          </svg>
        )}
      </button>
    </form>
  );
}
