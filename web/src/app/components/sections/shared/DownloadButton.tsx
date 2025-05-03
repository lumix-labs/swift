"use client";

import React, { useState, useEffect } from 'react';
import { Repository } from '../../../lib/types/entities';
import {
  downloadRepository,
  isRepositoryDownloaded,
  getDownloadedRepository
} from '../../../lib/services/repo-download-service';

interface DownloadButtonProps {
  repository: Repository;
  className?: string;
}

export function DownloadButton({ repository, className = '' }: DownloadButtonProps) {
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [readmeCharCount, setReadmeCharCount] = useState<number | null>(null);

  // Check if the repository is already downloaded when the component mounts
  useEffect(() => {
    const downloaded = isRepositoryDownloaded(repository.id);
    setIsDownloaded(downloaded);

    if (downloaded) {
      const repo = getDownloadedRepository(repository.id);
      if (repo?.readmeCharCount) {
        setReadmeCharCount(repo.readmeCharCount);
      }
    }
  }, [repository.id]);

  const handleDownload = async () => {
    if (isDownloading) {
      return;
    }

    setIsDownloading(true);

    try {
      const downloadedRepo = await downloadRepository(
        repository.id,
        repository.name,
        repository.url
      );

      setIsDownloaded(true);
      setReadmeCharCount(downloadedRepo.readmeCharCount || 0);
    } catch (error) {
      console.error('Error downloading repository:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <button
      onClick={handleDownload}
      disabled={isDownloading}
      className={`flex items-center justify-center space-x-1.5 
        ${isDownloaded
          ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800'
          : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700'
        } 
        transition-colors rounded-md px-3 py-1.5 text-sm font-medium ${className}`}
    >
      {isDownloading ? (
        <>
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-1"></div>
          <span>Downloading...</span>
        </>
      ) : isDownloaded ? (
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
