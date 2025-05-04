"use client";

import { useEffect, useState } from "react";
import { LLMModel, Repository } from "../../lib/types/entities";
import { getModels, getRepositories } from "../../lib/services/entity-service";
import { getDownloadedRepository, isRepositoryDownloaded } from "../../lib/services/repo-download-service";

interface DownloadedRepository extends Repository {
  localPath?: string;
  downloadDate?: number;
  fileCount?: number;
  size?: number;
}

export function useEntitySelection(selectedModelId: string | null, selectedRepositoryId: string | null) {
  const [currentModel, setCurrentModel] = useState<LLMModel | null>(null);
  const [currentRepo, setCurrentRepo] = useState<Repository | null>(null);
  const [downloadedRepo, setDownloadedRepo] = useState<DownloadedRepository | null>(null);
  const [repositoryReady, setRepositoryReady] = useState<boolean>(false);

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

      // Check if repository is downloaded
      if (repo && isRepositoryDownloaded(repo.id)) {
        const downloaded = getDownloadedRepository(repo.id) as DownloadedRepository | null;
        setDownloadedRepo(downloaded);
        setRepositoryReady(true);
      } else {
        setDownloadedRepo(null);
        setRepositoryReady(false);
      }
    } else {
      setCurrentRepo(null);
      setDownloadedRepo(null);
      setRepositoryReady(false);
    }
  }, [selectedRepositoryId]);

  return {
    currentModel,
    currentRepo,
    downloadedRepo,
    repositoryReady,
    setRepositoryReady,
    setDownloadedRepo,
  };
}
