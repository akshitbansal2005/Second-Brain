/**
 * components/chat/ChatMessage.jsx
 * Renders a single chat message (user or assistant).
 * Assistant messages support markdown, streaming cursor, and source references.
 */

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChevronDown, ChevronRight, FileText, User } from 'lucide-react';
import clsx from 'clsx';

const TypingIndicator = () => (
  <div className="flex items-center gap-1 px-0.5 py-1">
    <span className="typing-dot" />
    <span className="typing-dot" />
    <span className="typing-dot" />
  </div>
);

const SourceCard = ({ source }) => (
  <div className="flex items-start gap-2.5 py-2 px-3 rounded-lg bg-surface-900 border border-surface-800 hover:border-surface-700 transition-colors">
    <FileText className="w-3.5 h-3.5 text-accent-400 flex-shrink-0 mt-0.5" />
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-0.5">
        <span className="text-xs font-medium text-surface-300 truncate">{source.documentName}</span>
        <span className="text-2xs text-surface-600 flex-shrink-0 tabular-nums">
          {Math.round(source.score * 100)}%
        </span>
      </div>
      <p className="text-2xs text-surface-500 line-clamp-2 leading-relaxed">{source.chunkText}</p>
    </div>
  </div>
);

export default function ChatMessage({ message }) {
  const [showSources, setShowSources] = useState(false);
  const isUser = message.role === 'user';
  const hasSources = message.sources && message.sources.length > 0;

  return (
    <div className={clsx('py-4 animate-fade-in', !isUser && 'border-b border-surface-800/50')}>
      {/* Role label */}
      <div className="flex items-center gap-2 mb-2">
        {isUser ? (
          <>
            <div className="w-5 h-5 rounded-full bg-surface-700 flex items-center justify-center">
              <User className="w-3 h-3 text-surface-300" />
            </div>
            <span className="text-xs font-medium text-surface-400">You</span>
          </>
        ) : (
          <>
            <div className="w-5 h-5 rounded-full bg-accent-600/15 flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-accent-400">
                <path d="M12 2a8 8 0 0 0-8 8c0 3.4 2.1 6.3 5 7.5V20a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-2.5c2.9-1.2 5-4.1 5-7.5a8 8 0 0 0-8-8z"/>
              </svg>
            </div>
            <span className="text-xs font-medium text-surface-400">Assistant</span>
          </>
        )}
      </div>

      {/* Content */}
      <div className="pl-7">
        {!isUser && message.isStreaming && message.content === '' ? (
          <TypingIndicator />
        ) : isUser ? (
          <p className="text-sm text-surface-200 whitespace-pre-wrap leading-relaxed">{message.content}</p>
        ) : (
          <div className={clsx('prose-chat', message.isStreaming && message.content && 'cursor-blink')}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          </div>
        )}

        {/* Sources toggle */}
        {hasSources && !isUser && (
          <div className="mt-3">
            <button
              onClick={() => setShowSources(!showSources)}
              className="flex items-center gap-1.5 text-xs text-surface-500 hover:text-surface-300 transition-colors py-1"
            >
              {showSources
                ? <ChevronDown className="w-3 h-3" />
                : <ChevronRight className="w-3 h-3" />
              }
              <span>{message.sources.length} source{message.sources.length > 1 ? 's' : ''}</span>
            </button>

            {showSources && (
              <div className="mt-2 space-y-1.5 animate-slide-up">
                {message.sources.map((src, i) => (
                  <SourceCard key={i} source={src} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
