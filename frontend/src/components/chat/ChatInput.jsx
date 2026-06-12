/**
 * components/chat/ChatInput.jsx
 * Textarea input with Shift+Enter for newlines, Enter to send.
 */

import React, { useState, useRef, useEffect } from 'react';
import { ArrowUp, Loader2 } from 'lucide-react';
import clsx from 'clsx';

export default function ChatInput({ onSend, disabled }) {
  const [value, setValue] = useState('');
  const textareaRef = useRef(null);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 160) + 'px';
  }, [value]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
  };

  return (
    <div className="px-4 py-4 flex-shrink-0">
      <div className="max-w-2xl mx-auto">
        <div className={clsx(
          'flex items-end gap-2 bg-surface-900 border rounded-xl px-4 py-3 transition-colors duration-150',
          disabled
            ? 'border-surface-800 opacity-60'
            : 'border-surface-700 focus-within:border-surface-600'
        )}>
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            rows={1}
            placeholder={disabled ? 'Generating response…' : 'Message Second Brain…'}
            className="flex-1 bg-transparent text-sm text-surface-200 placeholder-surface-600
                       resize-none outline-none leading-relaxed"
          />

          <button
            onClick={handleSend}
            disabled={!value.trim() || disabled}
            className={clsx(
              'flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-colors duration-150',
              value.trim() && !disabled
                ? 'bg-accent-600 text-white hover:bg-accent-700'
                : 'bg-surface-800 text-surface-600 cursor-not-allowed'
            )}
          >
            {disabled
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <ArrowUp className="w-3.5 h-3.5" />
            }
          </button>
        </div>
        <p className="text-2xs text-surface-700 mt-1.5 text-center">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
