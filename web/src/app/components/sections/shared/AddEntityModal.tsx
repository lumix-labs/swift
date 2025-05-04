"use client";

import React, { useState } from "react";
import { Modal } from "./Modal";
import { LLMProvider } from "../../../lib/types/entities";

interface AddRepositoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (repoUrl: string) => void;
}

interface AddModelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (provider: LLMProvider, apiKey: string) => void;
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
            className="px-4 py-2 text-sm rounded-md bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
          >
            Add Repository
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function AddModelModal({ isOpen, onClose, onSave }: AddModelModalProps) {
  const [provider] = useState<LLMProvider>("gemini"); // Fixed to gemini provider only
  const [apiKey, setApiKey] = useState("");
  const [isValid, setIsValid] = useState(false);

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const key = e.target.value;
    setApiKey(key);

    // Gemini API key validation
    setIsValid(/^AIza[0-9A-Za-z-_]{35}$/.test(key));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isValid) {
      onSave(provider, apiKey);
      setApiKey("");
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add LLM Model">
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="provider" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Provider
          </label>
          <div className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
            Gemini
          </div>
        </div>
        <div className="mb-4">
          <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            API Key
          </label>
          <input
            type="text"
            id="apiKey"
            value={apiKey}
            onChange={handleApiKeyChange}
            placeholder="AIza..."
            className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            autoFocus
          />
          {apiKey && !isValid && <p className="mt-1 text-sm text-red-500">Please enter a valid Gemini API key</p>}
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
            className="px-4 py-2 text-sm rounded-md bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
          >
            Add Model
          </button>
        </div>
      </form>
    </Modal>
  );
}
