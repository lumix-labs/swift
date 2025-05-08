"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Repository } from "../../../lib/types/entities";
import { useChat } from "../../../context/ChatContext";
import {
  downloadRepository,
  isRepositoryReady,
  getDownloadedRepository,
  getRepositoryStatus,
  RepositoryStatus,
  updateRepositoryStatus,
  startIngestion,
} from "../../../lib/services/repo-download-service";
import { useDebounce } from "../../../hooks/useDebounce";
import { SenderType, SENDERS } from "../../../lib/types/message";

// Store download status globally to persist between component unmounts
const downloadingRepos = new Map<string, boolean>();
// Map to track the last time a notification was sent for a repository status
const lastNotificationTime = new Map<string, number>();
// Create a custom event for repository downloads
export const REPO_DOWNLOAD_COMPLETE_EVENT = "repoDownloadComplete";
// Create an event for repository state changes
export const REPO_STATE_CHANGE_EVENT = "repoStateChange";
// Create an event for repository errors
export const REPO_ERROR_EVENT = "repoErrorEvent";

interface DownloadButtonProps {
  repository: Repository;
  className?: string;
  isSmooth?: boolean;
}

export function DownloadButton({ repository, className = "", isSmooth = false }: DownloadButtonProps) {
  const { addMessage } = useChat();
  const [repoStatus, setRepoStatus] = useState<RepositoryStatus>(RepositoryStatus.PENDING);
  const [prevStatus, setPrevStatus] = useState<RepositoryStatus>(RepositoryStatus.PENDING);
  const [isDownloading, setIsDownloading] = useState(downloadingRepos.get(repository.id) || false);
  const [actionInProgress, setActionInProgress] = useState(false);
  const [transitionState, setTransitionState] = useState<"idle" | "start" | "downloading" | "ingesting" | "complete">(
    "idle",
  );
  const statusChangeNotified = useRef<Record<string, boolean>>({});

  // Use debounced state to prevent flickering with longer delay
  const debouncedIsDownloading = useDebounce(isDownloading, 500);
  const debouncedRepoStatus = useDebounce(repoStatus, 500);

  // Set UI update lock to prevent component re-rendering during actions
  const lockUIUpdates = useCallback(() => {
    setActionInProgress(true);
    
    // Create a unique identifier for this lock
    const lockId = Date.now().toString();
    
    // Release lock after a timeout to ensure UI stability
    setTimeout(() => {
      setActionInProgress(false);
    }, 800); // 0.8 second lock
    
    // Emergency release after a longer timeout to prevent permanent locks
    setTimeout(() => {
      setActionInProgress(false);
    }, 5000); // 5 second emergency timeout
  }, []);

  // Animate status transitions for smooth UI
  useEffect(() => {
    if (isSmooth) {
      if (debouncedRepoStatus === RepositoryStatus.DOWNLOADING) {
        setTransitionState("start");
        // After a brief delay, show downloading animation
        setTimeout(() => setTransitionState("downloading"), 300);
      } else if (debouncedRepoStatus === RepositoryStatus.INGESTING) {
        setTransitionState("ingesting");
      } else if (debouncedRepoStatus === RepositoryStatus.INGESTED || debouncedRepoStatus === RepositoryStatus.READY) {
        setTransitionState("complete");
      } else {
        setTransitionState("idle");
      }
    }
  }, [debouncedRepoStatus, isSmooth]);

  // Function to check if we should notify about a state change
  const shouldNotifyStateChange = useCallback(
    (repoId: string, oldStatus: RepositoryStatus, newStatus: RepositoryStatus): boolean => {
      // Skip if status hasn't changed
      if (oldStatus === newStatus) {
        console.debug(`Skipping notification for ${repoId}: status unchanged (${oldStatus})`);
        return false;
      }

      // Create a unique key for this repository and status transition
      const notificationKey = `${repoId}-${oldStatus}-${newStatus}`;

      // Check if this specific transition has been notified recently
      if (statusChangeNotified.current[notificationKey]) {
        console.debug(`Skipping notification for ${repoId}: already notified this transition`);
        return false;
      }

      // Check if enough time has passed since the last notification for this repo
      const lastTime = lastNotificationTime.get(repoId) || 0;
      const now = Date.now();
      const timeSinceLastNotification = now - lastTime;

      // Only allow notification if 10 seconds have passed since the last one for this repo
      if (timeSinceLastNotification < 10000) {
        console.debug(`Skipping notification for ${repoId}: too soon (${timeSinceLastNotification}ms)`);
        return false;
      }

      // Update timestamps and mark as notified
      lastNotificationTime.set(repoId, now);
      statusChangeNotified.current[notificationKey] = true;

      // Clear the notification flag after a delay to allow future notifications of the same type
      setTimeout(() => {
        statusChangeNotified.current[notificationKey] = false;
      }, 15000);

      console.info(`Allowing notification for ${repoId}: ${oldStatus} -> ${newStatus}`);
      return true;
    },
    [],
  );

  // Function to notify state change - MODIFIED to remove chat messages
  const notifyStateChange = useCallback(
    (oldStatus: RepositoryStatus, newStatus: RepositoryStatus) => {
      // Only dispatch state change event if the status has actually changed
      // and we should notify about this change
      if (oldStatus !== newStatus && shouldNotifyStateChange(repository.id, oldStatus, newStatus)) {
        console.warn(`Notifying state change for ${repository.id}: ${oldStatus} -> ${newStatus}`);

        // Dispatch the state change event without adding chat messages
        const event = new CustomEvent(REPO_STATE_CHANGE_EVENT, {
          detail: {
            repository,
            oldStatus,
            newStatus,
          },
        });
        window.dispatchEvent(event);
      }
    },
    [repository, shouldNotifyStateChange],
  );

  // Function to notify error - MODIFIED to remove chat messages
  const notifyError = useCallback(
    (error: Error) => {
      // Only notify errors if we haven't recently sent an error for this repo
      if (!shouldNotifyStateChange(repository.id, RepositoryStatus.PENDING, RepositoryStatus.PENDING)) {
        return;
      }

      // Dispatch the error event without adding chat messages
      const event = new CustomEvent(REPO_ERROR_EVENT, {
        detail: {
          repository,
          error,
        },
      });
      window.dispatchEvent(event);
    },
    [repository, shouldNotifyStateChange],
  );

  // Check repository status when the component mounts
  useEffect(() => {
    // Keep track of the last status to avoid unnecessary updates
    let lastCheckedStatus = repoStatus;

    const checkStatus = () => {
      try {
        const status = getRepositoryStatus(repository.id);

        // Only update if the status has actually changed from the last check
        if (lastCheckedStatus !== status) {
          console.warn(`Status changed for ${repository.id}: ${lastCheckedStatus} -> ${status}`);
          notifyStateChange(lastCheckedStatus, status);
          setPrevStatus(lastCheckedStatus);
          setRepoStatus(status);
          lastCheckedStatus = status;
        }

        // Update downloading state based on status
        if (
          status === RepositoryStatus.DOWNLOADING ||
          status === RepositoryStatus.QUEUED ||
          status === RepositoryStatus.INGESTING
        ) {
          setIsDownloading(true);
          downloadingRepos.set(repository.id, true);
        } else if (status === RepositoryStatus.READY || status === RepositoryStatus.INGESTED) {
          setIsDownloading(false);
          downloadingRepos.set(repository.id, false);
        }
      } catch (error) {
        console.error("Error checking repository status:", error);
      }
    };

    // Initial check
    checkStatus();

    // Set up an interval to periodically check status with a longer interval
    // to reduce the frequency of status checks
    const intervalId = setInterval(checkStatus, 3000);
    return () => clearInterval(intervalId);
  }, [repository.id, notifyStateChange]);

  const handleDownload = useCallback(async () => {
    if (
      isDownloading ||
      repoStatus === RepositoryStatus.READY ||
      repoStatus === RepositoryStatus.INGESTED ||
      actionInProgress
    ) {
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
    setPrevStatus(repoStatus);
    setRepoStatus(RepositoryStatus.DOWNLOADING);

    // Add downloading message
    addMessage({
      content: `Downloading repository ${repository.name}. Please wait...`,
      sender: SENDERS[SenderType.SWIFT_ASSISTANT],
      role: "assistant-informational",
    });

    try {
      // Start the download
      const downloadedRepo = await downloadRepository(repository.id, repository.name, repository.url);

      console.warn("Repository downloaded successfully:", repository.id);

      // Update status
      setPrevStatus(repoStatus);
      setRepoStatus(downloadedRepo.status);

      // Dispatch custom event for repository download completion
      // but only dispatch once to prevent duplication
      const key = `${repository.id}-download-complete`;
      if (!statusChangeNotified.current[key]) {
        statusChangeNotified.current[key] = true;

        const event = new CustomEvent(REPO_DOWNLOAD_COMPLETE_EVENT, {
          detail: { repository: downloadedRepo, action: "download" },
        });
        window.dispatchEvent(event);

        setTimeout(() => {
          statusChangeNotified.current[key] = false;
        }, 10000);

        console.warn("Repository download event dispatched:", repository.id);
      }
    } catch (error) {
      console.error("Error downloading repository:", error);

      // Set status back to pending
      updateRepositoryStatus(repository.id, RepositoryStatus.PENDING);
      setPrevStatus(repoStatus);
      setRepoStatus(RepositoryStatus.PENDING);

      // Notify user of the error
      if (error instanceof Error) {
        notifyError(error);
      } else {
        notifyError(new Error("Unknown error occurred while downloading repository"));
      }
    } finally {
      // Even in error case, ensure we reset state properly
      setTimeout(() => {
        setIsDownloading(false);
        downloadingRepos.set(repository.id, false);
      }, 500);
    }
  }, [isDownloading, repoStatus, repository, addMessage, actionInProgress, lockUIUpdates, notifyError]);

  // Get button appearance based on repository status
  const getButtonAppearance = () => {
    const baseClasses = "transition-all duration-300 rounded-md px-3 py-1.5 text-sm font-medium ";

    switch (debouncedRepoStatus) {
      case RepositoryStatus.READY:
      case RepositoryStatus.INGESTED:
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
      case RepositoryStatus.INGESTING:
        return {
          bgClass: baseClasses + "bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-300",
          icon: (
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-1"></div>
          ),
          text: "Processing...",
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
      case "ingesting":
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
