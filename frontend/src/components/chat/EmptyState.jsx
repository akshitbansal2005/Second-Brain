/**
 * components/chat/EmptyState.jsx
 * Shown when there are no messages. Suggests starter prompts.
 */

import React from 'react';
import { Search, BookOpen, Lightbulb, Sparkles } from 'lucide-react';

const SUGGESTED_PROMPTS = [
  { icon: Search,    text: 'Summarise all my uploaded documents' },
  { icon: BookOpen,  text: 'What are the key topics covered?' },
  { icon: Lightbulb, text: 'What insights can you draw from my notes?' },
  { icon: Sparkles,  text: 'Find connections between my documents' },
];

export default function EmptyState({ onPromptClick }) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-4 animate-fade-in">
      {/* Icon */}
      <div className="w-12 h-12 rounded-2xl bg-accent-600/10 flex items-center justify-center mb-5">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-accent-400">
          <path d="M12 2a8 8 0 0 0-8 8c0 3.4 2.1 6.3 5 7.5V20a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-2.5c2.9-1.2 5-4.1 5-7.5a8 8 0 0 0-8-8z"/>
          <path d="M10 22h4"/>
          <path d="M9 10h6"/>
          <path d="M12 10v4"/>
        </svg>
      </div>

      <h2 className="text-lg font-semibold text-surface-200 mb-1 tracking-tight">What can I help you with?</h2>
      <p className="text-sm text-surface-500 mb-8 text-center max-w-sm leading-relaxed">
        Upload documents and ask questions. I'll find the most relevant information and synthesise an answer.
      </p>

      {/* Prompt suggestions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
        {SUGGESTED_PROMPTS.map(({ icon: Icon, text }) => (
          <button
            key={text}
            onClick={() => onPromptClick(text)}
            className="flex items-start gap-2.5 p-3 rounded-lg bg-surface-900 border border-surface-800
                       hover:border-surface-700 hover:bg-surface-850 text-left transition-colors duration-150
                       text-sm text-surface-400 hover:text-surface-300 group"
          >
            <Icon className="w-4 h-4 text-surface-600 flex-shrink-0 mt-0.5 group-hover:text-accent-400 transition-colors" />
            <span className="text-xs leading-relaxed">{text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
