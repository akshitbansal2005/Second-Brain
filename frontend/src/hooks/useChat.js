/**
 * hooks/useChat.js
 *
 * Thin hook that wires together auth + chat store so components
 * don't have to import two stores.
 */

import { useAuthStore, useChatStore } from '../store';

export default function useChat() {
  const token = useAuthStore((s) => s.token);
  const {
    activeChat,
    isStreaming,
    sendMessage: _send,
    newChat,
    loadChat,
    deleteChat,
    chats,
    fetchChats,
  } = useChatStore();

  const sendMessage = (message) => _send(message, token);

  return {
    activeChat,
    messages: activeChat?.messages ?? [],
    chats,
    isStreaming,
    sendMessage,
    newChat,
    loadChat,
    deleteChat,
    fetchChats,
  };
}
