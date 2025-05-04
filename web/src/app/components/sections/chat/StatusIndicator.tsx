"use client";

import React from "react";
import { RepositoryStatus } from "../../../lib/services/repo-download-service";

interface StatusMessage {
  message: string;
  icon: React.ReactNode;
  bg: string;
  text: string;
  animate: string;
}

interface StatusIndicatorProps {
  errorMessage: string | null;
  currentModel: any | null;
  currentRepo: any | null;
  repositoryStatus: RepositoryStatus | null;
  repositoryReady: boolean;
}

export function StatusIndicator({
  errorMessage,
  currentModel,
  currentRepo,
  repositoryStatus,
  repositoryReady,
}: StatusIndicatorProps) {
  // Helper to determine if we should show an error message
  const getMissingRequirement = (): StatusMessage | null => {
    // If we have an error message from suggested prompts, show that first
    if (errorMessage) {
      return {
        message: errorMessage,
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        ),
        bg: "bg-red-50 dark:bg-red-900/40",
        text: "text-red-800 dark:text-red-300",
        animate: "animate-fadeIn",
      };
    }

    if (!currentModel) {
      return {
        message: "Please select a model to start chatting",
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path
              d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 
                    01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z"
            />
          </svg>
        ),
        bg: "bg-blue-50 dark:bg-blue-900/40",
        text: "text-blue-800 dark:text-blue-300",
        animate: "",
      };
    }

    if (!currentRepo) {
      return {
        message: "Please select a repository to analyze",
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
              clipRule="evenodd"
            />
          </svg>
        ),
        bg: "bg-indigo-50 dark:bg-indigo-900/40",
        text: "text-indigo-800 dark:text-indigo-300",
        animate: "",
      };
    }

    if (currentRepo && repositoryStatus === RepositoryStatus.DOWNLOADING) {
      return {
        message: "Repository is being downloaded. Please wait...",
        icon: (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 animate-pulse"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        ),
        bg: "bg-yellow-50 dark:bg-yellow-900/40",
        text: "text-yellow-800 dark:text-yellow-300",
        animate: "",
      };
    }

    if (currentRepo && repositoryStatus === RepositoryStatus.QUEUED) {
      return {
        message: "Repository is queued for download. Please wait...",
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
              clipRule="evenodd"
            />
          </svg>
        ),
        bg: "bg-blue-50 dark:bg-blue-900/40",
        text: "text-blue-800 dark:text-blue-300",
        animate: "",
      };
    }

    return null;
  };

  const missingRequirement = getMissingRequirement();

  if (!missingRequirement) {
    return null;
  }

  return (
    <div
      className={`mb-2 px-3 py-2 ${missingRequirement.bg} ${missingRequirement.text} text-sm rounded-md shadow-sm ${missingRequirement.animate}`}
    >
      <div className="flex items-center">
        {missingRequirement.icon}
        <span className="ml-2">{missingRequirement.message}</span>
      </div>
    </div>
  );
}
