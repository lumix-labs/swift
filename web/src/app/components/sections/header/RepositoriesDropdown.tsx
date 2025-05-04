"use client";

import React, { useCallback, useEffect } from "react";
import { AddRepositoryModal } from "../shared/AddEntityModal";
import { DownloadButton } from "../shared/DownloadButton";
import { useDropdown } from "../../../hooks/header/useDropdown";
import { useRepositoriesDropdown } from "../../../hooks/header/useRepositoriesDropdown";
import { RemoveButton } from "./RemoveButton";

export interface RepositoriesDropdownProps {
  resolvedTheme: string;
}

export function RepositoriesDropdown({ resolvedTheme }: RepositoriesDropdownProps) {
  // Use custom hooks for dropdown and repositories management
  const { show, setShow, dropdownRef, toggleDropdown } = useDropdown();

  const {
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
  } = useRepositoriesDropdown();

  // Auto-select first repository if none is selected
  useEffect(() => {
    if (!selectedRepositoryId && repositories.length > 0) {
      handleRepositorySelect(repositories[0].id);
    }
  }, [repositories, selectedRepositoryId, handleRepositorySelect]);

  // Handle add button click - wrapped in useCallback to prevent recreations
  const onAddClick = useCallback(
    (e: React.MouseEvent) => {
      if (handleAddClick(e)) {
        setShow(false);
      }
    },
    [handleAddClick, setShow],
  );

  // Handle repository selection - wrapped in useCallback to prevent recreations
  const onRepositorySelect = useCallback(
    (id: string) => {
      if (handleRepositorySelect(id)) {
        setShow(false);
      }
    },
    [handleRepositorySelect, setShow],
  );

  // Memoize the repository list to prevent unnecessary re-renders
  const repositoryList = React.useMemo(() => {
    if (isUpdating) {
      return (
        <div className="p-4 text-center">
          <div className="flex justify-center items-center space-x-2">
            <div
              className="w-4 h-4 border-2 border-gray-500 dark:border-gray-400 
                          border-t-transparent rounded-full animate-spin"
            ></div>
            <span className="text-gray-500 dark:text-gray-400 text-sm">Updating repositories...</span>
          </div>
        </div>
      );
    }

    if (repositories.length === 0) {
      return <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">No repositories added yet</div>;
    }

    return repositories.map((repo) => (
      <div
        key={repo.id}
        className={`p-2 border-b border-gray-200 dark:border-gray-700 last:border-0 ${
          repo.id === selectedRepositoryId
            ? "bg-gray-100 dark:bg-gray-800 border-l-4 border-l-green-500 dark:border-l-green-400"
            : ""
        }`}
      >
        <div className="flex flex-col space-y-2">
          <div className="flex justify-between items-center">
            <div 
              className="flex-1 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 rounded-md p-1 transition-colors duration-200" 
              onClick={() => onRepositorySelect(repo.id)}
            >
              <div className="font-medium">{repo.name}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{repo.url}</div>
            </div>
            {/* Use the new RemoveButton component */}
            <RemoveButton 
              onClick={() => handleRepositoryRemove(repo.id)}
              disabled={isActionInProgress || repositories.length <= 1}
            />
          </div>

          {/* Download Button - moved after the name/info for better visual flow */}
          <DownloadButton repository={repo} isSmooth={true} />
        </div>
      </div>
    ));
  }, [repositories, selectedRepositoryId, isUpdating, onRepositorySelect, handleRepositoryRemove, isActionInProgress]);

  // Get currently selected repository for display
  const selectedRepo = selectedRepositoryId ? repositories.find((r) => r.id === selectedRepositoryId) : null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        className={`p-2 sm:px-3 sm:py-1.5 text-sm font-medium rounded-md ${
          resolvedTheme === "dark" ? "bg-white text-black" : "bg-black text-white"
        }`}
        onClick={toggleDropdown}
        disabled={isActionInProgress}
      >
        <span className="hidden sm:inline">{selectedRepo ? `Repo: ${selectedRepo.name}` : "Repositories"}</span>
        <span className="sm:hidden">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
            />
          </svg>
        </span>
      </button>

      {show && (
        <div
          className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-900 
                      rounded-md shadow-lg z-10"
        >
          {repositoryList}

          <div className="p-2 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={onAddClick}
              className="w-full p-2 text-sm bg-gray-100 dark:bg-gray-800 rounded 
                       hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center"
              disabled={isUpdating || isActionInProgress}
            >
              {isUpdating ? (
                <div
                  className="w-4 h-4 border-2 border-gray-500 dark:border-gray-400 
                              border-t-transparent rounded-full animate-spin mr-2"
                ></div>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 mr-1"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 
                                             11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
              Add new repository
            </button>
          </div>
        </div>
      )}

      <AddRepositoryModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} onSave={handleRepositorySave} />
    </div>
  );
}
