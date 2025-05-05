"use client";

import { useState, useEffect, useCallback } from "react";
import { ChatSession, MAX_SESSIONS } from "./types";
import { Message } from "../../lib/types/message";
import { loadSessions, saveSessions } from "./storage-service";

export function useSessionManagement() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [selectedAIAdvisorId, setSelectedAIAdvisorId] = useState<string | null>(null);
  const [selectedRepositoryId, setSelectedRepositoryId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  // Generate a unique ID using timestamp and random number
  const generateId = useCallback(() => {
    return `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  }, []);

  // Load sessions, current session ID, and selected entities from localStorage on mount
  useEffect(() => {
    const { sessions, currentSessionId, selectedAIAdvisorId, selectedRepositoryId } = loadSessions();

    if (sessions.length > 0) {
      // Sort sessions by updatedAt date in descending order (newest first)
      const sortedSessions = [...sessions].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

      setSessions(sortedSessions);

      // If there is a specified current session, use it
      if (currentSessionId && sortedSessions.some((session) => session.id === currentSessionId)) {
        setCurrentSessionId(currentSessionId);
        // Set messages to the current session's messages
        const currentSession = sortedSessions.find((session) => session.id === currentSessionId);
        if (currentSession) {
          setMessages(currentSession.messages);
        }
      } else {
        // Otherwise, use the most recent session
        setCurrentSessionId(sortedSessions[0].id);
        setMessages(sortedSessions[0].messages);
      }
    } else {
      // If no sessions exist, create a new default session
      const defaultSession = createDefaultSession(generateId);
      setSessions([defaultSession]);
      setCurrentSessionId(defaultSession.id);
      setMessages([]);
    }

    // Set selected AI advisor and repository
    if (selectedAIAdvisorId) {
      setSelectedAIAdvisorId(selectedAIAdvisorId);
    }
    if (selectedRepositoryId) {
      setSelectedRepositoryId(selectedRepositoryId);
    }
  }, [generateId]);

  // Save sessions to localStorage when they change
  useEffect(() => {
    if (sessions.length > 0) {
      saveSessions(sessions, currentSessionId);
    }
  }, [sessions, currentSessionId]);

  // Create a new chat session and set it as the current session
  const createNewSession = useCallback(() => {
    const newSession = createDefaultSession(generateId);

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
  }, [sessions, generateId, selectedAIAdvisorId, selectedRepositoryId]);

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
    [sessions],
  );

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
    [sessions, currentSessionId],
  );

  return {
    sessions,
    setSessions,
    currentSessionId,
    setCurrentSessionId,
    selectedAIAdvisorId,
    setSelectedAIAdvisorId,
    selectedRepositoryId,
    setSelectedRepositoryId,
    messages,
    setMessages,
    createNewSession,
    switchSession,
    deleteSession,
    generateId,
  };
}

// Helper to create a default session
function createDefaultSession(generateId: () => string): ChatSession {
  return {
    id: generateId(),
    title: "New Chat",
    createdAt: new Date(),
    updatedAt: new Date(),
    messages: [],
  };
}
