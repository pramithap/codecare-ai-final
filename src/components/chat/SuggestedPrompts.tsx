import React from 'react';

interface SuggestedPromptsProps {
  onPromptSelect: (prompt: string) => void;
  disabled?: boolean;
}

const SUGGESTED_PROMPTS = [
  "Explain breaking changes from Axis2 1.7 → 1.8",
  "Order these upgrades to minimize risk",
  "Why can't Chemaxon 22.x run on Java 8?",
  "Generate a shell script for the plan",
  "What are the security implications of these outdated dependencies?",
  "How should I handle EOL packages in my project?",
];

export function SuggestedPrompts({ onPromptSelect, disabled = false }: SuggestedPromptsProps) {
  return (
    <div className="space-y-3">
      <div className="text-center">
        <div className="text-4xl mb-2">🤖</div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
          CodeCare AI Assistant
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Ask about upgrades, breaking changes, CVEs, or EOL.
        </p>
      </div>
      
      <div className="space-y-2">
        <p className="text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">
          Suggested Questions
        </p>
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_PROMPTS.map((prompt, index) => (
            <button
              key={index}
              onClick={() => onPromptSelect(prompt)}
              disabled={disabled}
              className="inline-flex items-center px-3 py-2 text-xs font-medium rounded-full border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-700 hover:border-gray-300 dark:hover:border-zinc-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>
      
      <div className="text-center pt-2">
        <p className="text-xs text-gray-500 dark:text-gray-500">
          💡 For best results, run a scan first to get contextual recommendations
        </p>
      </div>
    </div>
  );
}
