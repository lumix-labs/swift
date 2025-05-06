"use client";

import { createContext, useContext, useState, ReactNode, useCallback, useMemo } from "react";
import { useSessionManagement } from "./useSessionManagement";

export interface SessionContextType {
  sessions: any[];
  currentSessionId: string | null;
  createNewSession: () => void;
  switchSession: (sessionId: string) => void;
  deleteSession: (sessionId: string) => void;
}

// Create the context with default values
const SessionContext = createContext<SessionContextType>({
  sessions: [],
  currentSessionId: null,
  createNewSession: () => {},
  switchSession: () => {},
  deleteSession: () => {},
});

// Create a provider component
export function SessionProvider({ children }: { children: ReactNode }) {
  const { sessions, currentSessionId, createNewSession, switchSession, deleteSession } = useSessionManagement();

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({
      sessions,
      currentSessionId,
      createNewSession,
      switchSession,
      deleteSession,
    }),
    [sessions, currentSessionId, createNewSession, switchSession, deleteSession],
  );

  return <SessionContext.Provider value={contextValue}>{children}</SessionContext.Provider>;
}

// Create a hook for using the session context
export function useSession() {
  return useContext(SessionContext);
}
