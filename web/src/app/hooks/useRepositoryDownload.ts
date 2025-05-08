"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { REPO_DOWNLOAD_COMPLETE_EVENT, REPO_STATE_CHANGE_EVENT } from "../components/sections/shared/DownloadButton";
import { Repository } from "../lib/types/entities";
import { getRepositories } from "../lib/services/entity-service";
import { useChat } from "../context/ChatContext";
import { useDebounce } from "./useDebounce";
import { SENDERS, SenderType } from "../lib/types/message";
import { RepositoryStatus } from "../lib/services/repo-download-service";

// Store repository state globally to persist between component unmounts
const repositoriesCache = {
  data: [] as Repository[],
  lastUpdated: 0,
};

// Track processed repository events to prevent duplicate handling
const processedRepoEvents = new Map<string, number>();

/**
 * Custom hook to listen for repository download completion events
 * and update UI accordingly with improved debouncing to prevent flickering
 */
export function useRepositoryDownload() {
  const [repositories, setRepositories] = useState<Repository[]>(repositoriesCache.data);
  const { setSelectedRepositoryId } = useChat();
  const updateTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef<boolean>(true);

  // Use a longer debounce time to prevent flickering
  const debouncedRepositories = useDebounce(repositories, 1000); // Increased debounce time

  // On component unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current);
        updateTimerRef.current = null;
      }
    };
  }, []);

  // Helper to check if we should process an event
  const shouldProcessEvent = useCallback((eventType: string, repoId: string): boolean => {
    const eventKey = `${eventType}-${repoId}`;
    const now = Date.now();
    const lastTime = processedRepoEvents.get(eventKey) || 0;

    // Skip if processed recently (within 5 seconds)
    if (now - lastTime < 5000) {
      console.warn(`Skipping recently processed event: ${eventKey}`);
      return false;
    }

    // Mark as processed
    processedRepoEvents.set(eventKey, now);
    return true;
  }, []);

  // Throttled update function to prevent multiple rapid updates
  const updateRepositories = useCallback(() => {
    // Clear any pending update timer
    if (updateTimerRef.current) {
      clearTimeout(updateTimerRef.current);
      updateTimerRef.current = null;
    }

    // Set a new timer for the update with longer delay
    updateTimerRef.current = setTimeout(() => {
      if (!isMountedRef.current) {
        return;
      }

      const now = Date.now();

      // Only fetch repositories if it's been at least 1000ms since the last update
      if (now - repositoriesCache.lastUpdated > 1000) {
        try {
          const updatedRepositories = getRepositories();
          console.warn("Updating repositories with throttle:", updatedRepositories.length);

          // Update both local state and cache
          if (isMountedRef.current) {
            setRepositories(updatedRepositories);
            repositoriesCache.data = updatedRepositories;
            repositoriesCache.lastUpdated = now;
          }
        } catch (error) {
          console.error("Error fetching repositories:", error);
        }
      }

      // Clear the reference after execution
      updateTimerRef.current = null;
    }, 1000); // Increased from 800ms for better stability
  }, []);

  // Load repositories initially
  useEffect(() => {
    const now = Date.now();

    // Only fetch if cache is over 1 second old
    if (now - repositoriesCache.lastUpdated > 1000 || repositoriesCache.data.length === 0) {
      try {
        const initialRepositories = getRepositories();
        console.warn("Initial repositories loaded:", initialRepositories.length);

        if (isMountedRef.current) {
          setRepositories(initialRepositories);
          repositoriesCache.data = initialRepositories;
          repositoriesCache.lastUpdated = now;
        }
      } catch (error) {
        console.error("Error loading initial repositories:", error);
      }
    } else if (repositoriesCache.data.length > 0) {
      console.warn("Using cached repositories:", repositoriesCache.data.length);
    }

    // Clear any lingering update timers when component unmounts
    return () => {
      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current);
        updateTimerRef.current = null;
      }
    };
  }, []);

  // Event handler for repository download completion
  const handleRepoDownloadComplete = useCallback(
    (event: Event) => {
      // Get the downloaded repository from the event
      const customEvent = event as CustomEvent;
      const downloadedRepo = customEvent.detail?.repository;
      const action = customEvent.detail?.action || "download";

      if (downloadedRepo?.id) {
        // Skip if already processed recently
        if (!shouldProcessEvent(REPO_DOWNLOAD_COMPLETE_EVENT, downloadedRepo.id)) {
          return;
        }

        // Log the download/add completion
        console.warn(`Repository ${action} complete:`, downloadedRepo.id);

        // Update the selected repository
        setSelectedRepositoryId(downloadedRepo.id);

        // Use a longer delay before updating repositories to prevent UI flickering
        setTimeout(() => {
          if (isMountedRef.current) {
            // Update repositories with throttling
            updateRepositories();
          }
        }, 1000);
      }
    },
    [setSelectedRepositoryId, updateRepositories, shouldProcessEvent],
  );

  // Event handler for repository state changes
  const handleRepoStateChange = useCallback(
    (event: Event) => {
      // Get the repository state change details from the event
      const customEvent = event as CustomEvent;
      const repository = customEvent.detail?.repository;
      const oldStatus = customEvent.detail?.oldStatus;
      const newStatus = customEvent.detail?.newStatus;

      if (repository?.id) {
        // Skip if already processed recently
        if (!shouldProcessEvent(REPO_STATE_CHANGE_EVENT, repository.id)) {
          return;
        }

        console.warn(`Repository state changed for ${repository.id}:`, oldStatus, "->", newStatus);

        // Update repositories to reflect the new state
        // Use a delay to prevent frequent updates
        setTimeout(() => {
          if (isMountedRef.current) {
            updateRepositories();
          }
        }, 1000);
      }
    },
    [updateRepositories, shouldProcessEvent],
  );

  // Set up and tear down event listeners
  useEffect(() => {
    console.warn("Setting up repository event listeners");

    // Add event listeners
    window.addEventListener(REPO_DOWNLOAD_COMPLETE_EVENT, handleRepoDownloadComplete);
    window.addEventListener(REPO_STATE_CHANGE_EVENT, handleRepoStateChange);

    // Clean up event listeners on unmount
    return () => {
      console.warn("Removing repository event listeners");
      window.removeEventListener(REPO_DOWNLOAD_COMPLETE_EVENT, handleRepoDownloadComplete);
      window.removeEventListener(REPO_STATE_CHANGE_EVENT, handleRepoStateChange);
    };
  }, [handleRepoDownloadComplete, handleRepoStateChange]);

  return {
    repositories: debouncedRepositories, // Return debounced repositories to prevent UI flickering
    updateRepositories,
  };
}
