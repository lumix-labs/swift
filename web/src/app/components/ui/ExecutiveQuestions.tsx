import React from 'react';

interface ExecutiveQuestionsProps {
  onQuestionSelect: (question: string) => void;
}

export function ExecutiveQuestions({ onQuestionSelect }: ExecutiveQuestionsProps) {
  const executiveQuestions = {
    "CEO": "How does our codebase architecture support our scaling plans for next quarter?",
    "CPO": "Which features have the most technical debt and how would refactoring impact our roadmap?",
    "CMO": "How do our API endpoints support our current marketing automation integrations?",
    "CSO": "What security vulnerabilities exist in our authentication system and how can we address them?",
    "CIO": "What's the database performance impact of our new analytics implementation?",
    "COO": "How would implementing microservices affect our deployment pipeline efficiency?"
  };

  return (
    <div className="w-full max-w-4xl mx-auto mb-4">
      <div className="flex flex-wrap gap-2 justify-center">
        {Object.entries(executiveQuestions).map(([role, question]) => (
          <button
            key={role}
            onClick={() => onQuestionSelect(question)}
            className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            {role}
          </button>
        ))}
      </div>
    </div>
  );
}
