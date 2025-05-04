"use client";

import React, { useState, useCallback, useMemo } from "react";
import { useChat } from "../../../context/ChatContext";

export interface SuggestedPromptsProps {
  onSelectPrompt: (prompt: string) => void;
}

// Define a type for prompt mapping
interface PromptMap {
  [displayText: string]: string;
}

export function SuggestedPrompts({ onSelectPrompt }: SuggestedPromptsProps) {
  const [expanded, setExpanded] = useState(false);
  const { selectedModelId, selectedRepositoryId } = useChat();

  // Check if chat input is ready to receive text
  const isChatInputReady = !!selectedModelId && !!selectedRepositoryId;

  // Memoize the prompt maps to prevent unnecessary re-renders
  const initialPromptMap = useMemo(
    (): PromptMap => ({
      "Analyze our market position": "Conduct a detailed analysis of our market position compared to major competitors. What are our strengths, weaknesses, and opportunities?",
      "Optimize business processes": "Review our current business processes and identify opportunities for optimization. Which processes should be prioritized?",
      "Strategic planning": "Help create a strategic plan for the next 2 years, taking into account industry trends and our current capabilities.",
      "Competitive analysis": "Analyze our top 3 competitors and highlight key differentiating factors between us and them. What can we learn from them?",
      "Improve operational efficiency": "Identify ways to improve our operational efficiency and reduce costs without sacrificing quality.",
    }),
    [],
  );

  const expandedPromptMap = useMemo(
    (): PromptMap => ({
      ...initialPromptMap,
      "Technology investment guidance": "What technology investments should we prioritize in the next 12-18 months to maintain competitive advantage?",
      "Digital transformation strategy": "Help develop a comprehensive digital transformation strategy that aligns with our business goals and customer needs.",
      "Customer experience insights": "Analyze our customer journey and suggest improvements to enhance customer experience and increase retention.",
      "Talent development strategy": "Create a talent development strategy to ensure we have the skills needed for future growth and innovation.",
      "Cross-departmental collaboration": "Recommend effective approaches to improve collaboration between different departments and break down organizational silos.",
    }),
    [initialPromptMap],
  );

  const visiblePromptMap = expanded ? expandedPromptMap : initialPromptMap;

  // Memoize handler functions to prevent unnecessary re-renders
  const toggleExpanded = useCallback(() => {
    setExpanded((prevExpanded) => !prevExpanded);
  }, []);

  const handleSelectPrompt = useCallback(
    (displayText: string) => {
      if (isChatInputReady) {
        // Pass the detailed query (value) to the callback function
        onSelectPrompt(visiblePromptMap[displayText]);
      } else {
        // If not ready, show feedback to user
        const event = new CustomEvent("suggestedPromptError", {
          detail: { message: "Please select a model and repository first" },
        });
        window.dispatchEvent(event);
      }
    },
    [onSelectPrompt, visiblePromptMap, isChatInputReady],
  );

  return (
    <div className="w-full max-w-4xl mx-auto mb-4 will-change-contents">
      <div className="flex flex-wrap gap-2 justify-center mb-2">
        {Object.keys(visiblePromptMap).map((displayText) => (
          <button
            key={displayText}
            onClick={() => handleSelectPrompt(displayText)}
            className={`px-3 py-1.5 text-sm rounded-full transition-all duration-200 
              ${
                isChatInputReady
                  ? "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
                  : "bg-gray-100/70 dark:bg-gray-800/50 cursor-not-allowed opacity-70"
              }`}
            title={isChatInputReady ? displayText : "Select model and repository first"}
          >
            {displayText}
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
