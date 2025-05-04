"use client";

import { useState, useCallback, useEffect } from "react";
import { addRepository, removeRepository } from "../../lib/services/entity-service";
import { useChat } from "../../context/ChatContext";
import { useRepositoryDownload } from "../useRepositoryDownload";

export function useRepositoriesDropdown() {
  const { selectedRepositoryId, setSelectedRepositoryId, addMessage } = useChat();
  const { repositories, updateRepositories } = useRepositoryDownload();
  const [showAddModal, setShowAddModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isActionInProgress, setIsActionInProgress] = useState(false);

  // Auto-select the first repository when repositories are loaded and none is selected
  useEffect(() => {
    if (repositories.length > 0 && !selectedRepositoryId) {
      setSelectedRepositoryId(repositories[0].id);
    }
  }, [repositories, selectedRepositoryId, setSelectedRepositoryId]);

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

  const handleRepositorySave = useCallback(
    (repoUrl: string) => {
      if (isActionInProgress) {
        return;
      }

      // Lock UI updates to prevent flickering
      lockUIUpdates();

      // Set updating flag to prevent UI flickering
      setIsUpdating(true);

      try {
        // Extract name from URL and add repository using GitHub format
        const newRepo = addRepository(repoUrl);

        // Automatically select the newly added repository
        setSelectedRepositoryId(newRepo.id);

        // Add a notification message after a short delay to ensure proper sequencing
        setTimeout(() => {
          addMessage({
            role: "assistant",
            content: `Repository "${newRepo.name}" has been added. It is being downloaded and ingested.`,
          });

          // Use a timer to delay the UI update to prevent flickering
          updateRepositories();

          // Reset updating flag after state is updated
          setTimeout(() => {
            setIsUpdating(false);
          }, 500);
        }, 500);
      } catch (error) {
        console.error("Error adding repository:", error);

        // Add an error message if there was a problem
        addMessage({
          role: "assistant",
          content: `Error adding repository: ${error instanceof Error ? error.message : "Unknown error"}`,
        });

        setIsUpdating(false);
      }
    },
    [setSelectedRepositoryId, updateRepositories, addMessage, isActionInProgress, lockUIUpdates],
  );

  const handleRepositoryRemove = useCallback(
    (id: string) => {
      if (isActionInProgress) {
        return;
      }

      // If there's only one repository, don't allow removal
      if (repositories.length <= 1) {
        addMessage({
          role: "assistant",
          content: "At least one repository must be selected. You cannot remove the only repository.",
        });
        return;
      }

      // Lock UI updates to prevent flickering
      lockUIUpdates();

      // Set updating flag to prevent UI flickering
      setIsUpdating(true);

      try {
        // Get repository name before removal
        const repo = repositories.find((r) => r.id === id);
        const repoName = repo?.name || "Repository";

        // If the removed repository was selected, select another repository
        if (id === selectedRepositoryId) {
          // Find another repository to select
          const nextRepo = repositories.find((r) => r.id !== id);
          if (nextRepo) {
            setSelectedRepositoryId(nextRepo.id);
          }
        }

        // Remove the repository
        removeRepository(id);

        // Add a notification message after a short delay to ensure proper sequencing
        setTimeout(() => {
          addMessage({
            role: "assistant",
            content: `Repository "${repoName}" has been removed.`,
          });
        }, 300);

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
        console.error("Error removing repository:", error);
        setIsUpdating(false);
      }
    },
    [
      selectedRepositoryId,
      setSelectedRepositoryId,
      updateRepositories,
      repositories,
      addMessage,
      isActionInProgress,
      lockUIUpdates,
    ],
  );

  const handleRepositorySelect = useCallback(
    (id: string) => {
      if (isActionInProgress) {
        return false;
      }

      // Lock UI updates to prevent flickering
      lockUIUpdates();

      // Get repository name for notification
      const repo = repositories.find((r) => r.id === id);
      const repoName = repo?.name || "Repository";

      setSelectedRepositoryId(id);

      // Add a notification message after a short delay to ensure proper sequencing
      setTimeout(() => {
        addMessage({
          role: "assistant",
          content: `Repository "${repoName}" has been selected. You can now ask questions about this repository.`,
        });
      }, 300);

      return true; // Return true to indicate dropdown should close
    },
    [setSelectedRepositoryId, repositories, addMessage, isActionInProgress, lockUIUpdates],
  );

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
  };
}
