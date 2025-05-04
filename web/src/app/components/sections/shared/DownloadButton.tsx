"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Repository } from '../../../lib/types/entities';
import { useChat } from '../../../context/ChatContext';
import {
  downloadRepository,
  isRepositoryDownloaded,
  getDownloadedRepository
} from '../../../lib/services/repo-download-service';
import { useDebounce } from '../../../hooks/useDebounce';

// Store download status globally to persist between component unmounts
const downloadingRepos = new Map<string, boolean>();
// Create a custom event for repository downloads
export const REPO_DOWNLOAD_COMPLETE_EVENT = 'repoDownloadComplete';

interface DownloadButtonProps {
  repository: Repository;
  className?: string;
}

export function DownloadButton({ repository, className = '' }: DownloadButtonProps) {
  const { addMessage } = useChat();
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [isDownloading, setIsDownloading] = useState(downloadingRepos.get(repository.id) || false);
  const [readmeCharCount, setReadmeCharCount] = useState<number | null>(null);
  const [actionInProgress, setActionInProgress] = useState(false);
  
  // Use debounced state to prevent flickering with longer delay
  const debouncedIsDownloading = useDebounce(isDownloading, 800);
  const debouncedIsDownloaded = useDebounce(isDownloaded, 800);

  // Set UI update lock to prevent component re-rendering during actions
  const lockUIUpdates = useCallback(() => {
    setActionInProgress(true);
    // Release lock after a timeout to ensure UI stability
    setTimeout(() => {
      setActionInProgress(false);
    }, 1000); // 1 second lock
  }, []);

  // Check if the repository is already downloaded when the component mounts
  useEffect(() => {
    const checkDownloadStatus = () => {
      try {
        const downloaded = isRepositoryDownloaded(repository.id);
        setIsDownloaded(downloaded);

        if (downloaded) {
          const repo = getDownloadedRepository(repository.id);
          if (repo?.readmeCharCount) {
            setReadmeCharCount(repo.readmeCharCount);
          }
        }

        // Check global download status
        if (downloadingRepos.has(repository.id)) {
          setIsDownloading(downloadingRepos.get(repository.id) || false);
        }
      } catch (error) {
        console.error('Error checking download status:', error);
      }
    };

    checkDownloadStatus();

    // Set up an interval to periodically check status
    const intervalId = setInterval(checkDownloadStatus, 2000);
    
    return () => clearInterval(intervalId);
  }, [repository.id]);

  const handleDownload = useCallback(async () => {
    if (isDownloading || isDownloaded || actionInProgress) {
      console.warn('Already downloading or downloaded repository:', repository.id);
      return;
    }

    // Lock UI updates to prevent flickering
    lockUIUpdates();

    console.warn('Starting repository download:', repository.id);
    setIsDownloading(true);
    downloadingRepos.set(repository.id, true);

    try {
      // Start the download but don't await it immediately to unblock the UI
      const downloadPromise = downloadRepository(
        repository.id,
        repository.name,
        repository.url
      );

      // Add downloading message
      addMessage({
        role: 'assistant',
        content: `Downloading repository ${repository.name}. Please wait...`
      });

      // Now await the download completion
      const downloadedRepo = await downloadPromise;

      console.warn('Repository downloaded successfully:', repository.id);
      setIsDownloaded(true);
      setReadmeCharCount(downloadedRepo.readmeCharCount || 0);
      
      // Add a longer delay before sending events to ensure UI updates properly
      setTimeout(() => {
        // Dispatch custom event for repository download completion
        const event = new CustomEvent(REPO_DOWNLOAD_COMPLETE_EVENT, {
          detail: { repository: downloadedRepo, action: 'download' }
        });
        window.dispatchEvent(event);
        
        // Notify user when download is complete
        addMessage({
          role: 'assistant',
          content: `Repository ${repository.name} has been successfully ingested and is ready to query!`
        });
        
        console.warn('Repository download events dispatched:', repository.id);
      }, 800); // Increased delay for stability
    } catch (error) {
      console.error('Error downloading repository:', error);
      
      // Notify user of the error
      addMessage({
        role: 'assistant',
        content: `Error downloading repository ${repository.name}: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      // Even in error case, ensure we reset state properly
      setTimeout(() => {
        setIsDownloading(false);
        downloadingRepos.set(repository.id, false);
      }, 500);
    }
  }, [isDownloading, isDownloaded, repository, addMessage, actionInProgress, lockUIUpdates]);

  return (
    <button
      onClick={handleDownload}
      disabled={debouncedIsDownloading || debouncedIsDownloaded || actionInProgress}
      className={`flex items-center justify-center space-x-1.5 
        ${debouncedIsDownloaded
          ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800'
          : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700'
        } 
        transition-colors rounded-md px-3 py-1.5 text-sm font-medium ${className}`}
    >
      {debouncedIsDownloading ? (
        <>
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-1"></div>
          <span>Downloading...</span>
        </>
      ) : debouncedIsDownloaded ? (
        <>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          <span>Downloaded</span>
          {readmeCharCount !== null && (
            <span className="ml-1 text-xs bg-white/30 dark:bg-black/30 px-1.5 py-0.5 rounded">
              {readmeCharCount} chars in README
            </span>
          )}
        </>
      ) : (
        <>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
          <span>Download</span>
        </>
      )}
    </button>
  );
}
