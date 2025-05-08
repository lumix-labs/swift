"use client";

import { Message, SenderType } from "../../lib/types/message";
import { ChatSession, ChatState } from "./types";
import { generateId } from "../../lib/utils/id";
import { determineSender } from "./messages/messageFormatters";
import { createDefaultSession } from "./session-management/useSessionState";

// Define action types for the reducer
export type ChatAction =
  | { type: "CREATE_SESSION" }
  | { type: "SWITCH_SESSION"; payload: { sessionId: string } }
  | { type: "DELETE_SESSION"; payload: { sessionId: string } }
  | { type: "ADD_MESSAGE"; payload: { message: Omit<Message, "id" | "timestamp"> } }
  | { type: "SET_LOADING"; payload: { isLoading: boolean } }
  | { type: "CLEAR_MESSAGES" }
  | { type: "SELECT_AI_ADVISOR"; payload: { aiAdvisorId: string | null } }
  | { type: "SELECT_REPOSITORY"; payload: { repositoryId: string | null } };

// Initial state for the chat
export const initialState: ChatState = {
  messages: [],
  sessions: [],
  currentSessionId: null,
  selectedAIAdvisorId: null,
  selectedRepositoryId: null,
  isLoading: false,
};

// The reducer function that handles all chat-related state
export function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case "CREATE_SESSION": {
      const newSession = createDefaultSession();

      // If we already have MAX_SESSIONS, remove the oldest one
      let updatedSessions = [...state.sessions];
      if (updatedSessions.length >= 5) {
        // Using the MAX_SESSIONS constant value
        // Sort by updatedAt to find the oldest session
        updatedSessions.sort((a, b) => a.updatedAt.getTime() - b.updatedAt.getTime());
        // Remove the oldest session
        updatedSessions.shift();
      }

      // Add AI advisor and repository to the new session if selected
      if (state.selectedAIAdvisorId) {
        newSession.aiAdvisorId = state.selectedAIAdvisorId;
      }

      if (state.selectedRepositoryId) {
        newSession.repositoryId = state.selectedRepositoryId;
      }

      // Add the new session and sort
      updatedSessions = [...updatedSessions, newSession];
      updatedSessions.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

      return {
        ...state,
        sessions: updatedSessions,
        currentSessionId: newSession.id,
        messages: [],
      };
    }

    case "SWITCH_SESSION": {
      const { sessionId } = action.payload;
      const session = state.sessions.find((s: ChatSession) => s.id === sessionId);

      if (!session) {
        console.error(`Session with ID ${sessionId} not found`);
        return state;
      }

      return {
        ...state,
        currentSessionId: sessionId,
        messages: session.messages,
        selectedAIAdvisorId: session.aiAdvisorId || state.selectedAIAdvisorId,
        selectedRepositoryId: session.repositoryId || state.selectedRepositoryId,
      };
    }

    case "DELETE_SESSION": {
      const { sessionId } = action.payload;

      // Make sure we have more than one session
      if (state.sessions.length <= 1) {
        console.warn("Cannot delete the only session");
        return state;
      }

      // Remove the session
      const updatedSessions = state.sessions.filter((session: ChatSession) => session.id !== sessionId);

      // If the deleted session was the current session, switch to another one
      if (state.currentSessionId === sessionId) {
        const newCurrentSession = updatedSessions[0];
        return {
          ...state,
          sessions: updatedSessions,
          currentSessionId: newCurrentSession.id,
          messages: newCurrentSession.messages,
          selectedAIAdvisorId: newCurrentSession.aiAdvisorId || state.selectedAIAdvisorId,
          selectedRepositoryId: newCurrentSession.repositoryId || state.selectedRepositoryId,
        };
      }

      return {
        ...state,
        sessions: updatedSessions,
      };
    }

    case "ADD_MESSAGE": {
      const { message } = action.payload;
      const newMessage: Message = {
        ...message,
        id: generateId(),
        timestamp: new Date(),
        isMarkdown:
          message.isMarkdown !== undefined ? message.isMarkdown : message.sender.type === SenderType.AI_ADVISOR,
      };

      // Update the current session with the new message
      const updatedSessions = state.sessions.map((session: ChatSession) => {
        if (session.id === state.currentSessionId) {
          const updatedMessages = [...session.messages, newMessage];
          return {
            ...session,
            messages: updatedMessages,
            updatedAt: new Date(),
            // Update title based on first user message if this is the first message
            title:
              session.messages.length === 0 && message.sender.type === SenderType.USER
                ? message.content.substring(0, 30) + (message.content.length > 30 ? "..." : "")
                : session.title,
          };
        }
        return session;
      });

      return {
        ...state,
        messages: [...state.messages, newMessage],
        sessions: updatedSessions,
      };
    }

    case "SET_LOADING":
      return {
        ...state,
        isLoading: action.payload.isLoading,
      };

    case "CLEAR_MESSAGES": {
      // Update the current session to have no messages
      const updatedSessions = state.sessions.map((session: ChatSession) => {
        if (session.id === state.currentSessionId) {
          return {
            ...session,
            messages: [],
            updatedAt: new Date(),
          };
        }
        return session;
      });

      return {
        ...state,
        messages: [],
        sessions: updatedSessions,
      };
    }

    case "SELECT_AI_ADVISOR": {
      const { aiAdvisorId } = action.payload;

      // Update the current session with the selected AI advisor
      const updatedSessions = state.sessions.map((session: ChatSession) => {
        if (session.id === state.currentSessionId) {
          return {
            ...session,
            aiAdvisorId: aiAdvisorId || undefined,
            updatedAt: new Date(),
          };
        }
        return session;
      });

      return {
        ...state,
        selectedAIAdvisorId: aiAdvisorId,
        sessions: updatedSessions,
      };
    }

    case "SELECT_REPOSITORY": {
      const { repositoryId } = action.payload;

      // Update the current session with the selected repository
      const updatedSessions = state.sessions.map((session: ChatSession) => {
        if (session.id === state.currentSessionId) {
          return {
            ...session,
            repositoryId: repositoryId || undefined,
            updatedAt: new Date(),
          };
        }
        return session;
      });

      return {
        ...state,
        selectedRepositoryId: repositoryId,
        sessions: updatedSessions,
      };
    }

    default:
      return state;
  }
}
