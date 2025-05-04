"use client";

import { useEffect, useState, useCallback, useRef } from 'react';
import { REPO_DOWNLOAD_COMPLETE_EVENT } from '../components/sections/shared/DownloadButton';
import { Repository } from '../lib/types/entities';
import { getRepositories } from '../lib/services/entity-service';
import { useChat } from '../context/ChatContext';
import { useDebounce } from './useDebounce';

// Store repository state globally to persist between component unmounts
const repositoriesCache = {
  data: [] as Repository[],
  lastUpdated: 0
};

/**
 * Custom hook to listen for repository download completion events
 * and update UI accordingly with improved debouncing to prevent flickering
 */
export function useRepositoryDownload() {
  const [repositories, setRepositories] = useState<Repository[]>(repositoriesCache.data);
  const { setSelectedRepositoryId, addMessage } = useChat();
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
      
      // Only fetch repositories if it's been at least 800ms since the last update
      if (now - repositoriesCache.lastUpdated > 800) {
        try {
          const updatedRepositories = getRepositories();
          console.warn('Updating repositories with throttle:', updatedRepositories.length);
          
          // Update both local state and cache
          if (isMountedRef.current) {
            setRepositories(updatedRepositories);
            repositoriesCache.data = updatedRepositories;
            repositoriesCache.lastUpdated = now;
          }
        } catch (error) {
          console.error('Error fetching repositories:', error);
        }
      }
      
      // Clear the reference after execution
      updateTimerRef.current = null;
    }, 800); // Increased from 500ms for better stability
  }, []);

  // Load repositories initially
  useEffect(() => {
    const now = Date.now();
    
    // Only fetch if cache is over 1 second old
    if (now - repositoriesCache.lastUpdated > 1000 || repositoriesCache.data.length === 0) {
      try {
        const initialRepositories = getRepositories();
        console.warn('Initial repositories loaded:', initialRepositories.length);
        
        if (isMountedRef.current) {
          setRepositories(initialRepositories);
          repositoriesCache.data = initialRepositories;
          repositoriesCache.lastUpdated = now;
        }
      } catch (error) {
        console.error('Error loading initial repositories:', error);
      }
    } else if (repositoriesCache.data.length > 0) {
      console.warn('Using cached repositories:', repositoriesCache.data.length);
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
  const handleRepoDownloadComplete = useCallback((event: Event) => {
    // Get the downloaded repository from the event
    const customEvent = event as CustomEvent;
    const downloadedRepo = customEvent.detail?.repository;
    const action = customEvent.detail?.action || 'download';
    
    if (downloadedRepo?.id) {
      // Log the download/add completion
      console.warn(`Repository ${action} complete:`, downloadedRepo.id);
      
      // Update the selected repository
      setSelectedRepositoryId(downloadedRepo.id);
      
      // Add message for repository download (if not already added by DownloadButton)
      if (action === 'download') {
        // Note: Message is now handled in DownloadButton.tsx
        console.warn('Repository download notification handled by DownloadButton');
      } else if (action === 'add') {
        // Notify for repository addition
        setTimeout(() => {
          addMessage({
            role: 'assistant',
            content: `Repository ${downloadedRepo.name} has been added. You can download it using the download button in the repositories dropdown.`
          });
        }, 500);
      }
      
      // Use a longer delay before updating repositories to prevent UI flickering
      setTimeout(() => {
        if (isMountedRef.current) {
          // Update repositories with throttling
          updateRepositories();
        }
      }, 800);
    }
  }, [setSelectedRepositoryId, updateRepositories, addMessage]);

  // Set up and tear down event listener
  useEffect(() => {
    console.warn('Setting up repository download event listener');
    
    // Add event listener for repository download completion
    window.addEventListener(REPO_DOWNLOAD_COMPLETE_EVENT, handleRepoDownloadComplete);

    // Clean up event listener on unmount
    return () => {
      console.warn('Removing repository download event listener');
      window.removeEventListener(REPO_DOWNLOAD_COMPLETE_EVENT, handleRepoDownloadComplete);
    };
  }, [handleRepoDownloadComplete]);

  return {
    repositories: debouncedRepositories, // Return debounced repositories to prevent UI flickering
    updateRepositories
  };
}
