import React, { useMemo, useCallback } from 'react';

interface ExecutiveQuestionsProps {
  onQuestionSelect: (question: string) => void;
}

export function ExecutiveQuestions({ onQuestionSelect }: ExecutiveQuestionsProps) {
  // Memoize the questions object to prevent recreating it on each render
  const executiveQuestions = useMemo(() => ({
    "CEO": "How can Swift help our company accelerate our strategic digital transformation initiatives?",
    "CFO": "What ROI metrics should we track to measure Swift's impact on our technology investments?",
    "CPO": "How can Swift help prioritize our product roadmap to maximize market impact?",
    "CMO": "How can we leverage Swift to gain deeper insights into customer behavior and preferences?",
    "CIO": "How would Swift integrate with our existing enterprise systems and data architecture?",
    "COO": "How can Swift streamline our operational processes and reduce technical bottlenecks?"
  }), []);

  // Memoize the handler to prevent recreating it on each render
  const handleQuestionSelect = useCallback((question: string) => {
    onQuestionSelect(question);
  }, [onQuestionSelect]);

  // Memoize the entries to prevent recreating them on each render
  const entries = useMemo(() => Object.entries(executiveQuestions), [executiveQuestions]);

  return (
    <div className="w-full max-w-4xl mx-auto mb-4">
      <div className="flex flex-wrap gap-2 justify-center">
        {entries.map(([role, question]) => (
          <button
            key={role}
            onClick={() => handleQuestionSelect(question)}
            className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors will-change-transform"
          >
            {role}
          </button>
        ))}
      </div>
    </div>
  );
}
