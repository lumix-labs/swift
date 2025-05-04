"use client";

import React, { useRef, useState, useEffect } from "react";
import { useChat } from "../../../context/ChatContext";
import { useEntitySelection } from "../../../hooks/chat/useEntitySelection";
import { useMessageSubmission } from "../../../hooks/chat/useMessageSubmission";
import { useTextareaResize } from "../../../hooks/chat/useTextareaResize";
import { useDebounce } from "../../../hooks/useDebounce";
import { REPO_DOWNLOAD_COMPLETE_EVENT } from "../shared/DownloadButton";

export function ChatInput() {
  const { addMessage, isLoading, setIsLoading, selectedModelId, selectedRepositoryId, messages } = useChat();

  // Use custom hooks to manage component state
  const { currentModel, currentRepo, downloadedRepo, repositoryReady, setRepositoryReady, setDownloadedRepo } =
    useEntitySelection(selectedModelId, selectedRepositoryId);

  const [userCanSendMessage, setUserCanSendMessage] = useState<boolean>(true);
  const [waitingForResponse, setWaitingForResponse] = useState<boolean>(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Use debounced states to avoid unnecessary re-renders
  const debouncedIsLoading = useDebounce(isLoading, 300);
  const debouncedWaitingForResponse = useDebounce(waitingForResponse, 300);

  // Message submission handling
  const { message, isSubmitting, handleSubmit, handleMessageChange, handleKeyDown } = useMessageSubmission({
    addMessage,
    setIsLoading,
    currentModel,
    currentRepo,
    downloadedRepo,
    repositoryReady,
  });

  // Get resize functionality for the textarea
  const { resetTextareaHeight, resizeTextarea } = useTextareaResize(textareaRef, message);

  // Reset response waiting state if no response received after a timeout
  const responseTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const timeoutId = responseTimeoutRef.current;
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  // Listen for repository download completion
  useEffect(() => {
    const handleRepoDownloadComplete = (event: Event) => {
      const customEvent = event as CustomEvent;
      const downloadedRepository = customEvent.detail?.repository;
      const action = customEvent.detail?.action || "download";

      if (downloadedRepository && downloadedRepository.id === selectedRepositoryId) {
        setDownloadedRepo(downloadedRepository);

        // Only set repository as ready if it was downloaded (not just added)
        if (action === "download") {
          setRepositoryReady(true);

          // Enable sending messages after download is complete
          setUserCanSendMessage(true);
        }
      }
    };

    // Add event listener
    window.addEventListener(REPO_DOWNLOAD_COMPLETE_EVENT, handleRepoDownloadComplete);

    // Clean up
    return () => {
      window.removeEventListener(REPO_DOWNLOAD_COMPLETE_EVENT, handleRepoDownloadComplete);
    };
  }, [selectedRepositoryId, setDownloadedRepo, setRepositoryReady]);

  // Check messages to determine states
  useEffect(() => {
    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1];

      // Check if the message indicates repository readiness
      if (
        lastMsg.role === "assistant" &&
        lastMsg.content.includes("repository") &&
        (lastMsg.content.includes("ready to query") || lastMsg.content.includes("successfully ingested"))
      ) {
        setRepositoryReady(true);

        // Reset waiting state if this was a response we were waiting for
        if (waitingForResponse) {
          setWaitingForResponse(false);
          setIsLoading(false);
        }

        // Enable user to send messages
        setUserCanSendMessage(true);
      }

      // If we have a user message followed by an assistant message, we're no longer waiting
      if (messages.length >= 2) {
        const userMsg = messages[messages.length - 2];
        const assistantMsg = messages[messages.length - 1];
        if (userMsg.role === "user" && assistantMsg.role === "assistant") {
          setWaitingForResponse(false);
          setIsLoading(false);

          // Enable user to send messages
          setUserCanSendMessage(true);
        }
      }
    }
  }, [messages, setIsLoading, waitingForResponse, setRepositoryReady, setUserCanSendMessage]);

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
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
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
