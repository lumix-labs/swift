"use client";

import { useEffect, useState } from "react";
import { LLMModel, Repository } from "../../lib/types/entities";
import { getModels, getRepositories } from "../../lib/services/entity-service";
import {
  getDownloadedRepository,
  isRepositoryDownloaded,
  RepositoryStatus,
  getRepositoryStatus,
} from "../../lib/services/repo-download-service";
import { DownloadedRepository } from "../../types/repository";

export function useEntitySelection(selectedModelId: string | null, selectedRepositoryId: string | null) {
  const [currentModel, setCurrentModel] = useState<LLMModel | null>(null);
  const [currentRepo, setCurrentRepo] = useState<Repository | null>(null);
  const [downloadedRepo, setDownloadedRepo] = useState<DownloadedRepository | null>(null);
  const [repositoryReady, setRepositoryReady] = useState<boolean>(false);
  const [repositoryStatus, setRepositoryStatus] = useState<RepositoryStatus>(RepositoryStatus.PENDING);

  // Load current model when its ID changes
  useEffect(() => {
    if (selectedModelId) {
      const models = getModels();
      const model = models.find((m) => m.id === selectedModelId) || null;
      setCurrentModel(model);
    } else {
      setCurrentModel(null);
    }
  }, [selectedModelId]);

  // Load current repository when its ID changes
  useEffect(() => {
    if (selectedRepositoryId) {
      const repos = getRepositories();
      const repo = repos.find((r) => r.id === selectedRepositoryId) || null;
      setCurrentRepo(repo);

      // Check repository status
      if (repo) {
        const status = getRepositoryStatus(repo.id);
        setRepositoryStatus(status);

        // Check if repository is ready for use
        if (status === RepositoryStatus.READY) {
          setRepositoryReady(true);
          const downloaded = getDownloadedRepository(repo.id);
          if (downloaded) {
            setDownloadedRepo(downloaded as DownloadedRepository);
          }
        } else {
          setRepositoryReady(false);
          const downloaded = getDownloadedRepository(repo.id);
          if (downloaded) {
            setDownloadedRepo(downloaded as DownloadedRepository);
          } else {
            setDownloadedRepo(null);
          }
        }

        // Set up interval to check status periodically
        const checkStatusInterval = setInterval(() => {
          const currentStatus = getRepositoryStatus(repo.id);
          setRepositoryStatus(currentStatus);

          if (currentStatus === RepositoryStatus.READY) {
            setRepositoryReady(true);
            const updated = getDownloadedRepository(repo.id);
            if (updated) {
              setDownloadedRepo(updated as DownloadedRepository);
            }
            clearInterval(checkStatusInterval);
          }
        }, 1500);

        return () => clearInterval(checkStatusInterval);
      }
    } else {
      setCurrentRepo(null);
      setDownloadedRepo(null);
      setRepositoryReady(false);
      setRepositoryStatus(RepositoryStatus.PENDING);
    }
  }, [selectedRepositoryId]);

  return {
    currentModel,
    currentRepo,
    downloadedRepo,
    repositoryReady,
    repositoryStatus,
    setRepositoryReady,
    setDownloadedRepo,
    setRepositoryStatus,
  };
}
