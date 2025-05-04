"use client";

import { Repository, LLMModel, LLMProvider } from "../types/entities";
import {
  queueRepositoryForDownload,
  downloadRepository,
  RepositoryStatus,
  updateRepositoryStatus,
  startIngestion,
  isRepositoryReadyForChat,
} from "./repo-download-service";

// Export the event name for repository download completion
export const REPO_DOWNLOAD_COMPLETE_EVENT = "repoDownloadComplete";

// Local storage keys
const REPOSITORIES_KEY = "swift_repositories";
const MODELS_KEY = "swift_models";

// Generate a unique ID
const generateId = () => Math.random().toString(36).substring(2, 9);

// Repository related functions
export const getRepositories = (): Repository[] => {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const storedRepos = localStorage.getItem(REPOSITORIES_KEY);
    return storedRepos ? JSON.parse(storedRepos) : [];
  } catch (error) {
    console.error("Error loading repositories:", error);
    return [];
  }
};

export const addRepository = (url: string): Repository => {
  // Properly extract organization and repo name from URL
  // GitHub URLs can be in the format:
  // - https://github.com/org/repo
  // - https://github.com/org/repo.git
  // - github.com/org/repo
  // - http://github.com/org/repo
  const normalizedUrl = url.trim().replace(/\.git$/, "");

  // Extract org and repo name using regex
  const match = normalizedUrl.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/([^\/]+)\/([^\/]+)/i);

  if (!match || !match[1] || !match[2]) {
    throw new Error("Invalid GitHub repository URL. Please use format: github.com/organization/repository");
  }

  const orgName = match[1];
  const repoName = match[2];

  // Format full name as "org/repo"
  const fullName = `${orgName}/${repoName}`;

  // Ensure URL has https:// prefix for consistency
  const formattedUrl = `https://github.com/${orgName}/${repoName}`;

  const newRepo: Repository = {
    id: generateId(),
    name: fullName,
    url: formattedUrl,
  };

  try {
    const repos = getRepositories();
    localStorage.setItem(REPOSITORIES_KEY, JSON.stringify([...repos, newRepo]));

    // Auto-queue the repository for download
    const queuedRepo = queueRepositoryForDownload(newRepo.id, newRepo.name, newRepo.url);

    // Trigger immediate download
    setTimeout(() => {
      downloadRepository(newRepo.id, newRepo.name, newRepo.url)
        .then((downloadedRepo) => {
          // Only if the repository is in a ready state (either READY or INGESTED),
          // dispatch the completion event
          if (isRepositoryReadyForChat(downloadedRepo.status)) {
            // Dispatch custom event for repository download completion
            const event = new CustomEvent(REPO_DOWNLOAD_COMPLETE_EVENT, {
              detail: { repository: downloadedRepo, action: "download" },
            });
            window.dispatchEvent(event);
          }
        })
        .catch((err) => {
          console.error("Error downloading repository:", err);
        });
    }, 500);
  } catch (error) {
    console.error("Error saving repository:", error);
  }

  return newRepo;
};

export const removeRepository = (id: string): void => {
  try {
    const repos = getRepositories();

    // Ensure we're not removing the last repository
    if (repos.length <= 1) {
      console.warn("Cannot remove the last repository");
      return;
    }

    const updatedRepos = repos.filter((repo) => repo.id !== id);
    localStorage.setItem(REPOSITORIES_KEY, JSON.stringify(updatedRepos));
  } catch (error) {
    console.error("Error removing repository:", error);
  }
};

// Model related functions
export const getModels = (): LLMModel[] => {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const storedModels = localStorage.getItem(MODELS_KEY);
    return storedModels ? JSON.parse(storedModels) : [];
  } catch (error) {
    console.error("Error loading models:", error);
    return [];
  }
};

export const addModel = (provider: LLMProvider, apiKey: string): LLMModel => {
  // Generate model name based on provider
  const modelName = provider === "gemini" ? "Gemini 1.5 Flash" : "Claude 3 Haiku";

  const newModel: LLMModel = {
    id: generateId(),
    name: modelName,
    provider,
    apiKey,
  };

  try {
    const models = getModels();

    // If a model already exists with the same provider, update it instead of adding new
    const existingModelIndex = models.findIndex((model) => model.provider === provider);
    if (existingModelIndex >= 0) {
      // Update the existing model with new API key
      models[existingModelIndex].apiKey = apiKey;
      localStorage.setItem(MODELS_KEY, JSON.stringify(models));
      return models[existingModelIndex];
    }

    // Add new model
    localStorage.setItem(MODELS_KEY, JSON.stringify([...models, newModel]));
  } catch (error) {
    console.error("Error saving model:", error);
  }

  return newModel;
};

export const removeModel = (id: string): void => {
  try {
    const models = getModels();

    // Ensure we're not removing the last model
    if (models.length <= 1) {
      console.warn("Cannot remove the last model");
      return;
    }

    const updatedModels = models.filter((model) => model.id !== id);
    localStorage.setItem(MODELS_KEY, JSON.stringify(updatedModels));
  } catch (error) {
    console.error("Error removing model:", error);
  }
};
