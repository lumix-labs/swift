"use client";

import React, { useMemo, useCallback } from "react";
import { AddModelModal } from "../shared/AddEntityModal";
import { useDropdown } from "../../../hooks/header/useDropdown";
import { useModelsDropdown } from "../../../hooks/header/useModelsDropdown";

export interface ModelsDropdownProps {
  resolvedTheme: string;
}

export function ModelsDropdown({ resolvedTheme }: ModelsDropdownProps) {
  // Use custom hooks for dropdown and models management
  const { show, setShow, dropdownRef, toggleDropdown } = useDropdown();

  const {
    selectedModelId,
    models,
    isUpdating,
    isActionInProgress,
    showAddModal,
    setShowAddModal,
    handleAddClick,
    handleModelSave,
    handleModelRemove,
    handleModelSelect,
  } = useModelsDropdown();

  // Handle add button click - wrap in useCallback to prevent recreation
  const onAddClick = useCallback(
    (e: React.MouseEvent) => {
      if (handleAddClick(e)) {
        setShow(false);
      }
    },
    [handleAddClick, setShow],
  );

  // Handle model selection - wrap in useCallback to prevent recreation
  const onModelSelect = useCallback(
    (id: string) => {
      if (handleModelSelect(id)) {
        setShow(false);
      }
    },
    [handleModelSelect, setShow],
  );

  // Memoized models list to prevent unnecessary re-renders
  const modelsList = useMemo(() => {
    if (isUpdating) {
      return (
        <div className="p-4 text-center">
          <div className="flex justify-center items-center space-x-2">
            <div
              className="w-4 h-4 border-2 border-gray-500 dark:border-gray-400 
                          border-t-transparent rounded-full animate-spin"
            ></div>
            <span className="text-gray-500 dark:text-gray-400 text-sm">Updating models...</span>
          </div>
        </div>
      );
    }

    if (models.length === 0) {
      return <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">No models added yet</div>;
    }

    return models.map((model) => {
      const isSelected = model.id === selectedModelId;

      return (
        <div
          key={model.id}
          className={`p-2 border-b border-gray-200 dark:border-gray-700 last:border-0 ${
            isSelected ? "bg-gray-100 dark:bg-gray-800" : ""
          }`}
        >
          <div className="flex justify-between items-center">
            <div className="flex-1 cursor-pointer" onClick={() => onModelSelect(model.id)}>
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
              disabled={isActionInProgress}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 text-gray-500 dark:text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      );
    });
  }, [models, selectedModelId, isUpdating, isActionInProgress, onModelSelect, handleModelRemove]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        className={`p-2 sm:px-3 sm:py-1.5 text-sm font-medium rounded-md ${
          resolvedTheme === "dark" ? "bg-white text-black" : "bg-black text-white"
        }`}
        onClick={toggleDropdown}
        disabled={isActionInProgress}
      >
        <span className="hidden sm:inline">Models</span>
        <span className="sm:hidden">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path
              d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 
                    01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z"
            />
          </svg>
        </span>
      </button>

      {show && (
        <div
          className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-900 
                      rounded-md shadow-lg z-10"
        >
          {modelsList}
          <div className="p-2 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={onAddClick}
              className="w-full p-2 text-sm bg-gray-100 dark:bg-gray-800 rounded 
                       hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center"
              disabled={isUpdating || isActionInProgress}
            >
              {isUpdating ? (
                <div
                  className="w-4 h-4 border-2 border-gray-500 dark:border-gray-400 
                              border-t-transparent rounded-full animate-spin mr-2"
                ></div>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 mr-1"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 
                                             11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
              Add new model
            </button>
          </div>
        </div>
      )}

      <AddModelModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} onSave={handleModelSave} />
    </div>
  );
}
