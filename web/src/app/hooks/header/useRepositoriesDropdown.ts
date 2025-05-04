"use client";

import { useState, useCallback } from "react";
import { addRepository, removeRepository } from "../../lib/services/entity-service";
import { useChat } from "../../context/ChatContext";
import { useRepositoryDownload } from "../useRepositoryDownload";

export function useRepositoriesDropdown() {
  const { selectedRepositoryId, setSelectedRepositoryId, addMessage } = useChat();
  const { repositories, updateRepositories } = useRepositoryDownload();
  const [showAddModal, setShowAddModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isActionInProgress, setIsActionInProgress] = useState(false);
  
  // Set UI update lock to prevent component re-rendering during actions
  const lockUIUpdates = useCallback(() => {
    setIsActionInProgress(true);
    // Release lock after a timeout to ensure UI stability
    setTimeout(() => {
      setIsActionInProgress(false);
    }, 1000); // 1 second lock
  }, []);

  const handleAddClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowAddModal(true);
    return true; // Return true to indicate dropdown should close
  }, []);

  const handleRepositorySave = useCallback((repoUrl: string) => {
    if (isActionInProgress) {
      return;
    }

    // Lock UI updates to prevent flickering
    lockUIUpdates();
    
    // Set updating flag to prevent UI flickering
    setIsUpdating(true);
    
    try {
      // Extract name from URL and add repository
      const name = repoUrl.split('/').pop() || 'Repository';
      const newRepo = addRepository(name);
      
      // Automatically select the newly added repository
      setSelectedRepositoryId(newRepo.id);
      
      // Add a notification message after a short delay to ensure proper sequencing
      setTimeout(() => {
        addMessage({
          role: 'assistant',
          content: `Repository "${newRepo.name}" has been added. It will be downloaded and indexed when you send your first message.`
        });
      
        // Use a timer to delay the UI update to prevent flickering
        updateRepositories();
        
        // Reset updating flag after state is updated
        setTimeout(() => {
          setIsUpdating(false);
        }, 500);
      }, 500);
    } catch (error) {
      console.error('Error adding repository:', error);
      
      // Add an error message if there was a problem
      addMessage({
        role: 'assistant',
        content: `Error adding repository: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
      
      setIsUpdating(false);
    }
  }, [setSelectedRepositoryId, updateRepositories, addMessage, isActionInProgress, lockUIUpdates]);

  const handleRepositoryRemove = useCallback((id: string) => {
    if (isActionInProgress) {
      return;
    }

    // Lock UI updates to prevent flickering
    lockUIUpdates();
    
    // Set updating flag to prevent UI flickering
    setIsUpdating(true);
    
    try {
      // Get repository name before removal
      const repo = repositories.find(r => r.id === id);
      const repoName = repo?.name || 'Repository';
      
      removeRepository(id);
      
      // If the removed repository was selected, clear the selection
      if (id === selectedRepositoryId) {
        setSelectedRepositoryId(null);
        
        // Add a notification message after a short delay to ensure proper sequencing
        setTimeout(() => {
          addMessage({
            role: 'assistant',
            content: `Repository "${repoName}" has been removed. Please select another repository or continue chatting without one.`
          });
        }, 300);
      } else {
        // Add a notification message after a short delay to ensure proper sequencing
        setTimeout(() => {
          addMessage({
            role: 'assistant',
            content: `Repository "${repoName}" has been removed.`
          });
        }, 300);
      }
      
      // Use a timer to delay the UI update to prevent flickering
      setTimeout(() => {
        // Trigger event to update repositories list with debouncing
        updateRepositories();
        
        // Reset updating flag after state is updated
        setTimeout(() => {
          setIsUpdating(false);
        }, 500);
      }, 500);
    } catch (error) {
      console.error('Error removing repository:', error);
      setIsUpdating(false);
    }
  }, [selectedRepositoryId, setSelectedRepositoryId, updateRepositories, repositories, addMessage, isActionInProgress, lockUIUpdates]);

  const handleRepositorySelect = useCallback((id: string) => {
    if (isActionInProgress) {
      return;
    }

    // Lock UI updates to prevent flickering
    lockUIUpdates();
    
    // Get repository name for notification
    const repo = repositories.find(r => r.id === id);
    const repoName = repo?.name || 'Repository';
    
    setSelectedRepositoryId(id);
    
    // Add a notification message after a short delay to ensure proper sequencing
    setTimeout(() => {
      addMessage({
        role: 'assistant',
        content: `Repository "${repoName}" has been selected. You can now ask questions about this repository.`
      });
    }, 300);
    
    return true; // Return true to indicate dropdown should close
  }, [setSelectedRepositoryId, repositories, addMessage, isActionInProgress, lockUIUpdates]);

  const handleClearRepository = useCallback(() => {
    if (isActionInProgress || !selectedRepositoryId) {
      return;
    }

    // Lock UI updates to prevent flickering
    lockUIUpdates();
    
    // Get repository name for notification
    const repo = repositories.find(r => r.id === selectedRepositoryId);
    const repoName = repo?.name || 'Repository';
    
    setSelectedRepositoryId(null);
    
    // Add a notification message after a short delay to ensure proper sequencing
    setTimeout(() => {
      addMessage({
        role: 'assistant',
        content: `Repository "${repoName}" has been deselected. You are now in general conversation mode.`
      });
    }, 300);
    
    return true; // Return true to indicate dropdown should close
  }, [selectedRepositoryId, setSelectedRepositoryId, repositories, addMessage, isActionInProgress, lockUIUpdates]);

  return {
    selectedRepositoryId,
    repositories,
    isUpdating,
    isActionInProgress,
    showAddModal,
    setShowAddModal,
    handleAddClick,
    handleRepositorySave,
    handleRepositoryRemove,
    handleRepositorySelect,
    handleClearRepository
  };
}
