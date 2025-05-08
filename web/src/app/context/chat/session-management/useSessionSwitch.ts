"use client";

import { useCallback } from "react";
import { ChatSession } from "../types";

export function useSessionSwitch(props: {
  sessions: ChatSession[];
  setCurrentSessionId: (id: string | null) => void;
  setMessages: (messages: any[]) => void;
  setSelectedAIAdvisorId: (id: string | null) => void;
  setSelectedRepositoryId: (id: string | null) => void;
}) {
  const { sessions, setCurrentSessionId, setMessages, setSelectedAIAdvisorId, setSelectedRepositoryId } = props;

  // Switch to another existing session
  const switchSession = useCallback(
    (sessionId: string) => {
      // Make sure the session exists
      const session = sessions.find((s) => s.id === sessionId);
      if (!session) {
        console.error(`Session with ID ${sessionId} not found`);
        return;
      }

      // Set current session and messages
      setCurrentSessionId(sessionId);
      setMessages(session.messages);

      // Update AI advisor and repository selection based on session
      if (session.aiAdvisorId) {
        setSelectedAIAdvisorId(session.aiAdvisorId);
      }

      if (session.repositoryId) {
        setSelectedRepositoryId(session.repositoryId);
      }
    },
    [sessions, setCurrentSessionId, setMessages, setSelectedAIAdvisorId, setSelectedRepositoryId],
  );

  return {
    switchSession,
  };
}
