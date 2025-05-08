"use client";

import { useCallback } from "react";
import { ChatSession, MAX_SESSIONS } from "../types";
import { createDefaultSession } from "./useSessionState";

export function useSessionCreate(props: {
  sessions: ChatSession[];
  setSessions: (sessions: ChatSession[]) => void;
  setCurrentSessionId: (id: string | null) => void;
  setMessages: (messages: any[]) => void;
  selectedAIAdvisorId: string | null;
  selectedRepositoryId: string | null;
}) {
  const { sessions, setSessions, setCurrentSessionId, setMessages, selectedAIAdvisorId, selectedRepositoryId } = props;

  // Create a new chat session and set it as the current session
  const createNewSession = useCallback(() => {
    const newSession = createDefaultSession();

    // If we already have MAX_SESSIONS, remove the oldest one
    let updatedSessions = [...sessions];
    if (updatedSessions.length >= MAX_SESSIONS) {
      // Sort by updatedAt to find the oldest session
      updatedSessions.sort((a, b) => a.updatedAt.getTime() - b.updatedAt.getTime());
      // Remove the oldest session
      updatedSessions.shift();
    }

    // Add the new session
    updatedSessions = [...updatedSessions, newSession];

    // Sort sessions by updatedAt in descending order
    updatedSessions.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

    // Update sessions and current session
    setSessions(updatedSessions);
    setCurrentSessionId(newSession.id);
    setMessages([]);

    // Set AI advisor for the new session if one is selected
    if (selectedAIAdvisorId) {
      // Update the new session with the selected AI advisor
      const sessionWithAdvisor: ChatSession = {
        ...newSession,
        aiAdvisorId: selectedAIAdvisorId,
      };

      // Update sessions state with the modified session
      const updatedSessionsWithAdvisor = updatedSessions.map((session) => {
        if (session.id === newSession.id) {
          return sessionWithAdvisor;
        }
        return session;
      });

      setSessions(updatedSessionsWithAdvisor);
    }

    // Set repository for the new session if one is selected
    if (selectedRepositoryId) {
      // Update the new session with the selected repository
      const updatedSessionsWithRepo = updatedSessions.map((session) => {
        if (session.id === newSession.id) {
          return {
            ...session,
            repositoryId: selectedRepositoryId,
          };
        }
        return session;
      });

      setSessions(updatedSessionsWithRepo);
    }
  }, [sessions, setSessions, setCurrentSessionId, setMessages, selectedAIAdvisorId, selectedRepositoryId]);

  return {
    createNewSession,
  };
}
