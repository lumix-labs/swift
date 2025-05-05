"use client";

import { Repository, LLMModel, LLMProvider, PREDEFINED_MODELS } from "../types/entities";
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
const AI_ADVISORS_KEY = "swift_ai_advisors";

// Generate a unique ID
const generateId = () => Math.random().toString(36).substring(2, 9);

// Repository related functions
export const getRepositories = (): Repository[] => {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const storedRepos = localStorage.getItem(REPOSITORIES_KEY);
    // Ensure returning an array, never undefined
    const repos = storedRepos ? JSON.parse(storedRepos) : [];
    return Array.isArray(repos) ? repos : [];
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

// AI Advisor related functions
export const getModels = (): LLMModel[] => {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const storedAdvisors = localStorage.getItem(AI_ADVISORS_KEY);
    const advisors = storedAdvisors ? JSON.parse(storedAdvisors) : [];

    // Ensure advisors is always an array
    if (!Array.isArray(advisors)) {
      console.warn("AI advisors in localStorage is not an array, initializing with default");
      return initializeDefaultAdvisors();
    }

    // If no AI advisors found, initialize with default advisors
    if (advisors.length === 0) {
      return initializeDefaultAdvisors();
    }

    return advisors;
  } catch (error) {
    console.error("Error loading AI advisors:", error);
    return initializeDefaultAdvisors();
  }
};

// Helper function to initialize default advisors
function initializeDefaultAdvisors(): LLMModel[] {
  const defaultAdvisors = PREDEFINED_MODELS.map((advisor) => ({
    id: generateId(),
    name: advisor.name || "Unknown AI Advisor",
    provider: advisor.provider || "gemini",
    apiKey: "",
    modelId: advisor.modelId,
    description: advisor.description,
    maxTokens: advisor.maxTokens,
    icon: advisor.icon,
    isDefault: advisor.isDefault,
  }));

  // Mark the first AI advisor as default if none is already marked
  if (!defaultAdvisors.some((a) => a.isDefault)) {
    defaultAdvisors[0].isDefault = true;
  }

  // Save the default AI advisors to localStorage
  if (typeof window !== "undefined") {
    localStorage.setItem(AI_ADVISORS_KEY, JSON.stringify(defaultAdvisors));
  }

  return defaultAdvisors;
}

export const addModel = (provider: LLMProvider, apiKey: string, modelId?: string, customName?: string): LLMModel => {
  // Find the predefined model to use as a template
  const predefinedModel = modelId
    ? PREDEFINED_MODELS.find((m) => m.modelId === modelId)
    : PREDEFINED_MODELS.find((m) => m.provider === provider && m.isDefault);

  // Generate AI advisor name based on provider and modelId
  const modelName =
    customName ||
    predefinedModel?.name ||
    (provider === "gemini" ? "Gemini" : provider === "anthropic" ? "Claude" : "GPT");

  const newModel: LLMModel = {
    id: generateId(),
    name: modelName,
    provider,
    apiKey,
    modelId: modelId || predefinedModel?.modelId,
    description: predefinedModel?.description,
    maxTokens: predefinedModel?.maxTokens,
    icon: predefinedModel?.icon || `/avatars/${provider}-avatar.png`,
  };

  try {
    const advisors = getModels();

    // If an AI advisor already exists with the same provider and modelId, update it instead of adding new
    const existingAdvisorIndex = advisors.findIndex(
      (advisor) => advisor.provider === provider && (modelId ? advisor.modelId === modelId : true),
    );

    if (existingAdvisorIndex >= 0) {
      // Update the existing AI advisor
      advisors[existingAdvisorIndex] = {
        ...advisors[existingAdvisorIndex],
        apiKey,
        name: customName || advisors[existingAdvisorIndex].name,
      };
      localStorage.setItem(AI_ADVISORS_KEY, JSON.stringify(advisors));
      return advisors[existingAdvisorIndex];
    }

    // Add new AI advisor
    localStorage.setItem(AI_ADVISORS_KEY, JSON.stringify([...advisors, newModel]));
  } catch (error) {
    console.error("Error saving AI advisor:", error);
  }

  return newModel;
};

export const updateModel = (id: string, updates: Partial<LLMModel>): LLMModel | null => {
  try {
    const advisors = getModels();
    const advisorIndex = advisors.findIndex((advisor) => advisor.id === id);

    if (advisorIndex < 0) {
      console.error(`AI advisor with ID ${id} not found`);
      return null;
    }

    // Update the AI advisor
    advisors[advisorIndex] = {
      ...advisors[advisorIndex],
      ...updates,
    };

    localStorage.setItem(AI_ADVISORS_KEY, JSON.stringify(advisors));
    return advisors[advisorIndex];
  } catch (error) {
    console.error("Error updating AI advisor:", error);
    return null;
  }
};

export const removeModel = (id: string): void => {
  try {
    const advisors = getModels();

    // Check if the AI advisor exists
    if (!advisors.some((advisor) => advisor.id === id)) {
      console.warn(`AI advisor with ID ${id} not found`);
      return;
    }

    const updatedAdvisors = advisors.filter((advisor) => advisor.id !== id);

    // Ensure there's at least one AI advisor left
    if (updatedAdvisors.length === 0) {
      console.warn("Cannot remove the last AI advisor");
      return;
    }

    localStorage.setItem(AI_ADVISORS_KEY, JSON.stringify(updatedAdvisors));
  } catch (error) {
    console.error("Error removing AI advisor:", error);
  }
};

// Get a specific AI advisor by ID
export const getModelById = (id: string): LLMModel | null => {
  try {
    const advisors = getModels();
    return advisors.find((advisor) => advisor.id === id) || null;
  } catch (error) {
    console.error("Error getting AI advisor by ID:", error);
    return null;
  }
};

// Get the default AI advisor
export const getDefaultModel = (): LLMModel | null => {
  try {
    const advisors = getModels();
    return advisors.find((advisor) => advisor.isDefault) || advisors[0] || null;
  } catch (error) {
    console.error("Error getting default AI advisor:", error);
    return null;
  }
};

// Set an AI advisor as the default
export const setDefaultModel = (id: string): void => {
  try {
    const advisors = getModels();
    const updatedAdvisors = advisors.map((advisor) => ({
      ...advisor,
      isDefault: advisor.id === id,
    }));

    localStorage.setItem(AI_ADVISORS_KEY, JSON.stringify(updatedAdvisors));
  } catch (error) {
    console.error("Error setting default AI advisor:", error);
  }
};
