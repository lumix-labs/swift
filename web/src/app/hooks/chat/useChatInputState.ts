"use client";

import { useState, useEffect, useRef } from "react";
import { useChat } from "../../context/ChatContext";
import { useEntitySelection } from "./useEntitySelection";
import { useMessageSubmission } from "./useMessageSubmission";
import { useDebounce } from "../useDebounce";
import { RepositoryStatus, getRepositoryStatus, isRepositoryReadyForChat } from "../../lib/services/repo-download-service";
import { REPO_DOWNLOAD_COMPLETE_EVENT } from "../../components/sections/shared/DownloadButton";

export function useChatInputState() {
  const { addMessage, isLoading, setIsLoading, selectedModelId, selectedRepositoryId, messages } = useChat();

  // Use custom hooks to manage component state
  const { currentModel, currentRepo, downloadedRepo, repositoryReady, setRepositoryReady, setDownloadedRepo } =
    useEntitySelection(selectedModelId, selectedRepositoryId);

  // Component state
  const [userCanSendMessage, setUserCanSendMessage] = useState<boolean>(true);
  const [waitingForResponse, setWaitingForResponse] = useState<boolean>(false);
  const [repositoryStatus, setRepositoryStatus] = useState<RepositoryStatus | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Refs for timeouts
  const responseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const errorTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Use debounced states to avoid unnecessary re-renders
  const debouncedIsLoading = useDebounce(isLoading, 300);
  const debouncedWaitingForResponse = useDebounce(waitingForResponse, 300);
  const debouncedRepositoryStatus = useDebounce(repositoryStatus, 300);

  // Message submission handling
  const { message, isSubmitting, handleSubmit, handleMessageChange, handleKeyDown, setMessage } = useMessageSubmission({
    addMessage,
    setIsLoading,
    currentModel,
    currentRepo,
    downloadedRepo,
    repositoryReady,
  });

  // Check repository status on component load and when selectedRepositoryId changes
  useEffect(() => {
    if (selectedRepositoryId) {
      const status = getRepositoryStatus(selectedRepositoryId);
      setRepositoryStatus(status);

      // Determine if repository is ready to use
      if (isRepositoryReadyForChat(status)) {
        setRepositoryReady(true);
        setUserCanSendMessage(true);
      } else if (
        status === RepositoryStatus.DOWNLOADING || 
        status === RepositoryStatus.QUEUED || 
        status === RepositoryStatus.INGESTING
      ) {
        setRepositoryReady(false);
        setUserCanSendMessage(false);
      } else {
        setRepositoryReady(false);
      }

      // Set up interval to check status periodically
      const checkStatusInterval = setInterval(() => {
        const currentStatus = getRepositoryStatus(selectedRepositoryId);
        setRepositoryStatus(currentStatus);

        if (isRepositoryReadyForChat(currentStatus)) {
          setRepositoryReady(true);
          setUserCanSendMessage(true);
          clearInterval(checkStatusInterval);
        }
      }, 1000);

      return () => clearInterval(checkStatusInterval);
    }
  }, [selectedRepositoryId, setRepositoryReady]);

  // Listen for suggested prompt error events
  useEffect(() => {
    const handleSuggestedPromptError = (event: Event) => {
      const customEvent = event as CustomEvent;
      setErrorMessage(customEvent.detail?.message || "Cannot use suggestion at this time");

      // Clear error message after a delay
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }

      errorTimeoutRef.current = setTimeout(() => {
        setErrorMessage(null);
      }, 3000);
    };

    window.addEventListener("suggestedPromptError", handleSuggestedPromptError);

    return () => {
      window.removeEventListener("suggestedPromptError", handleSuggestedPromptError);
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
    };
  }, []);

  // Clean up response timeout on unmount
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

        // Check if repository is in a ready state
        if (isRepositoryReadyForChat(downloadedRepository.status)) {
          setRepositoryReady(true);
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
        lastMsg.role === "assistant-informational" &&
        lastMsg.content.includes("repository") &&
        (lastMsg.content.includes("ready to query") || 
         lastMsg.content.includes("successfully ingested") ||
         lastMsg.content.includes("ready to chat"))
      ) {
        setRepositoryReady(true);
        
        // Update status to INGESTED if it's not already in a ready state
        if (repositoryStatus !== RepositoryStatus.READY && repositoryStatus !== RepositoryStatus.INGESTED) {
          setRepositoryStatus(RepositoryStatus.INGESTED);
        }

        // Reset waiting state if this was a response we were waiting for
        if (waitingForResponse) {
          setWaitingForResponse(false);
          setIsLoading(false);
        }

        // Enable user to send messages
        setUserCanSendMessage(true);
      }

      // If we have a user message followed by an assistant/model response, we're no longer waiting
      if (messages.length >= 2) {
        const userMsg = messages[messages.length - 2];
        const responseMsg = messages[messages.length - 1];
        if (
          userMsg.role === "user" &&
          (responseMsg.role === "assistant" ||
            responseMsg.role === "model-response" ||
            responseMsg.role === "assistant-informational")
        ) {
          setWaitingForResponse(false);
          setIsLoading(false);

          // Enable user to send messages
          setUserCanSendMessage(true);
        }
      }
    }
  }, [messages, setIsLoading, waitingForResponse, setRepositoryReady, repositoryStatus]);

  // Determine if the input should be disabled
  const isInputDisabled = isSubmitting || debouncedIsLoading || debouncedWaitingForResponse || !userCanSendMessage;

  // Get a more specific placeholder message depending on the state
  const getPlaceholderMessage = () => {
    if (isInputDisabled) {
      return "Waiting for response...";
    }

    if (!currentModel) {
      return "Please select a model to start chatting";
    }

    if (!currentRepo) {
      return "Please select a repository to analyze";
    }

    if (currentRepo && debouncedRepositoryStatus === RepositoryStatus.DOWNLOADING) {
      return "Repository is being downloaded. Please wait...";
    }

    if (currentRepo && debouncedRepositoryStatus === RepositoryStatus.QUEUED) {
      return "Repository is queued for download. Please wait...";
    }
    
    if (currentRepo && debouncedRepositoryStatus === RepositoryStatus.INGESTING) {
      return "Repository is being processed. Please wait...";
    }

    if (currentModel && currentRepo && isRepositoryReadyForChat(debouncedRepositoryStatus)) {
      return `Ask about the ${currentRepo.name} repository...`;
    }

    return "Ask a question...";
  };

  return {
    message,
    setMessage,
    isInputDisabled,
    currentModel,
    currentRepo,
    repositoryReady,
    repositoryStatus: debouncedRepositoryStatus,
    errorMessage,
    handleSubmit,
    handleMessageChange,
    handleKeyDown,
    getPlaceholderMessage,
  };
}
