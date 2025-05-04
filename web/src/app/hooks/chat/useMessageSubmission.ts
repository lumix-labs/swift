"use client";

import { useState, useRef, useCallback, FormEvent } from "react";
import { LLMModel, Repository } from "../../lib/types/entities";
import { GeminiService } from "../../lib/services/gemini-service";
import { EXCLUDED_MESSAGE_ROLES } from "../../context/chat/types";
import { 
  RepositoryStatus, 
  getRepositoryStatus, 
  isRepositoryReadyForChat 
} from "../../lib/services/repo-download-service";

// Define the DownloadedRepository interface to replace any
interface DownloadedRepository extends Repository {
  localPath?: string;
  downloadDate?: number;
  fileCount?: number;
  size?: number;
  readmeContent?: string;
  repoTree?: string;
  status?: RepositoryStatus;
}

interface UseMessageSubmissionProps {
  addMessage: (message: {
    role: "user" | "assistant" | "assistant-informational" | "model-response";
    content: string;
  }) => void;
  setIsLoading: (loading: boolean) => void;
  currentModel: LLMModel | null;
  currentRepo: Repository | null;
  downloadedRepo: DownloadedRepository | null;
  repositoryReady: boolean;
}

export function useMessageSubmission({
  addMessage,
  setIsLoading,
  currentModel,
  currentRepo,
  downloadedRepo,
  repositoryReady,
}: UseMessageSubmissionProps) {
  const [message, setMessage] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [lastMessage, setLastMessage] = useState<string>("");
  const [waitingForResponse, setWaitingForResponse] = useState<boolean>(false);
  const [userCanSendMessage, setUserCanSendMessage] = useState<boolean>(true);

  const responseTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();

      // Don't submit if the message is empty or if we're already submitting
      const trimmedMessage = message.trim();
      if (!trimmedMessage || isSubmitting || !userCanSendMessage) {
        return;
      }

      // Check if model is selected
      if (!currentModel) {
        addMessage({
          role: "assistant-informational" as const,
          content: "Please select a model from the Models dropdown first.",
        });
        return;
      }

      // Check repository status
      if (currentRepo) {
        const repoStatus = getRepositoryStatus(currentRepo.id);
        if (!isRepositoryReadyForChat(repoStatus)) {
          let statusMessage = "It's not ready yet.";
          
          switch(repoStatus) {
            case RepositoryStatus.DOWNLOADING:
              statusMessage = "It's currently being downloaded.";
              break;
            case RepositoryStatus.QUEUED:
              statusMessage = "It's in the download queue.";
              break;
            case RepositoryStatus.INGESTING:
              statusMessage = "It's currently being processed.";
              break;
            default:
              statusMessage = "Please download it first.";
          }
          
          addMessage({
            role: "assistant-informational" as const,
            content: `Repository ${currentRepo.name} is not ready for chat. ${statusMessage}`,
          });
          return;
        }
      }

      const userMessageContent = trimmedMessage;
      setIsSubmitting(true);
      setIsLoading(true);
      setWaitingForResponse(true);
      setUserCanSendMessage(false); // Disable sending more messages until response is received

      // Clear input field immediately to improve user experience
      setLastMessage(userMessageContent);
      setMessage("");

      // Add the user message to the chat first - this ensures it's visible immediately
      addMessage({
        role: "user" as const,
        content: userMessageContent,
      });

      // Set a safety timeout to reset waiting state after 30 seconds if no response
      if (responseTimeoutRef.current) {
        clearTimeout(responseTimeoutRef.current);
      }

      // Store the current timeout in a local variable for the closure
      const currentTimeout = setTimeout(() => {
        setWaitingForResponse(false);
        setIsLoading(false);
        setIsSubmitting(false);
        setUserCanSendMessage(true); // Re-enable sending messages
      }, 30000);

      // Update the ref
      responseTimeoutRef.current = currentTimeout;

      try {
        let response = "";

        // Use appropriate service based on selected model
        if (currentModel.provider === "gemini") {
          const geminiService = new GeminiService(currentModel.apiKey);

          if (currentRepo && downloadedRepo) {
            // Prepare context data from repository
            const contextData = {
              repoName: currentRepo.name,
              repoUrl: currentRepo.url,
              readmeContent: downloadedRepo.readmeContent || "",
              repoTree: downloadedRepo.repoTree || ""
            };
            
            // Use repository context when available with tree data
            response = await geminiService.sendMessage(
              userMessageContent,
              contextData.repoName,
              contextData.repoUrl,
              contextData.readmeContent,
              contextData.repoTree
            );
          } else {
            // No repository context
            response = await geminiService.sendMessage(userMessageContent);
          }
        } else {
          // Fallback for other providers (e.g., Anthropic)
          response = `Using ${currentModel.name} (${currentModel.provider}):\n\nThis model provider is not yet implemented.`;
        }

        // Add the AI response to the chat with model-response role
        addMessage({
          role: "model-response" as const,
          content: response,
        });

        // Clear the safety timeout
        if (responseTimeoutRef.current === currentTimeout) {
          clearTimeout(responseTimeoutRef.current);
          responseTimeoutRef.current = null;
        }
      } catch (error) {
        // Add an error message
        addMessage({
          role: "assistant-informational" as const,
          content:
            error instanceof Error
              ? `Error: ${error.message}`
              : "Sorry, I encountered an error processing your request. Please try again.",
        });

        // Restore last message so user can retry
        setMessage(lastMessage);
      } finally {
        // Always enable the user to send another message after some processing time
        setTimeout(() => {
          setIsSubmitting(false);
          setIsLoading(false);
          setWaitingForResponse(false);
          setUserCanSendMessage(true);
        }, 800);
      }
    },
    [
      message,
      isSubmitting,
      currentModel,
      currentRepo,
      repositoryReady,
      downloadedRepo,
      addMessage,
      setIsLoading,
      lastMessage,
      userCanSendMessage,
    ],
  );

  const handleMessageChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit(e as unknown as FormEvent);
      }
    },
    [handleSubmit],
  );

  return {
    message,
    setMessage,
    isSubmitting,
    waitingForResponse,
    userCanSendMessage,
    handleSubmit,
    handleMessageChange,
    handleKeyDown,
  };
}
