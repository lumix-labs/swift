"use client";

import React, { useState, useCallback, useMemo } from "react";
import { useChat } from "../../../context/ChatContext";

export interface SuggestedPromptsProps {
  onSelectPrompt: (prompt: string) => void;
}

export function SuggestedPrompts({ onSelectPrompt }: SuggestedPromptsProps) {
  const [expanded, setExpanded] = useState(false);
  const { selectedModelId, selectedRepositoryId } = useChat();
  
  // Check if chat input is ready to receive text
  const isChatInputReady = !!selectedModelId && !!selectedRepositoryId;

  // Memoize the prompt lists to prevent unnecessary re-renders
  const initialPrompts = useMemo(
    () => [
      "Analyze our market position",
      "Optimize business processes",
      "Strategic planning",
      "Competitive analysis",
      "Improve operational efficiency",
    ],
    [],
  );

  const expandedPrompts = useMemo(
    () => [
      ...initialPrompts,
      "Technology investment guidance",
      "Digital transformation strategy",
      "Customer experience insights",
      "Talent development strategy",
      "Cross-departmental collaboration",
    ],
    [initialPrompts],
  );

  const visiblePrompts = expanded ? expandedPrompts : initialPrompts;

  // Memoize handler functions to prevent unnecessary re-renders
  const toggleExpanded = useCallback(() => {
    setExpanded((prevExpanded) => !prevExpanded);
  }, []);

  const handleSelectPrompt = useCallback(
    (prompt: string) => {
      if (isChatInputReady) {
        onSelectPrompt(prompt);
      } else {
        // If not ready, show feedback to user
        const event = new CustomEvent('suggestedPromptError', {
          detail: { message: 'Please select a model and repository first' }
        });
        window.dispatchEvent(event);
      }
    },
    [onSelectPrompt, isChatInputReady],
  );

  return (
    <div className="w-full max-w-4xl mx-auto mb-4 will-change-contents">
      <div className="flex flex-wrap gap-2 justify-center mb-2">
        {visiblePrompts.map((prompt) => (
          <button
            key={prompt}
            onClick={() => handleSelectPrompt(prompt)}
            className={`px-3 py-1.5 text-sm rounded-full transition-all duration-200 
              ${isChatInputReady 
                ? "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
                : "bg-gray-100/70 dark:bg-gray-800/50 cursor-not-allowed opacity-70"
              }`}
            title={isChatInputReady ? prompt : "Select model and repository first"}
          >
            {prompt}
          </button>
        ))}

        <button
          onClick={toggleExpanded}
          className="px-3 py-1.5 text-sm bg-transparent border border-gray-300 dark:border-gray-700 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          {expanded ? "Show less" : "More options"}
        </button>
      </div>
    </div>
  );
}
