"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Repository } from "../../../lib/types/entities";
import { useChat } from "../../../context/ChatContext";
import {
  downloadRepository,
  isRepositoryDownloaded,
  getDownloadedRepository,
  getRepositoryStatus,
  RepositoryStatus,
  updateRepositoryStatus,
} from "../../../lib/services/repo-download-service";
import { useDebounce } from "../../../hooks/useDebounce";

// Store download status globally to persist between component unmounts
const downloadingRepos = new Map<string, boolean>();
// Create a custom event for repository downloads
export const REPO_DOWNLOAD_COMPLETE_EVENT = "repoDownloadComplete";

interface DownloadButtonProps {
  repository: Repository;
  className?: string;
  isSmooth?: boolean;
}

export function DownloadButton({ repository, className = "", isSmooth = false }: DownloadButtonProps) {
  const { addMessage } = useChat();
  const [repoStatus, setRepoStatus] = useState<RepositoryStatus>(RepositoryStatus.PENDING);
  const [isDownloading, setIsDownloading] = useState(downloadingRepos.get(repository.id) || false);
  const [actionInProgress, setActionInProgress] = useState(false);
  const [transitionState, setTransitionState] = useState<"idle" | "start" | "downloading" | "complete">("idle");

  // Use debounced state to prevent flickering with longer delay
  const debouncedIsDownloading = useDebounce(isDownloading, 500);
  const debouncedRepoStatus = useDebounce(repoStatus, 500);

  // Set UI update lock to prevent component re-rendering during actions
  const lockUIUpdates = useCallback(() => {
    setActionInProgress(true);
    // Release lock after a timeout to ensure UI stability
    setTimeout(() => {
      setActionInProgress(false);
    }, 800); // 0.8 second lock
  }, []);

  // Animate status transitions for smooth UI
  useEffect(() => {
    if (isSmooth) {
      if (debouncedRepoStatus === RepositoryStatus.DOWNLOADING) {
        setTransitionState("start");
        // After a brief delay, show downloading animation
        setTimeout(() => setTransitionState("downloading"), 300);
      } else if (debouncedRepoStatus === RepositoryStatus.READY) {
        setTransitionState("complete");
      } else {
        setTransitionState("idle");
      }
    }
  }, [debouncedRepoStatus, isSmooth]);

  // Check repository status when the component mounts
  useEffect(() => {
    const checkStatus = () => {
      try {
        const status = getRepositoryStatus(repository.id);
        setRepoStatus(status);

        // If status is downloading, update the local isDownloading state
        if (status === RepositoryStatus.DOWNLOADING || status === RepositoryStatus.QUEUED) {
          setIsDownloading(true);
          downloadingRepos.set(repository.id, true);
        } else if (status === RepositoryStatus.READY) {
          setIsDownloading(false);
          downloadingRepos.set(repository.id, false);
        }
      } catch (error) {
        console.error("Error checking repository status:", error);
      }
    };

    checkStatus();

    // Set up an interval to periodically check status
    const intervalId = setInterval(checkStatus, 2000);
    return () => clearInterval(intervalId);
  }, [repository.id]);

  const handleDownload = useCallback(async () => {
    if (isDownloading || repoStatus === RepositoryStatus.READY || actionInProgress) {
      console.warn("Repository is already downloaded or downloading:", repository.id);
      return;
    }

    // Lock UI updates to prevent flickering
    lockUIUpdates();

    console.warn("Starting repository download:", repository.id);
    setIsDownloading(true);
    downloadingRepos.set(repository.id, true);

    // Update status to downloading
    updateRepositoryStatus(repository.id, RepositoryStatus.DOWNLOADING);
    setRepoStatus(RepositoryStatus.DOWNLOADING);

    // Add downloading message
    addMessage({
      role: "assistant-informational",
      content: `Downloading repository ${repository.name}. Please wait...`,
    });

    try {
      // Start the download
      const downloadedRepo = await downloadRepository(repository.id, repository.name, repository.url);

      console.warn("Repository downloaded successfully:", repository.id);
      setRepoStatus(RepositoryStatus.READY);

      // Add a longer delay before sending events to ensure UI updates properly
      setTimeout(() => {
        // Dispatch custom event for repository download completion
        const event = new CustomEvent(REPO_DOWNLOAD_COMPLETE_EVENT, {
          detail: { repository: downloadedRepo, action: "download" },
        });
        window.dispatchEvent(event);

        // Notify user when download is complete
        addMessage({
          role: "assistant-informational",
          content: `Repository ${repository.name} has been successfully ingested and is ready to query!`,
        });

        console.warn("Repository download events dispatched:", repository.id);
      }, 800); // Increased delay for stability
    } catch (error) {
      console.error("Error downloading repository:", error);

      // Set status back to pending
      updateRepositoryStatus(repository.id, RepositoryStatus.PENDING);
      setRepoStatus(RepositoryStatus.PENDING);

      // Notify user of the error
      addMessage({
        role: "assistant-informational",
        content: `Error downloading repository ${repository.name}: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    } finally {
      // Even in error case, ensure we reset state properly
      setTimeout(() => {
        setIsDownloading(false);
        downloadingRepos.set(repository.id, false);
      }, 500);
    }
  }, [isDownloading, repoStatus, repository, addMessage, actionInProgress, lockUIUpdates]);

  // Get button appearance based on repository status
  const getButtonAppearance = () => {
    const baseClasses = "transition-all duration-300 rounded-md px-3 py-1.5 text-sm font-medium ";

    switch (debouncedRepoStatus) {
      case RepositoryStatus.READY:
        return {
          bgClass:
            baseClasses +
            "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800",
          icon: (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 transition-transform duration-300"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          ),
          text: "Ready to Chat",
          disabled: true,
        };
      case RepositoryStatus.DOWNLOADING:
        return {
          bgClass: baseClasses + "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-300",
          icon: (
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-1"></div>
          ),
          text: "Downloading...",
          disabled: true,
        };
      case RepositoryStatus.QUEUED:
        return {
          bgClass: baseClasses + "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300",
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                clipRule="evenodd"
              />
            </svg>
          ),
          text: "In Queue",
          disabled: true,
        };
      default:
        return {
          bgClass:
            baseClasses +
            "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700",
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          ),
          text: "Download",
          disabled: false,
        };
    }
  };

  const buttonAppearance = getButtonAppearance();

  // Use transition classes based on state for smooth animations
  const getTransitionClasses = () => {
    if (!isSmooth) {
      return "";
    }

    switch (transitionState) {
      case "start":
        return "opacity-70 scale-95";
      case "downloading":
        return "opacity-100 scale-100";
      case "complete":
        return "opacity-100 scale-100 transform-gpu";
      default:
        return "";
    }
  };

  return (
    <button
      onClick={handleDownload}
      disabled={buttonAppearance.disabled || debouncedIsDownloading || actionInProgress}
      className={`flex items-center justify-center space-x-1.5 
        ${buttonAppearance.bgClass} 
        ${getTransitionClasses()} ${className}`}
    >
      {buttonAppearance.icon}
      <span>{buttonAppearance.text}</span>
    </button>
  );
}
