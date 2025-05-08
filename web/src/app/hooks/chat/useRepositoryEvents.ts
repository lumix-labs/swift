"use client";

import { useEffect, useCallback, useRef } from "react";
import {
  REPO_DOWNLOAD_COMPLETE_EVENT,
  REPO_STATE_CHANGE_EVENT,
  REPO_ERROR_EVENT,
} from "../../components/sections/shared/DownloadButton";
import { Message, MessageRole } from "../../lib/types/message";
import { RepositoryStatus } from "../../lib/services/repo-download-service";
import { DownloadedRepository } from "../../types/repository";
import { SenderType, SENDERS } from "../../lib/types/message";

interface UseRepositoryEventsProps {
  selectedRepositoryId: string | null;
  setRepositoryReady: (ready: boolean) => void;
  setDownloadedRepo: (repo: DownloadedRepository | null) => void;
  setUserCanSendMessage: (canSend: boolean) => void;
  addMessage?: (
    message: { role: MessageRole | string; content: string; sender?: any; id?: string; timestamp?: Date },
  ) => void;
}

export function useRepositoryEvents({
  selectedRepositoryId,
  setRepositoryReady,
  setDownloadedRepo,
  setUserCanSendMessage,
  addMessage,
}: UseRepositoryEventsProps) {
  // Track repository state changes to avoid duplicate messages
  const processedEvents = useRef<Record<string, boolean>>({});
  const lastEventTime = useRef<Record<string, number>>({});
  const lastMessageContent = useRef<Record<string, string>>({});
  const messageSent = useRef<Record<string, boolean>>({});
  const readyMessagesProcessed = useRef<Record<string, boolean>>({});

  // Function to handle repository-ready messages
  const handleRepositoryReadyMessages = useCallback(
    (messages: Message[]) => {
      if (!selectedRepositoryId || !messages.length) return;
      
      // Only process messages once per repository
      if (readyMessagesProcessed.current[selectedRepositoryId]) {
        return;
      }
      
      const lastMsg = messages[messages.length - 1];

      // Check if the message indicates repository readiness
      if (
        lastMsg.role === "assistant" &&
        lastMsg.content.includes("repository") &&
        (lastMsg.content.includes("ready to query") || 
         lastMsg.content.includes("successfully ingested") ||
         lastMsg.content.includes("has been selected"))
      ) {
        setRepositoryReady(true);
        setUserCanSendMessage(true);
        readyMessagesProcessed.current[selectedRepositoryId] = true;
        
        console.info(`[RepoEvents] Repository ready message detected for ${selectedRepositoryId}`);
      }

      // If we have a user message followed by an assistant message, we're no longer waiting
      if (messages.length >= 2) {
        const userMsg = messages[messages.length - 2];
        const assistantMsg = messages[messages.length - 1];
        if (userMsg.role === "user" && assistantMsg.role === "assistant") {
          setUserCanSendMessage(true);
        }
      }
    },
    [selectedRepositoryId, setRepositoryReady, setUserCanSendMessage],
  );

  // Reset readyMessagesProcessed when repository changes
  useEffect(() => {
    if (selectedRepositoryId) {
      readyMessagesProcessed.current = {};
    }
  }, [selectedRepositoryId]);

  // Helper to check if we should process an event
  const shouldProcessEvent = useCallback((eventType: string, repoId: string, status?: string): boolean => {
    const now = Date.now();
    const eventKey = `${eventType}-${repoId}${status ? `-${status}` : ''}`;
    
    // If we've already processed this exact event, ignore it
    if (processedEvents.current[eventKey]) {
      console.debug(`[RepoEvents] Ignoring duplicate event: ${eventKey}`);
      return false;
    }
    
    // Check if enough time has passed since the last similar event
    const lastTime = lastEventTime.current[eventType + repoId] || 0;
    if (now - lastTime < 10000) {  // Increased from 5000ms to 10000ms
      console.debug(`[RepoEvents] Event too soon after last: ${eventKey} (${now - lastTime}ms)`);
      return false;
    }
    
    // Update tracking info
    lastEventTime.current[eventType + repoId] = now;
    processedEvents.current[eventKey] = true;
    
    // Clear the processed flag after a delay
    setTimeout(() => {
      processedEvents.current[eventKey] = false;
    }, 15000);  // Increased from 10000ms to 15000ms
    
    console.info(`[RepoEvents] Processing event: ${eventKey}`);
    return true;
  }, []);

  // Helper to check if we should send a chat message
  const shouldSendChatMessage = useCallback((repoId: string, content: string, messageType: string): boolean => {
    // Create a unique key for this repository and message type
    const messageKey = `${repoId}-${messageType}`;
    
    // If we've already sent this type of message for this repository, don't send it again
    if (messageSent.current[messageKey]) {
      console.debug(`[RepoEvents] Already sent ${messageType} message for ${repoId}`);
      return false;
    }
    
    // If the content is the same as the last message for this repo, don't send it
    if (lastMessageContent.current[repoId] === content) {
      console.debug(`[RepoEvents] Skipping duplicate message content for ${repoId}`);
      return false;
    }
    
    // Store the message content for deduplication
    lastMessageContent.current[repoId] = content;
    messageSent.current[messageKey] = true;
    
    // Reset the message sent flag after a delay
    setTimeout(() => {
      messageSent.current[messageKey] = false;
    }, 20000);  // 20 second timeout before allowing the same message type again
    
    console.info(`[RepoEvents] Sending ${messageType} message for ${repoId}`);
    return true;
  }, []);

  // Listen for repository download completion
  useEffect(() => {
    const handleRepoDownloadComplete = (event: Event) => {
      const customEvent = event as CustomEvent;
      const downloadedRepository = customEvent.detail?.repository as DownloadedRepository;
      const action = customEvent.detail?.action || "download";
      
      if (!downloadedRepository || downloadedRepository.id !== selectedRepositoryId) {
        return;
      }
      
      // Check if we should process this event
      if (!shouldProcessEvent(REPO_DOWNLOAD_COMPLETE_EVENT, downloadedRepository.id, action)) {
        return;
      }

      console.info(`[RepoEvents] Processing download complete event for ${downloadedRepository.id}`);
      
      // Ensure the status property is set to maintain type compatibility
      if (!downloadedRepository.status) {
        downloadedRepository.status = RepositoryStatus.READY;
      }

      setDownloadedRepo(downloadedRepository);

      // Only set repository as ready if it was downloaded (not just added)
      if (action === "download") {
        setRepositoryReady(true);
        setUserCanSendMessage(true);
        
        // Add repository ready message
        if (addMessage) {
          const content = `Repository "${downloadedRepository.name}" has been selected. You can now ask questions about this repository.`;
          
          if (shouldSendChatMessage(downloadedRepository.id, content, "ready")) {
            addMessage({
              content,
              sender: SENDERS[SenderType.SWIFT_ASSISTANT],
              role: "assistant",
              id: crypto.randomUUID(),
              timestamp: new Date(),
            });
          }
        }
      }
    };

    // Handler for repository state changes
    const handleRepoStateChange = (event: Event) => {
      const customEvent = event as CustomEvent;
      const repository = customEvent.detail?.repository;
      const oldStatus = customEvent.detail?.oldStatus;
      const newStatus = customEvent.detail?.newStatus;
      
      if (!repository || repository.id !== selectedRepositoryId) {
        return;
      }
      
      // Skip processing if this is a duplicate event
      if (!shouldProcessEvent(REPO_STATE_CHANGE_EVENT, repository.id, `${oldStatus}-${newStatus}`)) {
        return;
      }

      console.info(`[RepoEvents] Processing state change event for ${repository.id}: ${oldStatus} -> ${newStatus}`);
      
      // Update UI based on new status
      if (newStatus === RepositoryStatus.READY || newStatus === RepositoryStatus.INGESTED) {
        setRepositoryReady(true);
        setUserCanSendMessage(true);
        
        // Add repository ready message
        if (addMessage) {
          const content = `Repository "${repository.name}" has been selected. You can now ask questions about this repository.`;
          
          if (shouldSendChatMessage(repository.id, content, "ready")) {
            addMessage({
              content,
              sender: SENDERS[SenderType.SWIFT_ASSISTANT],
              role: "assistant",
              id: crypto.randomUUID(),
              timestamp: new Date(),
            });
          }
        }
      } else if (newStatus === RepositoryStatus.PENDING) {
        setRepositoryReady(false);
        
        // Add pending message
        if (addMessage && oldStatus !== RepositoryStatus.PENDING) {
          const content = `Repository ${repository.name} is now in a pending state.`;
          
          if (shouldSendChatMessage(repository.id, content, "pending")) {
            addMessage({
              content,
              sender: SENDERS[SenderType.SWIFT_ASSISTANT],
              role: "assistant-informational",
              id: crypto.randomUUID(),
              timestamp: new Date(),
            });
          }
        }
      } else if (newStatus === RepositoryStatus.INGESTING) {
        // Add ingesting message
        if (addMessage) {
          const content = `Processing repository ${repository.name}. Creating repository tree (respecting .gitignore)...`;
          
          if (shouldSendChatMessage(repository.id, content, "ingesting")) {
            addMessage({
              content,
              sender: SENDERS[SenderType.SWIFT_ASSISTANT],
              role: "assistant-informational",
              id: crypto.randomUUID(),
              timestamp: new Date(),
            });
          }
        }
      }
    };

    // Handler for repository errors
    const handleRepoError = (event: Event) => {
      const customEvent = event as CustomEvent;
      const repository = customEvent.detail?.repository;
      const error = customEvent.detail?.error;
      
      if (!repository || repository.id !== selectedRepositoryId) {
        return;
      }
      
      // Skip processing if this is a duplicate error
      if (!shouldProcessEvent(REPO_ERROR_EVENT, repository.id, error?.message)) {
        return;
      }

      console.info(`[RepoEvents] Processing error event for ${repository.id}: ${error?.message}`);
      
      // Reset repository state on error
      setRepositoryReady(false);
      setUserCanSendMessage(true); // Allow user to try another repo

      // Add error message to chat if addMessage is available
      if (addMessage && error) {
        // Handle specific error cases with more user-friendly messages
        let errorMessage = error.message;

        if (errorMessage.includes("404") || errorMessage.includes("not found")) {
          errorMessage = `Repository "${repository.name}" not found. Please check that the repository exists and is public.`;
        } else if (errorMessage.includes("Failed to download")) {
          errorMessage = `Could not download repository "${repository.name}". ${errorMessage}`;
        }
        
        const content = `Error: ${errorMessage}`;
        
        if (shouldSendChatMessage(repository.id, content, "error")) {
          addMessage({
            content,
            sender: SENDERS[SenderType.SWIFT_ASSISTANT],
            role: "assistant-informational",
            id: crypto.randomUUID(),
            timestamp: new Date(),
          });
        }
      }
    };

    // Add event listeners
    window.addEventListener(REPO_DOWNLOAD_COMPLETE_EVENT, handleRepoDownloadComplete);
    window.addEventListener(REPO_STATE_CHANGE_EVENT, handleRepoStateChange);
    window.addEventListener(REPO_ERROR_EVENT, handleRepoError);

    // Clean up
    return () => {
      window.removeEventListener(REPO_DOWNLOAD_COMPLETE_EVENT, handleRepoDownloadComplete);
      window.removeEventListener(REPO_STATE_CHANGE_EVENT, handleRepoStateChange);
      window.removeEventListener(REPO_ERROR_EVENT, handleRepoError);
    };
  }, [selectedRepositoryId, setRepositoryReady, setDownloadedRepo, setUserCanSendMessage, addMessage, shouldProcessEvent, shouldSendChatMessage]);

  return { handleRepositoryReadyMessages };
}
