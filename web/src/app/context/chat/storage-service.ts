"use client";

import { ChatSession, SavedSession } from "./types";

// Save sessions to localStorage
export const saveSessions = (sessions: ChatSession[], currentSessionId: string | null): void => {
  try {
    // Convert dates to strings for storage
    const sessionsToStore = sessions.map((session) => ({
      ...session,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
      messages: session.messages.map((msg) => ({
        ...msg,
        timestamp: msg.timestamp.toISOString(),
      })),
    }));

    localStorage.setItem("chatSessions", JSON.stringify(sessionsToStore));

    if (currentSessionId) {
      localStorage.setItem("currentSessionId", currentSessionId);
    }
  } catch (error) {
    console.error("Error saving to localStorage:", error);
  }
};

// Load sessions from localStorage
export const loadSessions = (): {
  sessions: ChatSession[];
  currentSessionId: string | null;
  selectedModelId: string | null;
  selectedRepositoryId: string | null;
} => {
  try {
    const savedSessions = localStorage.getItem("chatSessions");
    const savedCurrentSessionId = localStorage.getItem("currentSessionId");
    const savedModelId = localStorage.getItem("selectedModelId");
    const savedRepositoryId = localStorage.getItem("selectedRepositoryId");

    let sessions: ChatSession[] = [];

    if (savedSessions) {
      const parsedSessions = JSON.parse(savedSessions).map((session: SavedSession) => ({
        ...session,
        createdAt: new Date(session.createdAt),
        updatedAt: new Date(session.updatedAt),
        messages: session.messages.map((msg) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        })),
      }));

      sessions = parsedSessions;
    }

    return {
      sessions,
      currentSessionId: savedCurrentSessionId,
      selectedModelId: savedModelId,
      selectedRepositoryId: savedRepositoryId,
    };
  } catch (error) {
    console.error("Error loading from localStorage:", error);
    return {
      sessions: [],
      currentSessionId: null,
      selectedModelId: null,
      selectedRepositoryId: null,
    };
  }
};

// Save selected model ID
export const saveSelectedModelId = (modelId: string | null): void => {
  try {
    if (modelId !== null) {
      localStorage.setItem("selectedModelId", modelId);
    } else {
      localStorage.removeItem("selectedModelId");
    }
  } catch (error) {
    console.error("Error saving model ID to localStorage:", error);
  }
};

// Save selected repository ID
export const saveSelectedRepositoryId = (repositoryId: string | null): void => {
  try {
    if (repositoryId !== null) {
      localStorage.setItem("selectedRepositoryId", repositoryId);
    } else {
      localStorage.removeItem("selectedRepositoryId");
    }
  } catch (error) {
    console.error("Error saving repository ID to localStorage:", error);
  }
};
