"use client";

import { useState, useCallback, useEffect } from "react";
import { LLMProvider } from "../../lib/types/entities";
import { Personality } from "../../lib/types/personality";
import {
  addModel,
  removeModel,
  getDefaultModel,
  getSenderTypeForModel,
  getModelById,
  createAdvisorSender,
} from "../../lib/services/entity-service";
import { useChat } from "../../context/ChatContext";
import { useAIAdvisors } from "../useModels";
import { SenderType, SENDERS } from "../../lib/types/message";

export function useAIAdvisorsDropdown() {
  const { selectedAIAdvisorId, setSelectedAIAdvisorId, addMessage } = useChat();
  const { aiAdvisors, triggerAIAdvisorChange } = useAIAdvisors();
  const [showAddModal, setShowAddModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isActionInProgress, setIsActionInProgress] = useState(false);

  // Ensure aiAdvisors is always an array (defensive programming)
  const safeAIAdvisors = Array.isArray(aiAdvisors) ? aiAdvisors : [];

  // Filter only configured AI advisors (ones with API keys)
  const configuredAIAdvisors = safeAIAdvisors.filter((advisor) => advisor.apiKey && advisor.apiKey.length > 0);

  // Auto-select the first AI advisor when they are loaded and none is selected
  useEffect(() => {
    if (configuredAIAdvisors.length > 0 && !selectedAIAdvisorId) {
      // First try to select the default AI advisor or one with a valid API key
      const defaultAIAdvisor = getDefaultModel();
      const advisorWithApiKey = configuredAIAdvisors.find((advisor) => advisor.apiKey && advisor.apiKey.length > 0);

      if (defaultAIAdvisor && defaultAIAdvisor.apiKey && defaultAIAdvisor.apiKey.length > 0) {
        setSelectedAIAdvisorId(defaultAIAdvisor.id);
      } else if (advisorWithApiKey) {
        setSelectedAIAdvisorId(advisorWithApiKey.id);
      }
      // Don't auto-select if no advisor has a valid API key to prevent warning messages
    }
  }, [configuredAIAdvisors, selectedAIAdvisorId, setSelectedAIAdvisorId]);

  // Set UI update lock to prevent component re-rendering during actions
  const lockUIUpdates = useCallback(() => {
    setIsActionInProgress(true);
    // Release lock after a timeout to ensure UI stability
    setTimeout(() => {
      setIsActionInProgress(false);
    }, 1000); // 1 second lock
  }, []);

  const handleAddClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowAddModal(true);
    return true; // Return true to indicate dropdown should close
  }, []);

  const handleAIAdvisorSave = useCallback(
    (provider: LLMProvider, apiKey: string, modelId?: string, personality?: Personality) => {
      if (isActionInProgress) {
        return;
      }

      // Lock UI updates to prevent flickering
      lockUIUpdates();

      // Set updating flag to prevent UI flickering
      setIsUpdating(true);

      // Check if AI advisor with the same provider and personality already exists
      const existingAIAdvisor = safeAIAdvisors.find(
        (advisor) => advisor.provider === provider && (personality ? advisor.personality === personality : true),
      );

      if (existingAIAdvisor) {
        // Update the existing AI advisor instead of adding a new one
        const updatedAIAdvisor = addModel(provider, apiKey, modelId, personality);
        setSelectedAIAdvisorId(updatedAIAdvisor.id);

        // Add a notification message after a short delay to ensure proper sequencing
        setTimeout(() => {
          addMessage({
            content: `${updatedAIAdvisor.name} has been updated and selected as the active AI advisor.`,
            sender: SENDERS[SenderType.SWIFT_ASSISTANT],
            role: "assistant-informational",
          });

          // Trigger AI advisor change to refresh the list
          triggerAIAdvisorChange();

          // Reset updating flag after state is updated
          setTimeout(() => {
            setIsUpdating(false);
          }, 500);
        }, 500);

        return;
      }

      try {
        // Add new AI advisor
        const newAIAdvisor = addModel(provider, apiKey, modelId, personality);

        // Automatically select the newly added AI advisor
        setSelectedAIAdvisorId(newAIAdvisor.id);

        // Get sender for notification
        const sender = SENDERS[SenderType.SWIFT_ASSISTANT];

        // Add a notification message after a short delay to ensure proper sequencing
        setTimeout(() => {
          addMessage({
            content: `${newAIAdvisor.name} has been added and selected as the active AI advisor.`,
            sender: sender,
            role: "assistant-informational",
          });

          // Use a timer to delay the UI update to prevent flickering
          triggerAIAdvisorChange();

          // Reset updating flag after state is updated
          setTimeout(() => {
            setIsUpdating(false);
          }, 500);
        }, 500);
      } catch (error) {
        console.error("Error adding AI advisor:", error);
        setIsUpdating(false);
      }
    },
    [safeAIAdvisors, setSelectedAIAdvisorId, triggerAIAdvisorChange, addMessage, isActionInProgress, lockUIUpdates],
  );

  const handleAIAdvisorRemove = useCallback(
    (id: string) => {
      if (isActionInProgress) {
        return;
      }

      // Don't allow removing the last AI advisor
      if (configuredAIAdvisors.length <= 1) {
        addMessage({
          content: "At least one AI advisor must be available. You cannot remove the only AI advisor.",
          sender: SENDERS[SenderType.SWIFT_ASSISTANT],
          role: "assistant-informational",
        });
        return;
      }

      // Lock UI updates to prevent flickering
      lockUIUpdates();

      // Set updating flag to prevent UI flickering
      setIsUpdating(true);

      try {
        // Get AI advisor name before removal
        const aiAdvisor = safeAIAdvisors.find((m) => m.id === id);
        const aiAdvisorName = aiAdvisor?.name || "AI Advisor";

        removeModel(id);

        // If the removed AI advisor was selected, select another AI advisor
        if (id === selectedAIAdvisorId) {
          // Find another AI advisor to select preferring ones with valid API keys
          const nextAIAdvisor =
            configuredAIAdvisors.find((m) => m.id !== id && m.apiKey && m.apiKey.length > 0) ||
            configuredAIAdvisors.find((m) => m.id !== id);
          if (nextAIAdvisor) {
            setSelectedAIAdvisorId(nextAIAdvisor.id);
          }

          // Add a notification message after a short delay to ensure proper sequencing
          setTimeout(() => {
            addMessage({
              content: `${aiAdvisorName} has been removed. ${nextAIAdvisor ? `${nextAIAdvisor.name} is now the active AI advisor.` : "Please select another AI advisor to continue chatting."}`,
              sender: SENDERS[SenderType.SWIFT_ASSISTANT],
              role: "assistant-informational",
            });
          }, 300);
        } else {
          // Add a notification message after a short delay to ensure proper sequencing
          setTimeout(() => {
            addMessage({
              content: `${aiAdvisorName} has been removed.`,
              sender: SENDERS[SenderType.SWIFT_ASSISTANT],
              role: "assistant-informational",
            });
          }, 300);
        }

        // Use a timer to delay the UI update to prevent flickering
        setTimeout(() => {
          // Trigger event to update AI advisors list with debouncing
          triggerAIAdvisorChange();

          // Reset updating flag after state is updated
          setTimeout(() => {
            setIsUpdating(false);
          }, 500);
        }, 500);
      } catch (error) {
        console.error("Error removing AI advisor:", error);
        setIsUpdating(false);
      }
    },
    [
      selectedAIAdvisorId,
      setSelectedAIAdvisorId,
      triggerAIAdvisorChange,
      safeAIAdvisors,
      configuredAIAdvisors,
      addMessage,
      isActionInProgress,
      lockUIUpdates,
    ],
  );

  const handleAIAdvisorSelect = useCallback(
    (id: string) => {
      if (isActionInProgress) {
        return false;
      }

      // Lock UI updates to prevent flickering
      lockUIUpdates();

      // Get AI advisor name for notification
      const aiAdvisor = safeAIAdvisors.find((m) => m.id === id);

      // Skip if AI advisor not found or doesn't have API key
      if (!aiAdvisor || !aiAdvisor.apiKey) {
        setTimeout(() => {
          addMessage({
            content: `Please add an API key for this AI advisor before using it.`,
            sender: SENDERS[SenderType.SWIFT_ASSISTANT],
            role: "assistant-informational",
          });
        }, 300);
        return false;
      }

      const aiAdvisorName = aiAdvisor.name || "AI Advisor";

      setSelectedAIAdvisorId(id);

      // Add a notification message after a short delay to ensure proper sequencing
      setTimeout(() => {
        addMessage({
          content: `${aiAdvisorName} has been selected as the active AI advisor.`,
          sender: SENDERS[SenderType.SWIFT_ASSISTANT],
          role: "assistant-informational",
        });
      }, 300);

      return true; // Return true to indicate dropdown should close
    },
    [setSelectedAIAdvisorId, safeAIAdvisors, addMessage, isActionInProgress, lockUIUpdates],
  );

  return {
    selectedAIAdvisorId,
    aiAdvisors: configuredAIAdvisors, // Only return configured advisors
    isUpdating,
    isActionInProgress,
    showAddModal,
    setShowAddModal,
    handleAddClick,
    handleAIAdvisorSave,
    handleAIAdvisorRemove,
    handleAIAdvisorSelect,
  };
}
