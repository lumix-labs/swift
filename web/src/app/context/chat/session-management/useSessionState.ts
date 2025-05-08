"use client";

import { useState, useEffect } from "react";
import { ChatSession } from "../types";
import { Message } from "../../../lib/types/message";
import { loadSessions, saveSessions } from "../storage-service";
import { generateId } from "./utils";

/**
 * Core hook for session state management
 * This handles the basic state for sessions and current selection
 */
export function useSessionState() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [selectedAIAdvisorId, setSelectedAIAdvisorId] = useState<string | null>(null);
  const [selectedRepositoryId, setSelectedRepositoryId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

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
      const defaultSession = createDefaultSession();
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
  }, []);

  // Save sessions to localStorage when they change
  useEffect(() => {
    if (sessions.length > 0) {
      saveSessions(sessions, currentSessionId);
    }
  }, [sessions, currentSessionId]);

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
  };
}

// Helper to create a default session
export function createDefaultSession(): ChatSession {
  return {
    id: generateId(),
    title: "New Chat",
    createdAt: new Date(),
    updatedAt: new Date(),
    messages: [],
  };
}
