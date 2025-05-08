"use client";

import { ChatSession } from "../../context/chat/types";
import { saveToStorage, loadFromStorage, removeFromStorage } from "./storage";

/**
 * Save sessions to localStorage
 * @param sessions Array of chat sessions
 * @param currentSessionId Current active session ID
 */
export function saveSessions(sessions: ChatSession[], currentSessionId: string | null): void {
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

    saveToStorage("chatSessions", sessionsToStore);

    if (currentSessionId) {
      saveToStorage("currentSessionId", currentSessionId);
    }
  } catch (error) {
    console.error("Error saving to localStorage:", error);
  }
}

/**
 * Load sessions from localStorage
 * @returns Object containing sessions and related state
 */
export function loadSessions(): {
  sessions: ChatSession[];
  currentSessionId: string | null;
  selectedAIAdvisorId: string | null;
  selectedRepositoryId: string | null;
} {
  try {
    // Try to load from both new and old storage keys for backward compatibility
    const savedSessions = loadFromStorage("chatSessions", []);
    const savedCurrentSessionId = loadFromStorage("currentSessionId", null);
    const savedAIAdvisorId = loadFromStorage("selectedAIAdvisorId", null);
    const savedModelId = loadFromStorage("selectedModelId", null); // Legacy key
    const savedRepositoryId = loadFromStorage("selectedRepositoryId", null);

    let sessions: ChatSession[] = [];

    if (savedSessions.length > 0) {
      sessions = savedSessions.map((session: any) => {
        // If the session has modelId but not aiAdvisorId, use the modelId value for aiAdvisorId
        if (session.modelId && !session.aiAdvisorId) {
          session.aiAdvisorId = session.modelId;
        }

        return {
          ...session,
          createdAt: new Date(session.createdAt),
          updatedAt: new Date(session.updatedAt),
          messages: session.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          })),
        };
      });
    }

    // Prefer aiAdvisorId, fall back to modelId for backward compatibility
    const effectiveAIAdvisorId = savedAIAdvisorId || savedModelId;

    // Clear old storage key if we're migrating
    if (savedModelId && !savedAIAdvisorId) {
      saveToStorage("selectedAIAdvisorId", savedModelId);
      removeFromStorage("selectedModelId");
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
}

/**
 * Save selected AI advisor ID
 * @param aiAdvisorId AI advisor ID to save
 */
export function saveSelectedAIAdvisorId(aiAdvisorId: string | null): void {
  try {
    if (aiAdvisorId !== null) {
      saveToStorage("selectedAIAdvisorId", aiAdvisorId);
    } else {
      removeFromStorage("selectedAIAdvisorId");
    }
  } catch (error) {
    console.error("Error saving AI advisor ID to localStorage:", error);
  }
}

/**
 * Save selected repository ID
 * @param repositoryId Repository ID to save
 */
export function saveSelectedRepositoryId(repositoryId: string | null): void {
  try {
    if (repositoryId !== null) {
      saveToStorage("selectedRepositoryId", repositoryId);
    } else {
      removeFromStorage("selectedRepositoryId");
    }
  } catch (error) {
    console.error("Error saving repository ID to localStorage:", error);
  }
}
