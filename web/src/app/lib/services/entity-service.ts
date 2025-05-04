"use client";

import { Repository, LLMModel, LLMProvider } from "../types/entities";

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
  // Extract organization and repo name from URL
  const match = url.match(/github\.com\/([\w-]+)\/([\w.-]+)\/?$/);
  const orgName = match ? match[1] : "";
  const repoName = match ? match[2] : "";
  
  // Format name as "org/repo" or fallback
  const fullName = orgName && repoName 
    ? `${orgName}/${repoName}` 
    : `Repository ${new Date().toISOString().substring(0, 10)}`;

  const newRepo: Repository = {
    id: generateId(),
    name: fullName,
    url,
  };

  try {
    const repos = getRepositories();
    localStorage.setItem(REPOSITORIES_KEY, JSON.stringify([...repos, newRepo]));
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
    
    // If a model already exists with the same provider, don't add a new one
    const existingModel = models.find(model => model.provider === provider);
    if (existingModel) {
      // Update the existing model with new API key
      existingModel.apiKey = apiKey;
      localStorage.setItem(MODELS_KEY, JSON.stringify(models));
      return existingModel;
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
