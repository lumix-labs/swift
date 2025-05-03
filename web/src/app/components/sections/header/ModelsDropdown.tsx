"use client";
import React, { useState, useEffect } from "react";
import { LLMModel, LLMProvider } from "../../../lib/types/entities";
import { getModels, addModel, removeModel } from "../../../lib/services/entity-service";
import { AddModelModal } from "../shared/AddEntityModal";
import { useChat } from "../../../context/ChatContext";

export interface ModelsDropdownProps {
  show: boolean;
  setShow: (show: boolean) => void;
  resolvedTheme: string;
}

export function ModelsDropdown({ show, setShow, resolvedTheme }: ModelsDropdownProps) {
  const { selectedModelId, setSelectedModelId } = useChat();
  const [models, setModels] = useState<LLMModel[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Load models on component mount
  useEffect(() => {
    setModels(getModels());
  }, []);

  const handleAddClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShow(false);
    setShowAddModal(true);
  };

  const handleModelSave = (provider: LLMProvider, apiKey: string) => {
    // Check if model with the same name already exists
    const modelName = provider === 'gemini' ? 'Gemini Pro' : 'Claude';
    const newModelName = `${modelName} ${new Date().toLocaleDateString()}`;
    
    const existingModel = models.find(model => 
      model.name.toLowerCase() === newModelName.toLowerCase()
    );
    
    if (existingModel) {
      // Model with same name already exists
      alert(`A model named "${existingModel.name}" already exists.`);
      return;
    }
    
    const newModel = addModel(provider, apiKey);
    setModels([...models, newModel]);
    // Automatically select the newly added model
    setSelectedModelId(newModel.id);
  };

  const handleModelRemove = (id: string) => {
    removeModel(id);
    setModels(models.filter(model => model.id !== id));
    // If the removed model was selected, clear the selection
    if (id === selectedModelId) {
      setSelectedModelId(null);
    }
  };

  const handleModelSelect = (id: string) => {
    setSelectedModelId(id);
    setShow(false);
  };

  const handleClickOutside = (e: MouseEvent) => {
    if (show) {
      setShow(false);
    }
  };

  // Set up click outside listener
  useEffect(() => {
    if (show) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [show]);

  // Get the currently selected model for display
  const selectedModel = models.find(model => model.id === selectedModelId);
  const buttonText = selectedModel ? `Model: ${selectedModel.name}` : "Models";

  return (
    <div className="relative">
      <button
        className={`p-2 sm:px-3 sm:py-1.5 text-sm font-medium rounded-md ${resolvedTheme === 'dark' ? 'bg-white text-black' : 'bg-black text-white'}`}
        onClick={(e) => {
          e.stopPropagation();
          setShow(!show);
        }}
      >
        <span className="hidden sm:inline">{buttonText}</span>
        <span className="sm:hidden">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
          </svg>
        </span>
      </button>
      {show && (
        <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-900 rounded-md shadow-lg z-10">
          {models.length > 0 ? (
            models.map((model) => (
              <div 
                key={model.id} 
                className={`p-2 border-b border-gray-200 dark:border-gray-700 last:border-0 ${
                  model.id === selectedModelId ? 'bg-gray-100 dark:bg-gray-800' : ''
                }`}
              >
                <div className="flex justify-between items-center">
                  <div 
                    className="flex-1 cursor-pointer" 
                    onClick={() => handleModelSelect(model.id)}
                  >
                    <div className="font-medium">{model.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {model.provider.charAt(0).toUpperCase() + model.provider.slice(1)}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleModelRemove(model.id);
                    }}
                    className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                    aria-label="Remove model"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
              No models added yet
            </div>
          )}
          <div className="p-2 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleAddClick}
              className="w-full p-2 text-sm bg-gray-100 dark:bg-gray-800 rounded hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Add new model
            </button>
          </div>
        </div>
      )}
      <AddModelModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={handleModelSave}
      />
    </div>
  );
}
