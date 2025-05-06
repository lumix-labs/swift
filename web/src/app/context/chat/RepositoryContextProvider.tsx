"use client";

import { createContext, useContext, useState, ReactNode, useCallback, useMemo } from "react";
import { saveSelectedRepositoryId } from "./storage-service";
import { useSessionManagement } from "./useSessionManagement";

export interface RepositoryContextType {
  selectedRepositoryId: string | null;
  setSelectedRepositoryId: (repositoryId: string | null) => void;
}

// Create the context with default values
const RepositoryContext = createContext<RepositoryContextType>({
  selectedRepositoryId: null,
  setSelectedRepositoryId: () => {},
});

// Create a provider component
export function RepositoryProvider({ children }: { children: ReactNode }) {
  const {
    currentSessionId,
    selectedRepositoryId,
    setSelectedRepositoryId: setSelectedRepositoryIdRaw,
    setSessions,
  } = useSessionManagement();

  // Wrap setSelectedRepositoryId to also update localStorage and session
  const setSelectedRepositoryId = useCallback(
    (repositoryId: string | null) => {
      setSelectedRepositoryIdRaw(repositoryId);
      saveSelectedRepositoryId(repositoryId);

      // Update current session with selected repository
      if (currentSessionId) {
        setSessions((prev) =>
          prev.map((session) => {
            if (session.id === currentSessionId) {
              return {
                ...session,
                repositoryId: repositoryId || undefined,
                updatedAt: new Date(),
              };
            }
            return session;
          }),
        );
      }
    },
    [currentSessionId, setSessions, setSelectedRepositoryIdRaw],
  );

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({
      selectedRepositoryId,
      setSelectedRepositoryId,
    }),
    [selectedRepositoryId, setSelectedRepositoryId],
  );

  return <RepositoryContext.Provider value={contextValue}>{children}</RepositoryContext.Provider>;
}

// Create a hook for using the repository context
export function useRepository() {
  return useContext(RepositoryContext);
}
