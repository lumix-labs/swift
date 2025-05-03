"use client";
import React, { useState, useEffect } from "react";
import { Repository } from "../../../lib/types/entities";
import { getRepositories, addRepository, removeRepository } from "../../../lib/services/entity-service";
import { AddRepositoryModal } from "../shared/AddEntityModal";
import { DownloadButton } from "../shared/DownloadButton";
import { useChat } from "../../../context/ChatContext";

export interface RepositoriesDropdownProps {
  show: boolean;
  setShow: (show: boolean) => void;
  resolvedTheme: string;
}

export function RepositoriesDropdown({ show, setShow, resolvedTheme }: RepositoriesDropdownProps) {
  const { selectedRepositoryId, setSelectedRepositoryId } = useChat();
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);

  // Load repositories on component mount
  useEffect(() => {
    setRepositories(getRepositories());
  }, []);

  const handleAddClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShow(false);
    setShowAddModal(true);
  };

  const handleRepoSave = (repoUrl: string) => {
    const existingRepo = repositories.find(repo => {
      // Check for URL exact match or repo name match
      const urlMatch = repo.url.toLowerCase() === repoUrl.toLowerCase();
      
      // Extract repo name from URL for comparison
      const match = repoUrl.match(/github\.com\/[\w-]+\/([\w.-]+)\/?$/);
      const newRepoName = match ? match[1].toLowerCase() : '';
      const nameMatch = repo.name.toLowerCase() === newRepoName;
      
      return urlMatch || nameMatch;
    });

    if (existingRepo) {
      // Repository with same URL or name already exists
      alert(`A repository named "${existingRepo.name}" or with the same URL already exists.`);
      return;
    }

    const newRepo = addRepository(repoUrl);
    setRepositories([...repositories, newRepo]);
    // Automatically select the newly added repository
    setSelectedRepositoryId(newRepo.id);
  };

  const handleRepoRemove = (id: string) => {
    removeRepository(id);
    setRepositories(repositories.filter(repo => repo.id !== id));
    // If the removed repository was selected, clear the selection
    if (id === selectedRepositoryId) {
      setSelectedRepositoryId(null);
    }
  };

  const handleRepoSelect = (id: string) => {
    setSelectedRepositoryId(id);
    setShow(false);
  };

  const handleClickOutside = (e: MouseEvent) => {
    if (show) {
      setShow(false);
    }
  };

  // Set up click outside listener
  useEffect(() => {
    if (show) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [show]);

  // Get the currently selected repository for display
  const selectedRepo = repositories.find(repo => repo.id === selectedRepositoryId);
  const buttonText = selectedRepo ? `Repo: ${selectedRepo.name}` : "Repositories";

  return (
    <div className="relative">
      <button
        className={`p-2 sm:px-3 sm:py-1.5 text-sm font-medium rounded-md ${resolvedTheme === 'dark' ? 'bg-white text-black' : 'bg-black text-white'}`}
        onClick={(e) => {
          e.stopPropagation();
          setShow(!show);
        }}
      >
        <span className="hidden sm:inline">{buttonText}</span>
        <span className="sm:hidden">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
        </span>
      </button>
      {show && (
        <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-900 rounded-md shadow-lg z-10">
          {repositories.length > 0 ? (
            repositories.map((repo) => (
              <div 
                key={repo.id} 
                className={`p-2 border-b border-gray-200 dark:border-gray-700 last:border-0 ${
                  repo.id === selectedRepositoryId ? 'bg-gray-100 dark:bg-gray-800' : ''
                }`}
              >
                <div className="flex flex-col space-y-2">
                  <div className="flex justify-between items-center">
                    <div 
                      className="flex-1 cursor-pointer" 
                      onClick={() => handleRepoSelect(repo.id)}
                    >
                      <div className="font-medium">{repo.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{repo.url}</div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRepoRemove(repo.id);
                      }}
                      className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                      aria-label="Remove repository"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  
                  {/* Download Button */}
                  <DownloadButton repository={repo} />
                </div>
              </div>
            ))
          ) : (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
              No repositories added yet
            </div>
          )}
          <div className="p-2 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleAddClick}
              className="w-full p-2 text-sm bg-gray-100 dark:bg-gray-800 rounded hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Add new repository
            </button>
          </div>
        </div>
      )}
      <AddRepositoryModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={handleRepoSave}
      />
    </div>
  );
}
