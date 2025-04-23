"use client"

import { useState } from 'react';

const models = [
  { id: 'gemini', name: 'Gemini', provider: 'Google' },
  { id: 'gpt4', name: 'GPT-4', provider: 'OpenAI' },
  { id: 'claude', name: 'Claude', provider: 'Anthropic' }
];

interface ModelSelectorProps {
  onSelectModel: (modelId: string) => void;
}

export function ModelSelector({ onSelectModel }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState(models[0]);

  const handleSelect = (model: typeof models[0]) => {
    setSelectedModel(model);
    onSelectModel(model.id);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-1 px-3 py-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className="text-sm font-medium">{selectedModel.name}</span>
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className="h-4 w-4" 
          viewBox="0 0 20 20" 
          fill="currentColor"
        >
          <path 
            fillRule="evenodd" 
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" 
            clipRule="evenodd" 
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-10">
          <ul 
            role="listbox" 
            className="py-1"
          >
            {models.map((model) => (
              <li
                key={model.id}
                role="option"
                aria-selected={model.id === selectedModel.id}
                onClick={() => handleSelect(model)}
                className={`
                  px-4 py-2 text-sm cursor-pointer flex justify-between items-center
                  ${model.id === selectedModel.id ? 'bg-gray-100 dark:bg-gray-800' : ''}
                  hover:bg-gray-100 dark:hover:bg-gray-800
                `}
              >
                <span>{model.name}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">{model.provider}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
