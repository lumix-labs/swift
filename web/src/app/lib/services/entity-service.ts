"use client";

import { Repository, LLMModel, LLMProvider, PREDEFINED_MODELS } from "../types/entities";
import { Personality, PERSONALITY_PROFILES, getRandomUnisexName } from "../types/personality";
import { SenderType, SENDERS, Sender } from "../types/message";
import { queueRepositoryForDownload, downloadRepository, isRepositoryReadyForChat } from "./repo-download-service";

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
  // Create one advisor for each personality
  const defaultAdvisors = Object.values(Personality).map((personality, index) => {
    const shortName = getRandomUnisexName();
    const personalityProfile = PERSONALITY_PROFILES[personality];
    const provider = index % 3 === 0 ? "gemini" : index % 3 === 1 ? "anthropic" : "openai";

    // Select a predefined model based on provider
    const predefinedModel =
      PREDEFINED_MODELS.find((m) => m.provider === provider && m.isDefault) ||
      PREDEFINED_MODELS.find((m) => m.provider === provider) ||
      PREDEFINED_MODELS[0];

    return {
      id: generateId(),
      name: `${shortName} - ${personality}`,
      shortName,
      provider,
      apiKey: "",
      modelId: predefinedModel?.modelId,
      description: personalityProfile.tagline,
      maxTokens: predefinedModel?.maxTokens,
      icon: personalityProfile.avatarPath,
      personality,
      isDefault: index === 0, // First one is default
    } as LLMModel;
  });

  // Save the default AI advisors to localStorage
  if (typeof window !== "undefined") {
    localStorage.setItem(AI_ADVISORS_KEY, JSON.stringify(defaultAdvisors));
  }

  return defaultAdvisors;
}

export const addModel = (
  provider: LLMProvider,
  apiKey: string,
  modelId?: string,
  personality?: Personality,
): LLMModel => {
  // Generate a random short name for the advisor
  const shortName = getRandomUnisexName();

  // Get the personality profile if provided
  const personalityProfile = personality ? PERSONALITY_PROFILES[personality] : null;

  // Find the predefined model to use as a template
  const predefinedModel = modelId
    ? PREDEFINED_MODELS.find((m) => m.modelId === modelId)
    : PREDEFINED_MODELS.find((m) => m.provider === provider && m.isDefault);

  // Generate AI advisor name based on personality or provider
  const modelName = personality
    ? `${shortName} - ${personality}`
    : provider === "gemini"
      ? "Gemini"
      : provider === "anthropic"
        ? "Claude"
        : "GPT";

  const newModel: LLMModel = {
    id: generateId(),
    name: modelName,
    shortName,
    provider,
    apiKey,
    modelId: modelId || predefinedModel?.modelId,
    description: personalityProfile?.tagline || predefinedModel?.description,
    maxTokens: predefinedModel?.maxTokens,
    icon: personalityProfile?.avatarPath || predefinedModel?.icon || `/avatars/${provider}-avatar.png`,
    personality,
  };

  try {
    const advisors = getModels();

    // If an AI advisor already exists with the same provider and modelId, update it instead of adding new
    const existingAdvisorIndex = advisors.findIndex(
      (advisor) =>
        advisor.provider === provider &&
        (modelId ? advisor.modelId === modelId : true) &&
        (personality ? advisor.personality === personality : true),
    );

    if (existingAdvisorIndex >= 0) {
      // Update the existing AI advisor
      advisors[existingAdvisorIndex] = {
        ...advisors[existingAdvisorIndex],
        apiKey,
        // Only update name if personality changed
        name:
          personality !== advisors[existingAdvisorIndex].personality
            ? `${shortName} - ${personality}`
            : advisors[existingAdvisorIndex].name,
        personality,
        icon: personalityProfile?.avatarPath || advisors[existingAdvisorIndex].icon,
        description: personalityProfile?.tagline || advisors[existingAdvisorIndex].description,
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

    // If personality is being updated, update related fields
    if (updates.personality && updates.personality !== advisors[advisorIndex].personality) {
      const personalityProfile = PERSONALITY_PROFILES[updates.personality];
      const shortName = advisors[advisorIndex].shortName || getRandomUnisexName();

      updates = {
        ...updates,
        name: `${shortName} - ${updates.personality}`,
        description: personalityProfile.tagline,
        icon: personalityProfile.avatarPath,
      };
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

// Get a sender type for an AI advisor
export const getSenderTypeForModel = (model: LLMModel | null): SenderType => {
  if (!model) {
    return SenderType.AI_ADVISOR; // Default
  }

  // All AI advisors now use the AI_ADVISOR sender type
  return SenderType.AI_ADVISOR;
};

// Create a customized sender for an AI advisor
export const createAdvisorSender = (advisor: LLMModel | null): Sender => {
  if (!advisor) {
    return SENDERS[SenderType.AI_ADVISOR];
  }

  // Create a customized sender based on the advisor properties
  return {
    id: advisor.id,
    type: SenderType.AI_ADVISOR,
    name: advisor.name || "AI Advisor",
    avatarUrl: advisor.icon || SENDERS[SenderType.AI_ADVISOR].avatarUrl,
    includeInModelContext: true,
    personalityType: advisor.personality,
    advisorId: advisor.id,
  };
};
