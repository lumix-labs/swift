"use client";

import { useEffect, useCallback } from 'react';
import { REPO_DOWNLOAD_COMPLETE_EVENT } from '../../components/sections/shared/DownloadButton';
import { Repository } from '../../lib/types/entities';
import { Message } from '../../context/chat/types';

// Define downloaded repository interface to replace 'any'
interface DownloadedRepository extends Repository {
  localPath?: string;
  downloadDate?: number;
  fileCount?: number;
  size?: number;
  readmeContent?: string;
}

interface UseRepositoryEventsProps {
  selectedRepositoryId: string | null;
  setRepositoryReady: (ready: boolean) => void;
  setDownloadedRepo: (repo: DownloadedRepository | null) => void;
  setUserCanSendMessage: (canSend: boolean) => void;
}

export function useRepositoryEvents({
  selectedRepositoryId,
  setRepositoryReady,
  setDownloadedRepo,
  setUserCanSendMessage
}: UseRepositoryEventsProps) {
  // Function to handle repository-ready messages
  const handleRepositoryReadyMessages = useCallback((messages: Message[]) => {
    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      
      // Check if the message indicates repository readiness
      if (lastMsg.role === 'assistant' && lastMsg.content.includes('repository') && 
          (lastMsg.content.includes('ready to query') || lastMsg.content.includes('successfully ingested'))) {
        setRepositoryReady(true);
        setUserCanSendMessage(true);
      }
      
      // If we have a user message followed by an assistant message, we're no longer waiting
      if (messages.length >= 2) {
        const userMsg = messages[messages.length - 2];
        const assistantMsg = messages[messages.length - 1];
        if (userMsg.role === 'user' && assistantMsg.role === 'assistant') {
          setUserCanSendMessage(true);
        }
      }
    }
  }, [setRepositoryReady, setUserCanSendMessage]);

  // Listen for repository download completion
  useEffect(() => {
    const handleRepoDownloadComplete = (event: Event) => {
      const customEvent = event as CustomEvent;
      const downloadedRepository = customEvent.detail?.repository as DownloadedRepository;
      const action = customEvent.detail?.action || 'download';
      
      if (downloadedRepository && downloadedRepository.id === selectedRepositoryId) {
        setDownloadedRepo(downloadedRepository);
        
        // Only set repository as ready if it was downloaded (not just added)
        if (action === 'download') {
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
  }, [selectedRepositoryId, setRepositoryReady, setDownloadedRepo, setUserCanSendMessage]);

  return { handleRepositoryReadyMessages };
}
