"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { LLMModel } from "../lib/types/entities";
import { getModels } from "../lib/services/entity-service";
import { useDebounce } from "./useDebounce";

// Create a custom event for model changes
export const MODEL_CHANGE_EVENT = "modelChangeEvent";

// Store models state globally to persist between component unmounts
const modelsCache = {
  data: [] as LLMModel[],
  lastUpdated: 0,
};

/**
 * Custom hook to manage models with debouncing to prevent UI flickering
 */
export function useModels() {
  const [models, setModels] = useState<LLMModel[]>(modelsCache.data);
  const updateTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef<boolean>(true);

  // Use a longer debounce time to prevent flickering
  const debouncedModels = useDebounce(models, 1000); // Increased debounce time

  // On component unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current);
        updateTimerRef.current = null;
      }
    };
  }, []);

  // Throttled update function to prevent multiple rapid updates
  const updateModels = useCallback(() => {
    // Clear any pending update timer
    if (updateTimerRef.current) {
      clearTimeout(updateTimerRef.current);
      updateTimerRef.current = null;
    }

    // Set a new timer for the update with increased delay
    updateTimerRef.current = setTimeout(() => {
      if (!isMountedRef.current) {
        return;
      }

      const now = Date.now();

      // Only fetch models if it's been at least 800ms since the last update
      if (now - modelsCache.lastUpdated > 800) {
        try {
          const updatedModels = getModels();
          console.warn("Updating models with throttle:", updatedModels.length);

          // Update both local state and cache
          if (isMountedRef.current) {
            setModels(updatedModels);
            modelsCache.data = updatedModels;
            modelsCache.lastUpdated = now;
          }
        } catch (error) {
          console.error("Error fetching models:", error);
        }
      }

      // Clear the reference after execution
      updateTimerRef.current = null;
    }, 800); // Increased from 500ms for better stability
  }, []);

  // Load models initially
  useEffect(() => {
    const now = Date.now();

    // Only fetch if cache is over 1 second old
    if (now - modelsCache.lastUpdated > 1000 || modelsCache.data.length === 0) {
      try {
        const initialModels = getModels();
        console.warn("Initial models loaded:", initialModels.length);

        if (isMountedRef.current) {
          setModels(initialModels);
          modelsCache.data = initialModels;
          modelsCache.lastUpdated = now;
        }
      } catch (error) {
        console.error("Error loading initial models:", error);
      }
    } else if (modelsCache.data.length > 0) {
      console.warn("Using cached models:", modelsCache.data.length);
    }

    // Clear any lingering update timers when component unmounts
    return () => {
      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current);
        updateTimerRef.current = null;
      }
    };
  }, []);

  // Event handler for model changes
  const handleModelChange = useCallback(() => {
    console.warn("Model change event received");
    // Update models with throttling
    updateModels();
  }, [updateModels]);

  // Set up and tear down event listener
  useEffect(() => {
    console.warn("Setting up model change event listener");

    // Add event listener for model changes
    window.addEventListener(MODEL_CHANGE_EVENT, handleModelChange);

    // Clean up event listener on unmount
    return () => {
      console.warn("Removing model change event listener");
      window.removeEventListener(MODEL_CHANGE_EVENT, handleModelChange);
    };
  }, [handleModelChange]);

  // Function to trigger a model change event
  const triggerModelChange = useCallback(() => {
    console.warn("Triggering model change event");

    // Use debouncing to prevent multiple rapid events
    if (updateTimerRef.current) {
      clearTimeout(updateTimerRef.current);
      updateTimerRef.current = null;
    }

    updateTimerRef.current = setTimeout(() => {
      const event = new CustomEvent(MODEL_CHANGE_EVENT);
      window.dispatchEvent(event);
      updateTimerRef.current = null;
    }, 200);
  }, []);

  return {
    models: debouncedModels, // Return debounced models to prevent UI flickering
    updateModels,
    triggerModelChange,
  };
}
