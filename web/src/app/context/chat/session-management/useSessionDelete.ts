"use client";

import { useCallback } from "react";
import { ChatSession } from "../types";

export function useSessionDelete(props: {
  sessions: ChatSession[];
  setSessions: (sessions: ChatSession[]) => void;
  currentSessionId: string | null;
  setCurrentSessionId: (id: string | null) => void;
  setMessages: (messages: any[]) => void;
  setSelectedAIAdvisorId: (id: string | null) => void;
  setSelectedRepositoryId: (id: string | null) => void;
}) {
  const {
    sessions,
    setSessions,
    currentSessionId,
    setCurrentSessionId,
    setMessages,
    setSelectedAIAdvisorId,
    setSelectedRepositoryId,
  } = props;

  // Delete a session
  const deleteSession = useCallback(
    (sessionId: string) => {
      // Make sure we have more than one session
      if (sessions.length <= 1) {
        console.warn("Cannot delete the only session");
        return;
      }

      // Remove the session
      const updatedSessions = sessions.filter((session) => session.id !== sessionId);
      setSessions(updatedSessions);

      // If the deleted session was the current session, switch to another one
      if (currentSessionId === sessionId) {
        const newCurrentSession = updatedSessions[0];
        setCurrentSessionId(newCurrentSession.id);
        setMessages(newCurrentSession.messages);

        // Update AI advisor and repository selection based on new session
        if (updatedSessions[0].aiAdvisorId) {
          setSelectedAIAdvisorId(updatedSessions[0].aiAdvisorId);
        }

        if (updatedSessions[0].repositoryId) {
          setSelectedRepositoryId(updatedSessions[0].repositoryId);
        }
      }
    },
    [
      sessions,
      setSessions,
      currentSessionId,
      setCurrentSessionId,
      setMessages,
      setSelectedAIAdvisorId,
      setSelectedRepositoryId,
    ],
  );

  return {
    deleteSession,
  };
}
