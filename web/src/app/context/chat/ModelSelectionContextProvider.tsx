"use client";

import { createContext, useContext, useState, ReactNode, useCallback, useMemo, useEffect } from "react";
import { saveSelectedModelId } from "./storage-service";
import { useSessionManagement } from "./useSessionManagement";

export interface ModelSelectionContextType {
  selectedAIAdvisorId: string | null;
  setSelectedAIAdvisorId: (aiAdvisorId: string | null) => void;
  selectedModelId: string | null; // For backward compatibility
}

// Create the context with default values
const ModelSelectionContext = createContext<ModelSelectionContextType>({
  selectedAIAdvisorId: null,
  setSelectedAIAdvisorId: () => {},
  selectedModelId: null,
});

// Create a provider component
export function ModelSelectionProvider({ children }: { children: ReactNode }) {
  const {
    currentSessionId,
    selectedAIAdvisorId,
    setSelectedAIAdvisorId: setSelectedAIAdvisorIdRaw,
    setSessions,
  } = useSessionManagement();

  // Define selectedModelId as an alias to selectedAIAdvisorId for backward compatibility
  const selectedModelId = selectedAIAdvisorId;

  // Wrap setSelectedAIAdvisorId to also update localStorage and session
  const setSelectedAIAdvisorId = useCallback(
    (aiAdvisorId: string | null) => {
      setSelectedAIAdvisorIdRaw(aiAdvisorId);
      saveSelectedModelId(aiAdvisorId);

      // Update current session with selected AI advisor
      if (currentSessionId) {
        setSessions((prev) =>
          prev.map((session) => {
            if (session.id === currentSessionId) {
              return {
                ...session,
                aiAdvisorId: aiAdvisorId || undefined,
                modelId: aiAdvisorId || undefined, // Also update modelId for backward compatibility
                updatedAt: new Date(),
              };
            }
            return session;
          }),
        );
      }
    },
    [currentSessionId, setSessions, setSelectedAIAdvisorIdRaw],
  );

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({
      selectedAIAdvisorId,
      setSelectedAIAdvisorId,
      selectedModelId, // Include for backward compatibility
    }),
    [selectedAIAdvisorId, setSelectedAIAdvisorId, selectedModelId],
  );

  return <ModelSelectionContext.Provider value={contextValue}>{children}</ModelSelectionContext.Provider>;
}

// Create a hook for using the model selection context
export function useModelSelection() {
  return useContext(ModelSelectionContext);
}
