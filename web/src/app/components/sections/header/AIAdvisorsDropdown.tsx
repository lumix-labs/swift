"use client";

import React, { useMemo, useCallback, useEffect } from "react";
import Image from "next/image";
// Removed unused import: LLMProvider
import { AddAIAdvisorModal } from "../shared/AddEntityModal";
import { useDropdown } from "../../../hooks/header/useDropdown";
import { useAIAdvisorsDropdown } from "../../../hooks/header/useAIAdvisorsDropdown";
import { RemoveButton } from "./RemoveButton";

export interface AIAdvisorsDropdownProps {
  resolvedTheme: string;
}

export function AIAdvisorsDropdown({ resolvedTheme }: AIAdvisorsDropdownProps) {
  // Use custom hooks for dropdown and AI advisors management
  const { show, setShow, dropdownRef, toggleDropdown } = useDropdown();

  const {
    selectedAIAdvisorId,
    aiAdvisors,
    isUpdating,
    isActionInProgress,
    showAddModal,
    setShowAddModal,
    handleAddClick,
    handleAIAdvisorSave,
    handleAIAdvisorRemove,
    handleAIAdvisorSelect,
  } = useAIAdvisorsDropdown();

  // Ensure aiAdvisors is always an array - wrapped in useMemo to avoid dependency changes
  const safeAIAdvisors = useMemo(() => (Array.isArray(aiAdvisors) ? aiAdvisors : []), [aiAdvisors]);

  // Auto-select first AI advisor if none is selected
  useEffect(() => {
    if (!selectedAIAdvisorId && safeAIAdvisors.length > 0) {
      handleAIAdvisorSelect(safeAIAdvisors[0].id);
    }
  }, [safeAIAdvisors, selectedAIAdvisorId, handleAIAdvisorSelect]);

  // Handle add button click - wrap in useCallback to prevent recreation
  const onAddClick = useCallback(
    (e: React.MouseEvent) => {
      if (handleAddClick(e)) {
        setShow(false);
      }
    },
    [handleAddClick, setShow],
  );

  // Handle AI advisor selection - wrap in useCallback to prevent recreation
  const onAIAdvisorSelect = useCallback(
    (id: string) => {
      if (handleAIAdvisorSelect(id)) {
        setShow(false);
      }
    },
    [handleAIAdvisorSelect, setShow],
  );

  // Group AI advisors by personality type for better organization
  const aiAdvisorsList = useMemo(() => {
    if (isUpdating) {
      return (
        <div className="p-4 text-center">
          <div className="flex justify-center items-center space-x-2">
            <div
              className="w-4 h-4 border-2 border-gray-500 dark:border-gray-400 
                          border-t-transparent rounded-full animate-spin"
            ></div>
            <span className="text-gray-500 dark:text-gray-400 text-sm">Updating AI advisors...</span>
          </div>
        </div>
      );
    }

    if (safeAIAdvisors.length === 0) {
      return <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">No AI advisors added yet</div>;
    }

    // Just show a flat list of AI advisors with their personalities
    return (
      <div className="max-h-[50vh] overflow-y-auto">
        {safeAIAdvisors.map((advisor) => {
          const isSelected = advisor.id === selectedAIAdvisorId;
          const hasApiKey = advisor.apiKey && advisor.apiKey.length > 0;

          return (
            <div
              key={advisor.id}
              className={`p-2 border-b border-gray-100 dark:border-gray-800 last:border-0 ${
                isSelected ? "bg-gray-100 dark:bg-gray-800 border-l-4 border-l-blue-500 dark:border-l-blue-400" : ""
              }`}
            >
              <div className="flex justify-between items-center">
                <div
                  className={`flex-1 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 rounded-md p-1.5 
                    transition-colors duration-200 ${!hasApiKey ? "opacity-60" : ""}`}
                  onClick={() => hasApiKey && onAIAdvisorSelect(advisor.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if ((e.key === "Enter" || e.key === " ") && hasApiKey) {
                      onAIAdvisorSelect(advisor.id);
                    }
                  }}
                >
                  <div className="flex items-center">
                    {advisor.icon && (
                      <div className="mr-2 flex-shrink-0">
                        <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex items-center justify-center">
                          {advisor.icon ? (
                            <Image
                              src={advisor.icon}
                              alt={advisor.name || "AI Advisor"}
                              width={24}
                              height={24}
                              className="object-cover"
                            />
                          ) : (
                            <span className="text-xs font-bold">{(advisor.name || "A").charAt(0)}</span>
                          )}
                        </div>
                      </div>
                    )}
                    <div>
                      <div className="font-medium text-gray-800 dark:text-gray-200">{advisor.name || "AI Advisor"}</div>
                      {advisor.description && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">{advisor.description}</div>
                      )}
                      {!hasApiKey && (
                        <div className="text-xs mt-1 text-amber-600 dark:text-amber-400 font-medium">
                          API key needed
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                {/* Use the RemoveButton component */}
                <div className="ml-2">
                  <RemoveButton
                    onClick={() => handleAIAdvisorRemove(advisor.id)}
                    disabled={isActionInProgress || safeAIAdvisors.length <= 1}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }, [safeAIAdvisors, selectedAIAdvisorId, isUpdating, isActionInProgress, onAIAdvisorSelect, handleAIAdvisorRemove]);

  // Get currently selected AI advisor for display
  const selectedAIAdvisor = useMemo(
    () =>
      selectedAIAdvisorId && safeAIAdvisors.length > 0
        ? safeAIAdvisors.find((m) => m.id === selectedAIAdvisorId) || null
        : null,
    [selectedAIAdvisorId, safeAIAdvisors],
  );

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        className={`p-2 sm:px-3 sm:py-1.5 text-sm font-medium rounded-md ${
          resolvedTheme === "dark" ? "bg-white text-black" : "bg-black text-white"
        }`}
        onClick={toggleDropdown}
        disabled={isActionInProgress}
      >
        <div className="flex items-center">
          {selectedAIAdvisor?.icon && (
            <Image
              src={selectedAIAdvisor.icon}
              alt={selectedAIAdvisor?.name || "AI Advisor"}
              width={16}
              height={16}
              className="mr-1.5 rounded-full"
            />
          )}
          <span className="hidden sm:inline">AI Advisor {selectedAIAdvisor?.name}</span>
          <span className="sm:hidden">{selectedAIAdvisor?.icon ? "" : "AI"}</span>
        </div>
      </button>

      {show && (
        <div
          className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-900 
                      rounded-md shadow-lg z-10 overflow-hidden"
        >
          {aiAdvisorsList}

          <div className="p-2 border-t border-gray-200 dark:border-gray-700 grid grid-cols-1 gap-2">
            <button
              onClick={onAddClick}
              className="p-2 text-sm bg-blue-500 text-white rounded 
                        hover:bg-blue-600 transition-colors duration-200 flex items-center justify-center"
              disabled={isUpdating || isActionInProgress}
            >
              {isUpdating ? (
                <div
                  className="w-4 h-4 border-2 border-white/60 
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
              Add AI Advisor
            </button>
          </div>
        </div>
      )}

      <AddAIAdvisorModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} onSave={handleAIAdvisorSave} />
    </div>
  );
}
