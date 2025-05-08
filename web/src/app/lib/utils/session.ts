"use client";

import { ChatSession } from "../../context/chat/types";
import { saveToStorage, loadFromStorage, removeFromStorage, clearStorageAndRefreshState } from "./storage";

/**
 * Save sessions to localStorage
 * @param sessions Array of chat sessions
 * @param currentSessionId Current active session ID
 * @returns True if successful, false if error occurred
 */
export function saveSessions(sessions: ChatSession[], currentSessionId: string | null): boolean {
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

    const sessionsStored = saveToStorage("chatSessions", sessionsToStore);
    let currentSessionStored = true;

    if (currentSessionId) {
      currentSessionStored = saveToStorage("currentSessionId", currentSessionId);
    }

    // If either storage operation failed, consider it a failure
    return sessionsStored && currentSessionStored;
  } catch (error) {
    console.error("Error saving to localStorage:", error);
    // Handle corruption by clearing storage and refreshing
    clearStorageAndRefreshState();
    return false;
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
      try {
        sessions = savedSessions.map((session: any) => {
          // If the session has modelId but not aiAdvisorId, use the modelId value for aiAdvisorId
          if (session.modelId && !session.aiAdvisorId) {
            session.aiAdvisorId = session.modelId;
          }

          // Validate date fields to catch corrupted data
          const createdAt = new Date(session.createdAt);
          const updatedAt = new Date(session.updatedAt);

          // Check for invalid dates
          if (isNaN(createdAt.getTime()) || isNaN(updatedAt.getTime())) {
            throw new Error("Invalid date format in session data");
          }

          // Validate message timestamp fields
          const messages = session.messages.map((msg: any) => {
            const timestamp = new Date(msg.timestamp);
            if (isNaN(timestamp.getTime())) {
              throw new Error("Invalid timestamp format in message");
            }
            return {
              ...msg,
              timestamp,
            };
          });

          return {
            ...session,
            createdAt,
            updatedAt,
            messages,
          };
        });
      } catch (parseError) {
        console.error("Error parsing session data:", parseError);
        // Handle data corruption by clearing storage and refreshing
        clearStorageAndRefreshState();
        return {
          sessions: [],
          currentSessionId: null,
          selectedAIAdvisorId: null,
          selectedRepositoryId: null,
        };
      }
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
    // Handle corruption by clearing storage and refreshing
    clearStorageAndRefreshState();
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
 * @returns True if successful, false if error occurred
 */
export function saveSelectedAIAdvisorId(aiAdvisorId: string | null): boolean {
  try {
    if (aiAdvisorId !== null) {
      return saveToStorage("selectedAIAdvisorId", aiAdvisorId);
    } else {
      return removeFromStorage("selectedAIAdvisorId");
    }
  } catch (error) {
    console.error("Error saving AI advisor ID to localStorage:", error);
    // Handle corruption by clearing storage and refreshing
    clearStorageAndRefreshState();
    return false;
  }
}

/**
 * Save selected repository ID
 * @param repositoryId Repository ID to save
 * @returns True if successful, false if error occurred
 */
export function saveSelectedRepositoryId(repositoryId: string | null): boolean {
  try {
    if (repositoryId !== null) {
      return saveToStorage("selectedRepositoryId", repositoryId);
    } else {
      return removeFromStorage("selectedRepositoryId");
    }
  } catch (error) {
    console.error("Error saving repository ID to localStorage:", error);
    // Handle corruption by clearing storage and refreshing
    clearStorageAndRefreshState();
    return false;
  }
}
