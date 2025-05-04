"use client";

import { useState, useCallback, useEffect } from "react";
import { LLMProvider } from "../../lib/types/entities";
import { addModel, removeModel } from "../../lib/services/entity-service";
import { useChat } from "../../context/ChatContext";
import { useModels } from "../useModels";

export function useModelsDropdown() {
  const { selectedModelId, setSelectedModelId, addMessage } = useChat();
  const { models, triggerModelChange } = useModels();
  const [showAddModal, setShowAddModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isActionInProgress, setIsActionInProgress] = useState(false);

  // Auto-select the first model when models are loaded and none is selected
  useEffect(() => {
    if (models.length > 0 && !selectedModelId) {
      setSelectedModelId(models[0].id);
    }
  }, [models, selectedModelId, setSelectedModelId]);

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

  const handleModelSave = useCallback(
    (provider: LLMProvider, apiKey: string) => {
      if (isActionInProgress) {
        return;
      }

      // Lock UI updates to prevent flickering
      lockUIUpdates();

      // Set updating flag to prevent UI flickering
      setIsUpdating(true);

      // Check if model with the same provider already exists
      const existingModel = models.find((model) => model.provider === provider);

      if (existingModel) {
        // Update the existing model instead of adding a new one
        const updatedModel = addModel(provider, apiKey);
        setSelectedModelId(updatedModel.id);
        
        // Add a notification message after a short delay to ensure proper sequencing
        setTimeout(() => {
          addMessage({
            role: "assistant",
            content: `${updatedModel.name} has been updated and selected as the active model.`,
          });

          // Trigger model change to refresh the list
          triggerModelChange();

          // Reset updating flag after state is updated
          setTimeout(() => {
            setIsUpdating(false);
          }, 500);
        }, 500);
        
        return;
      }

      try {
        // Add new model
        const newModel = addModel(provider, apiKey);

        // Automatically select the newly added model
        setSelectedModelId(newModel.id);

        // Add a notification message after a short delay to ensure proper sequencing
        setTimeout(() => {
          addMessage({
            role: "assistant",
            content: `${newModel.name} has been added and selected as the active model.`,
          });

          // Use a timer to delay the UI update to prevent flickering
          triggerModelChange();

          // Reset updating flag after state is updated
          setTimeout(() => {
            setIsUpdating(false);
          }, 500);
        }, 500);
      } catch (error) {
        console.error("Error adding model:", error);
        setIsUpdating(false);
      }
    },
    [models, setSelectedModelId, triggerModelChange, addMessage, isActionInProgress, lockUIUpdates],
  );

  const handleModelRemove = useCallback(
    (id: string) => {
      if (isActionInProgress) {
        return;
      }

      // Don't allow removing the last model
      if (models.length <= 1) {
        addMessage({
          role: "assistant",
          content: "At least one model must be available. You cannot remove the only model.",
        });
        return;
      }

      // Lock UI updates to prevent flickering
      lockUIUpdates();

      // Set updating flag to prevent UI flickering
      setIsUpdating(true);

      try {
        // Get model name before removal
        const model = models.find((m) => m.id === id);
        const modelName = model?.name || "Model";

        removeModel(id);

        // If the removed model was selected, select another model
        if (id === selectedModelId) {
          // Find another model to select
          const nextModel = models.find(m => m.id !== id);
          if (nextModel) {
            setSelectedModelId(nextModel.id);
          }

          // Add a notification message after a short delay to ensure proper sequencing
          setTimeout(() => {
            addMessage({
              role: "assistant",
              content: `${modelName} has been removed. ${nextModel ? `${nextModel.name} is now the active model.` : "Please select another model to continue chatting."}`,
            });
          }, 300);
        } else {
          // Add a notification message after a short delay to ensure proper sequencing
          setTimeout(() => {
            addMessage({
              role: "assistant",
              content: `${modelName} has been removed.`,
            });
          }, 300);
        }

        // Use a timer to delay the UI update to prevent flickering
        setTimeout(() => {
          // Trigger event to update models list with debouncing
          triggerModelChange();

          // Reset updating flag after state is updated
          setTimeout(() => {
            setIsUpdating(false);
          }, 500);
        }, 500);
      } catch (error) {
        console.error("Error removing model:", error);
        setIsUpdating(false);
      }
    },
    [selectedModelId, setSelectedModelId, triggerModelChange, models, addMessage, isActionInProgress, lockUIUpdates],
  );

  const handleModelSelect = useCallback(
    (id: string) => {
      if (isActionInProgress) {
        return;
      }

      // Lock UI updates to prevent flickering
      lockUIUpdates();

      // Get model name for notification
      const model = models.find((m) => m.id === id);
      const modelName = model?.name || "Model";

      setSelectedModelId(id);

      // Add a notification message after a short delay to ensure proper sequencing
      setTimeout(() => {
        addMessage({
          role: "assistant",
          content: `${modelName} has been selected as the active model.`,
        });
      }, 300);

      return true; // Return true to indicate dropdown should close
    },
    [setSelectedModelId, models, addMessage, isActionInProgress, lockUIUpdates],
  );

  return {
    selectedModelId,
    models,
    isUpdating,
    isActionInProgress,
    showAddModal,
    setShowAddModal,
    handleAddClick,
    handleModelSave,
    handleModelRemove,
    handleModelSelect,
  };
}
