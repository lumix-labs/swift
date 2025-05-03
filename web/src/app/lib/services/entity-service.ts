"use client";

import { Repository, LLMModel, LLMProvider } from '../types/entities';

// Local storage keys
const REPOSITORIES_KEY = 'swift_repositories';
const MODELS_KEY = 'swift_models';

// Generate a unique ID
const generateId = () => Math.random().toString(36).substring(2, 9);

// Repository related functions
export const getRepositories = (): Repository[] => {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const storedRepos = localStorage.getItem(REPOSITORIES_KEY);
    return storedRepos ? JSON.parse(storedRepos) : [];
  } catch (error) {
    console.error('Error loading repositories:', error);
    return [];
  }
};

export const addRepository = (url: string): Repository => {
  // Extract repo name from URL
  const match = url.match(/github\.com\/[\w-]+\/([\w.-]+)\/?$/);
  const name = match ? match[1] : `Repository ${new Date().toISOString()}`;

  const newRepo: Repository = {
    id: generateId(),
    name,
    url
  };

  try {
    const repos = getRepositories();
    localStorage.setItem(REPOSITORIES_KEY, JSON.stringify([...repos, newRepo]));
  } catch (error) {
    console.error('Error saving repository:', error);
  }

  return newRepo;
};

export const removeRepository = (id: string): void => {
  try {
    const repos = getRepositories();
    const updatedRepos = repos.filter(repo => repo.id !== id);
    localStorage.setItem(REPOSITORIES_KEY, JSON.stringify(updatedRepos));
  } catch (error) {
    console.error('Error removing repository:', error);
  }
};

// Model related functions
export const getModels = (): LLMModel[] => {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const storedModels = localStorage.getItem(MODELS_KEY);
    return storedModels ? JSON.parse(storedModels) : [];
  } catch (error) {
    console.error('Error loading models:', error);
    return [];
  }
};

export const addModel = (provider: LLMProvider, apiKey: string): LLMModel => {
  // Generate model name based on provider
  const modelName = provider === 'gemini'
    ? 'Gemini Pro'
    : 'Claude';

  const newModel: LLMModel = {
    id: generateId(),
    name: `${modelName} ${new Date().toLocaleDateString()}`,
    provider,
    apiKey
  };

  try {
    const models = getModels();
    localStorage.setItem(MODELS_KEY, JSON.stringify([...models, newModel]));
  } catch (error) {
    console.error('Error saving model:', error);
  }

  return newModel;
};

export const removeModel = (id: string): void => {
  try {
    const models = getModels();
    const updatedModels = models.filter(model => model.id !== id);
    localStorage.setItem(MODELS_KEY, JSON.stringify(updatedModels));
  } catch (error) {
    console.error('Error removing model:', error);
  }
};
