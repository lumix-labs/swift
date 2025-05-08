"use client";

import { useCallback } from "react";
import { ChatSession } from "../types";
import { saveSelectedAIAdvisorId, saveSelectedRepositoryId } from "../storage-service";

export function useEntitySelection(props: {
  sessions: ChatSession[];
  setSessions: (sessions: ChatSession[]) => void;
  currentSessionId: string | null;
  selectedAIAdvisorId: string | null;
  setSelectedAIAdvisorId: (id: string | null) => void;
  selectedRepositoryId: string | null;
  setSelectedRepositoryId: (id: string | null) => void;
}) {
  const {
    sessions,
    setSessions,
    currentSessionId,
    selectedAIAdvisorId,
    setSelectedAIAdvisorId,
    selectedRepositoryId,
    setSelectedRepositoryId,
  } = props;

  // Update AI advisor for the current session
  const updateSessionAIAdvisor = useCallback(
    (aiAdvisorId: string | null) => {
      setSelectedAIAdvisorId(aiAdvisorId);
      saveSelectedAIAdvisorId(aiAdvisorId);

      // Update the current session with the selected AI advisor
      if (currentSessionId) {
        setSessions(
          sessions.map((session: ChatSession) => {
            if (session.id === currentSessionId) {
              return {
                ...session,
                aiAdvisorId: aiAdvisorId || undefined,
                updatedAt: new Date(),
              };
            }
            return session;
          }),
        );
      }
    },
    [currentSessionId, setSessions, setSelectedAIAdvisorId, sessions],
  );

  // Update repository for the current session
  const updateSessionRepository = useCallback(
    (repositoryId: string | null) => {
      setSelectedRepositoryId(repositoryId);
      saveSelectedRepositoryId(repositoryId);

      // Update the current session with the selected repository
      if (currentSessionId) {
        setSessions(
          sessions.map((session: ChatSession) => {
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
    [currentSessionId, setSessions, setSelectedRepositoryId, sessions],
  );

  return {
    updateSessionAIAdvisor,
    updateSessionRepository,
    selectedAIAdvisorId,
    selectedRepositoryId,
  };
}
