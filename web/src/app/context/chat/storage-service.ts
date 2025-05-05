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
  selectedAIAdvisorId: string | null;
  selectedRepositoryId: string | null;
} => {
  try {
    // Try to load from both new and old storage keys for backward compatibility
    const savedSessions = localStorage.getItem("chatSessions");
    const savedCurrentSessionId = localStorage.getItem("currentSessionId");
    const savedAIAdvisorId = localStorage.getItem("selectedAIAdvisorId");
    const savedModelId = localStorage.getItem("selectedModelId"); // Legacy key
    const savedRepositoryId = localStorage.getItem("selectedRepositoryId");

    let sessions: ChatSession[] = [];

    if (savedSessions) {
      const parsedSessions = JSON.parse(savedSessions).map((session: SavedSession) => {
        // If the session has modelId but not aiAdvisorId, use the modelId value for aiAdvisorId
        if (session.modelId && !session.aiAdvisorId) {
          session.aiAdvisorId = session.modelId;
        }

        return {
          ...session,
          createdAt: new Date(session.createdAt),
          updatedAt: new Date(session.updatedAt),
          messages: session.messages.map((msg) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          })),
        };
      });

      sessions = parsedSessions;
    }

    // Prefer aiAdvisorId, fall back to modelId for backward compatibility
    const effectiveAIAdvisorId = savedAIAdvisorId || savedModelId;

    // Clear old storage key if we're migrating
    if (savedModelId && !savedAIAdvisorId) {
      localStorage.setItem("selectedAIAdvisorId", savedModelId);
      localStorage.removeItem("selectedModelId");
    }

    return {
      sessions,
      currentSessionId: savedCurrentSessionId,
      selectedAIAdvisorId: effectiveAIAdvisorId,
      selectedRepositoryId: savedRepositoryId,
    };
  } catch (error) {
    console.error("Error loading from localStorage:", error);
    return {
      sessions: [],
      currentSessionId: null,
      selectedAIAdvisorId: null,
      selectedRepositoryId: null,
    };
  }
};

// Save selected AI advisor ID
export const saveSelectedAIAdvisorId = (aiAdvisorId: string | null): void => {
  try {
    if (aiAdvisorId !== null) {
      localStorage.setItem("selectedAIAdvisorId", aiAdvisorId);
    } else {
      localStorage.removeItem("selectedAIAdvisorId");
    }
  } catch (error) {
    console.error("Error saving AI advisor ID to localStorage:", error);
  }
};

// For backward compatibility, use the same function with the old name
export const saveSelectedModelId = saveSelectedAIAdvisorId;

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
