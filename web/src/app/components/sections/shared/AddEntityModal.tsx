"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Modal } from "./Modal";
import { LLMProvider, PREDEFINED_MODELS } from "../../../lib/types/entities";

interface AddRepositoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (repoUrl: string) => void;
}

interface AddAIAdvisorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (provider: LLMProvider, apiKey: string, modelId?: string, customName?: string) => void;
}

export function AddRepositoryModal({ isOpen, onClose, onSave }: AddRepositoryModalProps) {
  const [repoUrl, setRepoUrl] = useState("");
  const [isValid, setIsValid] = useState(false);

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setRepoUrl(url);

    // Simple GitHub URL validation
    const isValidUrl = /^https:\/\/github\.com\/[\w-]+\/[\w.-]+\/?$/.test(url);
    setIsValid(isValidUrl);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isValid) {
      onSave(repoUrl);
      setRepoUrl("");
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Repository">
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="repoUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            GitHub Repository URL
          </label>
          <input
            type="text"
            id="repoUrl"
            value={repoUrl}
            onChange={handleUrlChange}
            placeholder="https://github.com/username/repo"
            className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            autoFocus
          />
          {repoUrl && !isValid && (
            <p className="mt-1 text-sm text-red-500">Please enter a valid GitHub repository URL</p>
          )}
        </div>
        <div className="flex justify-end space-x-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!isValid}
            className="px-4 py-2 text-sm rounded-md bg-blue-500 text-white hover:bg-blue-600 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
          >
            Add Repository
          </button>
        </div>
      </form>
    </Modal>
  );
}

// Maintain compatibility with existing code
export const AddModelModal = AddAIAdvisorModal;

export function AddAIAdvisorModal({ isOpen, onClose, onSave }: AddAIAdvisorModalProps) {
  const [provider, setProvider] = useState<LLMProvider>("gemini");
  const [modelId, setModelId] = useState<string>("");
  const [customName, setCustomName] = useState<string>("");
  const [apiKey, setApiKey] = useState("");
  const [isValid, setIsValid] = useState(false);

  // Reset form on open
  useEffect(() => {
    if (isOpen) {
      // Use Gemini as default
      setProvider("gemini");
      // Set default modelId for the provider
      const defaultModel = PREDEFINED_MODELS.find((m) => m.provider === "gemini" && m.isDefault);
      setModelId(defaultModel?.modelId || "");
      setCustomName("");
      setApiKey("");
      setIsValid(false);
    }
  }, [isOpen]);

  // Filter models by selected provider
  const providerModels = PREDEFINED_MODELS.filter((model) => model.provider === provider);

  // Update modelId when provider changes
  useEffect(() => {
    const defaultModel = PREDEFINED_MODELS.find((m) => m.provider === provider && m.isDefault);
    setModelId(defaultModel?.modelId || "");
  }, [provider]);

  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setProvider(e.target.value as LLMProvider);
  };

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setModelId(e.target.value);

    // Update custom name based on selected model
    const selectedModel = PREDEFINED_MODELS.find((m) => m.modelId === e.target.value);
    if (selectedModel) {
      setCustomName(selectedModel.name || "");
    }
  };

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const key = e.target.value;
    setApiKey(key);
    validateApiKey(key);
  };

  const handleCustomNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomName(e.target.value);
  };

  const validateApiKey = (key: string) => {
    // Different validation for different providers
    switch (provider) {
      case "gemini":
        // Gemini API key validation (starts with 'AIza' followed by 35 characters)
        setIsValid(/^AIza[0-9A-Za-z-_]{35}$/.test(key));
        break;
      case "anthropic":
        // Claude API key validation (starts with 'sk-ant-' followed by characters)
        setIsValid(/^sk-ant-[0-9A-Za-z-_]{24,}$/.test(key));
        break;
      case "openai":
        // OpenAI API key validation (starts with 'sk-' followed by characters)
        setIsValid(/^sk-[0-9A-Za-z-_]{24,}$/.test(key));
        break;
      default:
        // Generic validation - at least 20 chars
        setIsValid(key.length >= 20);
    }
  };

  const getApiKeyPlaceholder = () => {
    switch (provider) {
      case "gemini":
        return "AIza...";
      case "anthropic":
        return "sk-ant-...";
      case "openai":
        return "sk-...";
      default:
        return "Enter API key";
    }
  };

  const getProviderName = (providerKey: LLMProvider): string => {
    switch (providerKey) {
      case "gemini":
        return "Google AI (Gemini)";
      case "anthropic":
        return "Anthropic (Claude)";
      case "openai":
        return "OpenAI (GPT)";
      default:
        // Use safe string operations with type assertion to string
        const providerStr = String(providerKey);
        return providerStr.length > 0 ? providerStr.charAt(0).toUpperCase() + providerStr.slice(1) : "Unknown";
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isValid) {
      onSave(provider, apiKey, modelId, customName);
      setApiKey("");
      setCustomName("");
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add AI Advisor">
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="provider" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            AI Provider
          </label>
          <select
            id="provider"
            value={provider}
            onChange={handleProviderChange}
            className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            <option value="gemini">{getProviderName("gemini")}</option>
            <option value="anthropic">{getProviderName("anthropic")}</option>
            <option value="openai">{getProviderName("openai")}</option>
          </select>
        </div>

        <div className="mb-4">
          <label htmlFor="modelId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            AI Advisor Type
          </label>
          <select
            id="modelId"
            value={modelId}
            onChange={handleModelChange}
            className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            {providerModels.map((model) => (
              <option key={model.modelId} value={model.modelId}>
                {model.name} {model.description ? `- ${model.description}` : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-4">
          <label htmlFor="customName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Display Name (Optional)
          </label>
          <input
            type="text"
            id="customName"
            value={customName}
            onChange={handleCustomNameChange}
            placeholder="Custom display name"
            className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          />
        </div>

        <div className="mb-4">
          <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            API Key
          </label>
          <input
            type="password"
            id="apiKey"
            value={apiKey}
            onChange={handleApiKeyChange}
            placeholder={getApiKeyPlaceholder()}
            className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            autoFocus
          />
          {apiKey && !isValid && (
            <p className="mt-1 text-sm text-red-500">Please enter a valid {getProviderName(provider)} API key</p>
          )}

          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            <p>Your API key is stored locally in your browser and never sent to our servers.</p>
            <p className="mt-1">
              {provider === "gemini" && "Get your Gemini API key from Google AI Studio."}
              {provider === "anthropic" && "Get your Claude API key from Anthropic's console."}
              {provider === "openai" && "Get your OpenAI API key from OpenAI's dashboard."}
            </p>
          </div>
        </div>

        <div className="flex justify-end space-x-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!isValid}
            className="px-4 py-2 text-sm rounded-md bg-blue-500 text-white hover:bg-blue-600 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
          >
            Add AI Advisor
          </button>
        </div>
      </form>
    </Modal>
  );
}
