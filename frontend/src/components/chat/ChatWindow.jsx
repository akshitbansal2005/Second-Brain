/**
 * components/chat/ChatWindow.jsx
 * The main chat interface with message list and input bar.
 */

import React, { useEffect, useRef } from 'react';
import { useAuthStore, useChatStore } from '../../store';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import EmptyState from './EmptyState';

export default function ChatWindow() {
  const { token } = useAuthStore();
  const { activeChat, isStreaming, sendMessage } = useChatStore();
  const bottomRef = useRef(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeChat?.messages]);

  const handleSend = (message) => {
    sendMessage(message, token);
  };

  const messages = activeChat?.messages || [];

  return (
    <div className="flex flex-col h-full bg-surface-950">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 h-14 border-b border-surface-800 flex-shrink-0">
        <div>
          <h2 className="text-sm font-medium text-surface-200">
            {activeChat?.title || 'New Conversation'}
          </h2>
          <p className="text-2xs text-surface-600">
            Ask anything from your knowledge base
          </p>
        </div>
      </div>

      {/* Message list */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <EmptyState onPromptClick={handleSend} />
        ) : (
          <div className="max-w-2xl mx-auto px-4 py-6 space-y-1">
            {messages.map((msg, i) => (
              <ChatMessage key={msg._id || i} message={msg} />
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input bar */}
      <ChatInput onSend={handleSend} disabled={isStreaming} />
    </div>
  );
}
