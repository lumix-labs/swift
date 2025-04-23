"use client"

import { useState } from 'react';

interface SuggestedPromptsProps {
  onSelectPrompt: (prompt: string) => void;
}

export function SuggestedPrompts({ onSelectPrompt }: SuggestedPromptsProps) {
  const [expanded, setExpanded] = useState(false);
  
  const initialPrompts = [
    "Summarize text",
    "Analyze data",
    "Make a plan",
    "Brainstorm",
    "Help me write",
  ];
  
  const expandedPrompts = [
    ...initialPrompts,
    "Explain this code",
    "Debug an issue",
    "Suggest improvements",
    "Generate unit tests",
    "Describe architecture",
  ];

  const executivePrompts = {
    "CEO": "How does our codebase architecture support our scaling plans for next quarter?",
    "CPO": "Which features have the most technical debt and how would refactoring impact our roadmap?",
    "CMO": "How do our API endpoints support our current marketing automation integrations?",
    "CSO": "What security vulnerabilities exist in our authentication system and how can we address them?",
    "CIO": "What's the database performance impact of our new analytics implementation?",
    "COO": "How would implementing microservices affect our deployment pipeline efficiency?"
  };

  const visiblePrompts = expanded ? expandedPrompts : initialPrompts;

  return (
    <div className="w-full max-w-4xl mx-auto mb-4">
      <div className="flex flex-wrap gap-2 justify-center">
        {visiblePrompts.map((prompt) => (
          <button
            key={prompt}
            onClick={() => onSelectPrompt(prompt)}
            className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            {prompt}
          </button>
        ))}
        
        {/* Executive prompts */}
        {expanded && Object.entries(executivePrompts).map(([role, prompt]) => (
          <button
            key={role}
            onClick={() => onSelectPrompt(prompt)}
            className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            {role}
          </button>
        ))}
        
        <button
          onClick={() => setExpanded(!expanded)}
          className="px-3 py-1.5 text-sm bg-transparent border border-gray-300 dark:border-gray-700 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          {expanded ? "Show less" : "More options"}
        </button>
      </div>
    </div>
  );
}
