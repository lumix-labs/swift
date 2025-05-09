"use client";

import { createContext, useContext, useReducer, useEffect, useMemo, ReactNode } from "react";
import { chatReducer, initialState, ChatAction } from "./chat/chatReducer";
import { ChatState } from "./chat/types";
import { loadSessions, saveSessions, saveSelectedAIAdvisorId, saveSelectedRepositoryId } from "./chat/storage-service";
import { determineSender } from "./chat/messages/messageFormatters";
import { MessageRole } from "../lib/types/message";

// Create contexts for state and dispatch
const ChatStateContext = createContext<ChatState | undefined>(undefined);
const ChatDispatchContext = createContext<React.Dispatch<ChatAction> | undefined>(undefined);

// Singleton for global access to chat context
let globalDispatch: React.Dispatch<ChatAction> | null = null;

// Function to get chat context from outside the React component tree
export const getChatContext = () => {
  if (!globalDispatch) {
    console.warn("Chat context accessed before initialization");
    return { addMessage: null };
  }

  return {
    addMessage: (message: Omit<any, "id" | "timestamp">) =>
      globalDispatch && globalDispatch({ type: "ADD_MESSAGE", payload: { message } }),
  };
};

export function ChatProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(chatReducer, initialState);

  // Set global dispatch reference for external access
  useEffect(() => {
    globalDispatch = dispatch;
    return () => {
      globalDispatch = null;
    };
  }, [dispatch]);

  // Load sessions from localStorage on mount
  useEffect(() => {
    const { sessions, currentSessionId, selectedAIAdvisorId, selectedRepositoryId } = loadSessions();

    if (sessions.length > 0) {
      // Sort sessions by updatedAt date in descending order (newest first)
      const sortedSessions = [...sessions].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

      // Initialize state with loaded sessions
      if (currentSessionId && sortedSessions.some((session) => session.id === currentSessionId)) {
        const currentSession = sortedSessions.find((session) => session.id === currentSessionId);

        dispatch({
          type: "SWITCH_SESSION",
          payload: { sessionId: currentSessionId },
        });
      } else {
        // Otherwise, use the most recent session
        dispatch({
          type: "SWITCH_SESSION",
          payload: { sessionId: sortedSessions[0].id },
        });
      }
    } else {
      // If no sessions exist, create a new default session
      dispatch({ type: "CREATE_SESSION" });
    }

    // Set selected AI advisor and repository
    if (selectedAIAdvisorId) {
      dispatch({
        type: "SELECT_AI_ADVISOR",
        payload: { aiAdvisorId: selectedAIAdvisorId },
      });
    }

    if (selectedRepositoryId) {
      dispatch({
        type: "SELECT_REPOSITORY",
        payload: { repositoryId: selectedRepositoryId },
      });
    }
  }, []);

  // Save sessions to localStorage when they change
  useEffect(() => {
    if (state.sessions.length > 0) {
      saveSessions(state.sessions, state.currentSessionId);
    }
  }, [state.sessions, state.currentSessionId]);

  // Save selected AI advisor ID when it changes
  useEffect(() => {
    saveSelectedAIAdvisorId(state.selectedAIAdvisorId);
  }, [state.selectedAIAdvisorId]);

  // Save selected repository ID when it changes
  useEffect(() => {
    saveSelectedRepositoryId(state.selectedRepositoryId);
  }, [state.selectedRepositoryId]);

  // Listen for repository ready messages
  useEffect(() => {
    const handleRepositoryReadyMessage = (event: CustomEvent) => {
      console.log("[CHAT-PROVIDER] Received repository-ready-message event:", {
        eventType: event.type,
        detail: event.detail,
        message: event.detail?.message
          ? {
              content: event.detail.message.content,
              sender: event.detail.message.sender ? event.detail.message.sender.name : undefined,
              role: event.detail.message.role,
            }
          : undefined,
      });

      const message = event.detail?.message;
      if (message) {
        console.log("[CHAT-PROVIDER] Adding repository ready message to chat");
        dispatch({
          type: "ADD_MESSAGE",
          payload: { message },
        });
        console.log("[CHAT-PROVIDER] Repository ready message added to chat");
      } else {
        console.warn("[CHAT-PROVIDER] Repository ready message event had no message data");
      }
    };

    // Add event listener for repository ready messages
    window.addEventListener("repository-ready-message", handleRepositoryReadyMessage as EventListener);
    console.log("[CHAT-PROVIDER] Added repository-ready-message event listener");

    // Clean up event listener on unmount
    return () => {
      window.removeEventListener("repository-ready-message", handleRepositoryReadyMessage as EventListener);
      console.log("[CHAT-PROVIDER] Removed repository-ready-message event listener");
    };
  }, []);

  return (
    <ChatStateContext.Provider value={state}>
      <ChatDispatchContext.Provider value={dispatch}>{children}</ChatDispatchContext.Provider>
    </ChatStateContext.Provider>
  );
}

// Custom hooks for consuming the context
export function useChatState() {
  const context = useContext(ChatStateContext);
  if (context === undefined) {
    throw new Error("useChatState must be used within a ChatProvider");
  }
  return context;
}

export function useChatDispatch() {
  const context = useContext(ChatDispatchContext);
  if (context === undefined) {
    throw new Error("useChatDispatch must be used within a ChatProvider");
  }
  return context;
}

// Convenience hook that provides both state and dispatch with action creators
export function useChat() {
  const state = useChatState();
  const dispatch = useChatDispatch();

  // Create memoized action creators
  const actions = useMemo(
    () => ({
      createNewSession: () => dispatch({ type: "CREATE_SESSION" }),

      switchSession: (sessionId: string) => dispatch({ type: "SWITCH_SESSION", payload: { sessionId } }),

      deleteSession: (sessionId: string) => dispatch({ type: "DELETE_SESSION", payload: { sessionId } }),

      addMessage: (message: Omit<any, "id" | "timestamp">) => dispatch({ type: "ADD_MESSAGE", payload: { message } }),

      // For backward compatibility
      addMessageLegacy: (message: { role: string; content: string; sender?: any }) => {
        const sender = message.sender || determineSender(message.role, state.selectedAIAdvisorId);

        dispatch({
          type: "ADD_MESSAGE",
          payload: {
            message: {
              sender,
              content: message.content,
              isMarkdown: sender.type === "ai-advisor",
              role: message.role as MessageRole,
            },
          },
        });
      },

      clearMessages: () => dispatch({ type: "CLEAR_MESSAGES" }),

      setIsLoading: (isLoading: boolean) => dispatch({ type: "SET_LOADING", payload: { isLoading } }),

      setSelectedAIAdvisorId: (aiAdvisorId: string | null) =>
        dispatch({ type: "SELECT_AI_ADVISOR", payload: { aiAdvisorId } }),

      setSelectedRepositoryId: (repositoryId: string | null) =>
        dispatch({ type: "SELECT_REPOSITORY", payload: { repositoryId } }),
    }),
    [dispatch, state.selectedAIAdvisorId],
  );

  return { ...state, ...actions };
}
