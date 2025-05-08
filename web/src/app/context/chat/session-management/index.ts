"use client";

import { useSessionState } from "./useSessionState";
import { useSessionCreate } from "./useSessionCreate";
import { useSessionSwitch } from "./useSessionSwitch";
import { useSessionDelete } from "./useSessionDelete";
import { useEntitySelection } from "./useEntitySelection";
import { generateId } from "./utils";

/**
 * Main hook that combines all session management functionality
 * This acts as a replacement for the original useSessionManagement hook
 */
export function useSessionManagement() {
  const state = useSessionState();

  const { createNewSession } = useSessionCreate({
    sessions: state.sessions,
    setSessions: state.setSessions,
    setCurrentSessionId: state.setCurrentSessionId,
    setMessages: state.setMessages,
    selectedAIAdvisorId: state.selectedAIAdvisorId,
    selectedRepositoryId: state.selectedRepositoryId,
  });

  const { switchSession } = useSessionSwitch({
    sessions: state.sessions,
    setCurrentSessionId: state.setCurrentSessionId,
    setMessages: state.setMessages,
    setSelectedAIAdvisorId: state.setSelectedAIAdvisorId,
    setSelectedRepositoryId: state.setSelectedRepositoryId,
  });

  const { deleteSession } = useSessionDelete({
    sessions: state.sessions,
    setSessions: state.setSessions,
    currentSessionId: state.currentSessionId,
    setCurrentSessionId: state.setCurrentSessionId,
    setMessages: state.setMessages,
    setSelectedAIAdvisorId: state.setSelectedAIAdvisorId,
    setSelectedRepositoryId: state.setSelectedRepositoryId,
  });

  const { updateSessionAIAdvisor, updateSessionRepository } = useEntitySelection({
    sessions: state.sessions,
    setSessions: state.setSessions,
    currentSessionId: state.currentSessionId,
    selectedAIAdvisorId: state.selectedAIAdvisorId,
    setSelectedAIAdvisorId: state.setSelectedAIAdvisorId,
    selectedRepositoryId: state.selectedRepositoryId,
    setSelectedRepositoryId: state.setSelectedRepositoryId,
  });

  return {
    ...state,
    createNewSession,
    switchSession,
    deleteSession,
    updateSessionAIAdvisor,
    updateSessionRepository,
    generateId,
  };
}

export { generateId };
export { createDefaultSession } from "./useSessionState";
