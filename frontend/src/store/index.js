/**
 * store/index.js — Global state with Zustand
 *
 * Slices:
 *   auth  — current user, token, login/logout
 *   chat  — chat sessions, active session, messages
 *   docs  — uploaded documents list
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';

// ─── Auth Store ───────────────────────────────────────────────────────────────
export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,
      error: null,

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const res = await api.post('/auth/login', { email, password });
          set({ user: res.data.user, token: res.data.token, isLoading: false });
          api.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
          return true;
        } catch (err) {
          set({ error: err.response?.data?.error || 'Login failed', isLoading: false });
          return false;
        }
      },

      register: async (name, email, password) => {
        set({ isLoading: true, error: null });
        try {
          const res = await api.post('/auth/register', { name, email, password });
          set({ user: res.data.user, token: res.data.token, isLoading: false });
          api.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
          return true;
        } catch (err) {
          set({ error: err.response?.data?.error || 'Registration failed', isLoading: false });
          return false;
        }
      },

      logout: () => {
        set({ user: null, token: null });
        delete api.defaults.headers.common['Authorization'];
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, token: state.token }),
      onRehydrateStorage: () => (state) => {
        // Re-attach token to axios on page refresh
        if (state?.token) {
          api.defaults.headers.common['Authorization'] = `Bearer ${state.token}`;
        }
      },
    }
  )
);

// ─── Chat Store ───────────────────────────────────────────────────────────────
export const useChatStore = create((set, get) => ({
  chats: [],        // sidebar list
  activeChat: null, // { _id, title, messages[] }
  isStreaming: false,
  isLoadingChats: false,

  fetchChats: async () => {
    set({ isLoadingChats: true });
    try {
      const res = await api.get('/chat');
      set({ chats: res.data.chats, isLoadingChats: false });
    } catch {
      set({ isLoadingChats: false });
    }
  },

  loadChat: async (chatId) => {
    try {
      const res = await api.get(`/chat/${chatId}`);
      set({ activeChat: res.data.chat });
    } catch (err) {
      console.error('Failed to load chat', err);
    }
  },

  newChat: () => {
    set({ activeChat: null });
  },

  deleteChat: async (chatId) => {
    await api.delete(`/chat/${chatId}`);
    set((state) => ({
      chats: state.chats.filter((c) => c._id !== chatId),
      activeChat: state.activeChat?._id === chatId ? null : state.activeChat,
    }));
  },

  /**
   * Send a message and stream the response.
   * Uses the Fetch API for SSE instead of axios (axios doesn't support streaming well).
   */
  sendMessage: async (message, token) => {
    const { activeChat } = get();

    // Optimistically add the user message
    const userMsg = { role: 'user', content: message, _id: Date.now() };

    set((state) => ({
      isStreaming: true,
      activeChat: state.activeChat
        ? { ...state.activeChat, messages: [...state.activeChat.messages, userMsg] }
        : { _id: null, title: message.slice(0, 60), messages: [userMsg] },
    }));

    // Placeholder for streaming assistant message
    const assistantMsgId = Date.now() + 1;
    set((state) => ({
      activeChat: {
        ...state.activeChat,
        messages: [
          ...state.activeChat.messages,
          { role: 'assistant', content: '', sources: [], _id: assistantMsgId, isStreaming: true },
        ],
      },
    }));

    try {
      const response = await fetch('/api/chat/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message, chatId: activeChat?._id }),
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let sources = [];
      let fullContent = '';
      let newChatId = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        const lines = text.split('\n').filter((l) => l.startsWith('data: '));

        for (const line of lines) {
          try {
            const data = JSON.parse(line.replace('data: ', ''));

            if (data.type === 'sources') {
              sources = data.sources;
              set((state) => ({
                activeChat: {
                  ...state.activeChat,
                  messages: state.activeChat.messages.map((m) =>
                    m._id === assistantMsgId ? { ...m, sources } : m
                  ),
                },
              }));
            }

            if (data.type === 'delta') {
              fullContent += data.content;
              set((state) => ({
                activeChat: {
                  ...state.activeChat,
                  messages: state.activeChat.messages.map((m) =>
                    m._id === assistantMsgId
                      ? { ...m, content: fullContent }
                      : m
                  ),
                },
              }));
            }

            if (data.type === 'done') {
              newChatId = data.chatId;
            }
          } catch (_) {}
        }
      }

      // Finalize streaming message
      set((state) => ({
        isStreaming: false,
        activeChat: {
          ...state.activeChat,
          _id: newChatId || state.activeChat?._id,
          messages: state.activeChat.messages.map((m) =>
            m._id === assistantMsgId ? { ...m, isStreaming: false, sources } : m
          ),
        },
      }));

      // Refresh sidebar to get updated title / new chat
      get().fetchChats();
    } catch (err) {
      console.error('Stream error:', err);
      set((state) => ({
        isStreaming: false,
        activeChat: {
          ...state.activeChat,
          messages: state.activeChat.messages.map((m) =>
            m._id === assistantMsgId
              ? { ...m, content: 'An error occurred. Please try again.', isStreaming: false }
              : m
          ),
        },
      }));
    }
  },
}));

// ─── Document Store ───────────────────────────────────────────────────────────
export const useDocStore = create((set) => ({
  documents: [],
  isLoading: false,

  fetchDocuments: async () => {
    set({ isLoading: true });
    try {
      const res = await api.get('/documents');
      set({ documents: res.data.documents, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  addDocument: (doc) =>
    set((state) => ({ documents: [doc, ...state.documents] })),

  updateDocument: (id, updates) =>
    set((state) => ({
      documents: state.documents.map((d) => (d._id === id ? { ...d, ...updates } : d)),
    })),

  removeDocument: async (id) => {
    await api.delete(`/documents/${id}`);
    set((state) => ({ documents: state.documents.filter((d) => d._id !== id) }));
  },
}));
