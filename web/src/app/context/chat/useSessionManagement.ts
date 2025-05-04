"use client";

import { useState, useCallback, useEffect } from "react";
import { ChatSession, Message, MAX_SESSIONS } from "./types";
import { saveSessions, loadSessions } from "./storage-service";

export function useSessionManagement() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [selectedRepositoryId, setSelectedRepositoryId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [storageUpdating, setStorageUpdating] = useState(false);

  // Generate a unique ID
  const generateId = useCallback(() => Math.random().toString(36).substring(2, 9), []);

  // Create a new session
  const createNewSession = useCallback(() => {
    const newSessionId = generateId();
    const newSession: ChatSession = {
      id: newSessionId,
      title: `Chat ${new Date().toLocaleString()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      messages: [],
      modelId: selectedModelId || undefined,
      repositoryId: selectedRepositoryId || undefined,
    };

    // Limit to MAX_SESSIONS by removing the oldest ones if needed
    setSessions((prev) => {
      const newSessions = [newSession, ...prev];
      return newSessions.slice(0, MAX_SESSIONS);
    });

    setCurrentSessionId(newSessionId);
    setMessages([]);
  }, [generateId, selectedModelId, selectedRepositoryId]);

  // Batched localStorage update
  const updateLocalStorage = useCallback((updatedSessions: ChatSession[], updatedCurrentSessionId: string | null) => {
    setStorageUpdating(true);

    try {
      saveSessions(updatedSessions, updatedCurrentSessionId);
    } finally {
      setStorageUpdating(false);
    }
  }, []);

  // Load sessions from localStorage on initial render
  useEffect(() => {
    try {
      const {
        sessions: loadedSessions,
        currentSessionId: loadedSessionId,
        selectedModelId: loadedModelId,
        selectedRepositoryId: loadedRepositoryId,
      } = loadSessions();

      // Only keep MAX_SESSIONS
      const limitedSessions = loadedSessions.slice(0, MAX_SESSIONS);
      setSessions(limitedSessions);

      // Load current session if exists
      if (loadedSessionId && limitedSessions.some((s) => s.id === loadedSessionId)) {
        setCurrentSessionId(loadedSessionId);
        const currentSession = limitedSessions.find((s) => s.id === loadedSessionId);
        if (currentSession) {
          setMessages(currentSession.messages);
          if (currentSession.modelId) {
            setSelectedModelId(currentSession.modelId);
          }
          if (currentSession.repositoryId) {
            setSelectedRepositoryId(currentSession.repositoryId);
          }
        }
      } else if (limitedSessions.length > 0) {
        // Default to most recent session
        setCurrentSessionId(limitedSessions[0].id);
        setMessages(limitedSessions[0].messages);
        if (limitedSessions[0].modelId) {
          setSelectedModelId(limitedSessions[0].modelId);
        }
        if (limitedSessions[0].repositoryId) {
          setSelectedRepositoryId(limitedSessions[0].repositoryId);
        }
      } else {
        // Create a new session if none exist
        createNewSession();
      }

      // Load selected model and repository if exists
      if (loadedModelId) {
        setSelectedModelId(loadedModelId);
      }

      if (loadedRepositoryId) {
        setSelectedRepositoryId(loadedRepositoryId);
      }
    } catch (error) {
      console.error("Error loading from localStorage:", error);
      createNewSession(); // Fallback to new session on error
    }
  }, [createNewSession]);

  // Save sessions to localStorage with debounce (only when not already updating)
  useEffect(() => {
    if (sessions.length > 0 && !storageUpdating) {
      const timer = setTimeout(() => {
        updateLocalStorage(sessions, currentSessionId);
      }, 300); // 300ms debounce

      return () => clearTimeout(timer);
    }
  }, [sessions, currentSessionId, updateLocalStorage, storageUpdating]);

  // Switch to a different session
  const switchSession = useCallback(
    (sessionId: string) => {
      const session = sessions.find((s) => s.id === sessionId);
      if (session) {
        setCurrentSessionId(sessionId);
        setMessages(session.messages);

        // Update selected model and repository based on session
        if (session.modelId) {
          setSelectedModelId(session.modelId);
        }
        if (session.repositoryId) {
          setSelectedRepositoryId(session.repositoryId);
        }
      }
    },
    [sessions],
  );

  // Delete a session
  const deleteSession = useCallback(
    (sessionId: string) => {
      const updatedSessions = sessions.filter((s) => s.id !== sessionId);
      setSessions(updatedSessions);

      if (currentSessionId === sessionId) {
        if (updatedSessions.length > 0) {
          switchSession(updatedSessions[0].id);
        } else {
          createNewSession();
        }
      }
    },
    [sessions, currentSessionId, switchSession, createNewSession],
  );

  return {
    sessions,
    currentSessionId,
    selectedModelId,
    setSelectedModelId,
    selectedRepositoryId,
    setSelectedRepositoryId,
    messages,
    setMessages,
    createNewSession,
    switchSession,
    deleteSession,
    generateId,
    setSessions,
  };
}
