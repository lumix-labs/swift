"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { LLMModel } from "../lib/types/entities";
import { getModels } from "../lib/services/entity-service";
import { useDebounce } from "./useDebounce";

// Create a custom event for AI advisor changes
export const AI_ADVISOR_CHANGE_EVENT = "aiAdvisorChangeEvent";

// Store AI advisors state globally to persist between component unmounts
const aiAdvisorsCache = {
  data: [] as LLMModel[],
  lastUpdated: 0,
};

/**
 * Custom hook to manage AI advisors with debouncing to prevent UI flickering
 */
export function useAIAdvisors() {
  // Initialize with an empty array to avoid undefined issues
  const [aiAdvisors, setAIAdvisors] = useState<LLMModel[]>([]);
  const updateTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef<boolean>(true);

  // Use a longer debounce time to prevent flickering
  const debouncedAIAdvisors = useDebounce(aiAdvisors, 1000); // Increased debounce time

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
  const updateAIAdvisors = useCallback(() => {
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

      // Only fetch AI advisors if it's been at least 800ms since the last update
      if (now - aiAdvisorsCache.lastUpdated > 800) {
        try {
          const updatedAIAdvisors = getModels();
          console.log("Updating AI advisors with throttle:", updatedAIAdvisors.length);

          // Update both local state and cache
          if (isMountedRef.current) {
            setAIAdvisors(updatedAIAdvisors || []);
            aiAdvisorsCache.data = updatedAIAdvisors || [];
            aiAdvisorsCache.lastUpdated = now;
          }
        } catch (error) {
          console.error("Error fetching AI advisors:", error);
          // Initialize with empty array to prevent errors
          setAIAdvisors([]);
        }
      }

      // Clear the reference after execution
      updateTimerRef.current = null;
    }, 800); // Increased from 500ms for better stability
  }, []);

  // Load AI advisors initially
  useEffect(() => {
    try {
      // Always initialize with empty array first to avoid mapping over undefined
      setAIAdvisors([]);

      const initialAIAdvisors = getModels() || [];
      console.log("Initial AI advisors loaded:", initialAIAdvisors.length);

      if (isMountedRef.current) {
        setAIAdvisors(initialAIAdvisors);
        aiAdvisorsCache.data = initialAIAdvisors;
        aiAdvisorsCache.lastUpdated = Date.now();
      }
    } catch (error) {
      console.error("Error loading initial AI advisors:", error);
      // Initialize with empty array to prevent errors
      setAIAdvisors([]);
    }

    // Clear any lingering update timers when component unmounts
    return () => {
      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current);
        updateTimerRef.current = null;
      }
    };
  }, []);

  // Event handler for AI advisor changes
  const handleAIAdvisorChange = useCallback(() => {
    console.log("AI advisor change event received");
    // Update AI advisors with throttling
    updateAIAdvisors();
  }, [updateAIAdvisors]);

  // Set up and tear down event listener
  useEffect(() => {
    console.log("Setting up AI advisor change event listener");

    // Add event listener for AI advisor changes
    window.addEventListener(AI_ADVISOR_CHANGE_EVENT, handleAIAdvisorChange);

    // Clean up event listener on unmount
    return () => {
      console.log("Removing AI advisor change event listener");
      window.removeEventListener(AI_ADVISOR_CHANGE_EVENT, handleAIAdvisorChange);
    };
  }, [handleAIAdvisorChange]);

  // Function to trigger an AI advisor change event
  const triggerAIAdvisorChange = useCallback(() => {
    console.log("Triggering AI advisor change event");

    // Use debouncing to prevent multiple rapid events
    if (updateTimerRef.current) {
      clearTimeout(updateTimerRef.current);
      updateTimerRef.current = null;
    }

    updateTimerRef.current = setTimeout(() => {
      const event = new CustomEvent(AI_ADVISOR_CHANGE_EVENT);
      window.dispatchEvent(event);
      updateTimerRef.current = null;
    }, 200);
  }, []);

  return {
    aiAdvisors: debouncedAIAdvisors || [], // Return debounced AI advisors, ensure it's never undefined
    updateAIAdvisors,
    triggerAIAdvisorChange,
  };
}
