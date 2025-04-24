"use client"

import { useState, useCallback, useMemo } from 'react';
import { ExecutiveQuestions } from '../ui/ExecutiveQuestions';

interface SuggestedPromptsProps {
  onSelectPrompt: (prompt: string) => void;
}

export function SuggestedPrompts({ onSelectPrompt }: SuggestedPromptsProps) {
  const [expanded, setExpanded] = useState(false);
  
  // Memoize the prompt lists to prevent unnecessary re-renders
  const initialPrompts = useMemo(() => [
    "Analyze our market position",
    "Optimize business processes",
    "Strategic planning",
    "Competitive analysis",
    "Improve operational efficiency",
  ], []);
  
  const expandedPrompts = useMemo(() => [
    ...initialPrompts,
    "Technology investment guidance",
    "Digital transformation strategy",
    "Customer experience insights",
    "Talent development strategy",
    "Cross-departmental collaboration",
  ], [initialPrompts]);

  const visiblePrompts = expanded ? expandedPrompts : initialPrompts;

  // Memoize handler functions to prevent unnecessary re-renders
  const toggleExpanded = useCallback(() => {
    setExpanded(prevExpanded => !prevExpanded);
  }, []);

  const handleSelectPrompt = useCallback((prompt: string) => {
    onSelectPrompt(prompt);
  }, [onSelectPrompt]);

  return (
    <div className="w-full max-w-4xl mx-auto mb-4 will-change-contents">
      <div className="flex flex-wrap gap-2 justify-center mb-2">
        {visiblePrompts.map((prompt) => (
          <button
            key={prompt}
            onClick={() => handleSelectPrompt(prompt)}
            className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
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
      
      {/* Only render ExecutiveQuestions when expanded */}
      {expanded && <ExecutiveQuestions onQuestionSelect={handleSelectPrompt} />}
    </div>
  );
}
