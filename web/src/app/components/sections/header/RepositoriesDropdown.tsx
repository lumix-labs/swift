"use client";
import React, { useEffect, useState } from "react";
import githubService, { GitHubRepo } from "../../../services/github";
import { AlertDialog } from "../ui/AlertDialog";
import { InputDialog } from "../ui/InputDialog";

export interface RepositoriesDropdownProps {
  show: boolean;
  setShow: (show: boolean) => void;
  resolvedTheme: string;
}

export function RepositoriesDropdown({ show, setShow, resolvedTheme }: RepositoriesDropdownProps) {
  // State for repositories
  const [repositories, setRepositories] = useState<GitHubRepo[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingRepoId, setLoadingRepoId] = useState<string | null>(null);

  // Input dialog state
  const [showAddDialog, setShowAddDialog] = useState(false);

  // Alert dialog state
  const [alertConfig, setAlertConfig] = useState<{
    show: boolean;
    title: string;
    message: string;
    type: "success" | "error" | "info" | "warning";
  }>({ show: false, title: "", message: "", type: "info" });

  // Load repositories from storage on mount
  useEffect(() => {
    async function loadRepos() {
      setIsLoading(true);
      try {
        const repos = await githubService.loadRepositories();
        setRepositories(repos);
      } catch {
        // Removed unused error variable to fix lint error
        console.error("Error loading repositories");
      } finally {
        setIsLoading(false);
      }
    }
    
    if (show) {
      loadRepos();
    }
  }, [show]);

  // Toggle dropdown visibility
  const handleToggle = () => {
    setShow(!show);
  };

  // Handle adding a new repository
  const handleAddRepo = async (url: string) => {
    setShowAddDialog(false);
    setIsLoading(true);

    try {
      const result = await githubService.addRepository(url);

      if (result.success) {
        // Update the repositories list
        const repos = await githubService.loadRepositories();
        setRepositories(repos);

        // Show success alert
        setAlertConfig({
          show: true,
          title: "Repository Added",
          message: result.message,
          type: "success"
        });
      } else {
        // Show error alert
        setAlertConfig({
          show: true,
          title: "Error Adding Repository",
          message: result.message,
          type: "error"
        });
      }
    } catch {
      // Removed unused error variable to fix lint error
      // Show error alert for unexpected errors
      setAlertConfig({
        show: true,
        title: "Error",
        message: "An unexpected error occurred. Please try again.",
        type: "error"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle removing a repository
  const handleRemoveRepo = async (repoId: string) => {
    setIsLoading(true);
    
    try {
      const result = await githubService.removeRepository(repoId);

      if (result.success) {
        // Update the repositories list
        const repos = await githubService.loadRepositories();
        setRepositories(repos);

        // Show success alert
        setAlertConfig({
          show: true,
          title: "Repository Removed",
          message: result.message,
          type: "success"
        });
      } else {
        // Show error alert
        setAlertConfig({
          show: true,
          title: "Error Removing Repository",
          message: result.message,
          type: "error"
        });
      }
    } catch {
      // Removed unused error variable to fix lint error
      // Show error alert for unexpected errors
      setAlertConfig({
        show: true,
        title: "Error",
        message: "An unexpected error occurred while removing the repository.",
        type: "error"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle downloading a repository
  const handleDownloadRepo = async (repoId: string) => {
    setLoadingRepoId(repoId);
    
    try {
      const result = await githubService.downloadRepositoryZip(repoId);

      if (result.success) {
        // Show success alert
        setAlertConfig({
          show: true,
          title: "Download Started",
          message: result.message,
          type: "success"
        });
      } else {
        // Show error alert
        setAlertConfig({
          show: true,
          title: "Error Downloading Repository",
          message: result.message,
          type: "error"
        });
      }
    } catch {
      // Removed unused error variable to fix lint error
      // Show error alert for unexpected errors
      setAlertConfig({
        show: true,
        title: "Error",
        message: "An unexpected error occurred while downloading the repository.",
        type: "error"
      });
    } finally {
      setLoadingRepoId(null);
    }
  };

  // Validate GitHub URL
  const validateGitHubUrl = (url: string): string | null => {
    if (!url.trim()) {
      return "Please enter a GitHub repository URL";
    }

    // Basic validation - more detailed validation happens in addRepository
    if (!url.includes('/')) {
      return "Invalid format. Please use format: owner/repo or github.com/owner/repo";
    }

    return null;
  };

  return (
    <div className="relative">
      <button
        className={`p-2 sm:px-3 sm:py-1.5 text-sm font-medium rounded-md ${resolvedTheme === 'dark' ? 'bg-white text-black' : 'bg-black text-white'} shadow-md hover:shadow-lg transition-shadow`}
        onClick={handleToggle}
      >
        <span className="hidden sm:inline">Repositories</span>
        <span className="sm:hidden">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
        </span>
      </button>

      {show && (
        <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-900 rounded-md shadow-xl z-10 border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="p-1">
            {isLoading && repositories.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 flex items-center justify-center">
                <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Loading repositories...
              </div>
            ) : repositories.length > 0 ? (
              repositories.map((repo) => (
                <div
                  key={repo.id}
                  className="px-4 py-2 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                >
                  <div className="flex-1 mr-2">
                    <a
                      href={repo.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-gray-700 dark:text-gray-200 truncate block"
                      title={repo.fullName}
                    >
                      {repo.fullName}
                    </a>
                    {repo.stars !== undefined && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center mt-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                        {repo.stars}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center">
                    {/* Download button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadRepo(repo.id);
                      }}
                      className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 ml-2 shadow-sm hover:shadow-md p-1 rounded-full transition-all"
                      title="Download repository as ZIP"
                      disabled={loadingRepoId === repo.id}
                    >
                      {loadingRepoId === repo.id ? (
                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      )}
                    </button>
                    
                    {/* Remove button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveRepo(repo.id);
                      }}
                      className="ml-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 shadow-sm hover:shadow-md p-1 rounded-full transition-all"
                      title="Remove repository"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                No repositories added
              </div>
            )}
          </div>

          <div className="px-1 pb-1">
            <button
              onClick={() => setShowAddDialog(true)}
              className="w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md flex items-center shadow-sm hover:shadow-md transition-all"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add New
            </button>
          </div>
        </div>
      )}

      {/* Input Dialog for adding a new repository */}
      <InputDialog
        show={showAddDialog}
        title="Add GitHub Repository"
        label="GitHub Repository URL"
        placeholder="owner/repo or github.com/owner/repo"
        onSubmit={handleAddRepo}
        onCancel={() => setShowAddDialog(false)}
        validationFn={validateGitHubUrl}
      />

      {/* Alert Dialog for showing messages */}
      <AlertDialog
        show={alertConfig.show}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onClose={() => setAlertConfig({ ...alertConfig, show: false })}
      />
    </div>
  );
}
