/**
 * components/layout/Sidebar.jsx
 * Collapsible sidebar: new chat, chat history, document library link, user info.
 */

import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore, useChatStore } from '../../store';
import {
  Plus, MessageSquare, FileText, Trash2,
  LogOut, PanelLeftClose, PanelLeft, Loader2
} from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';

export default function Sidebar({ open, onToggle }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { chats, activeChat, isLoadingChats, fetchChats, loadChat, newChat, deleteChat } = useChatStore();

  useEffect(() => { fetchChats(); }, []);

  const handleNewChat = () => {
    newChat();
    navigate('/');
  };

  const handleSelectChat = async (chatId) => {
    await loadChat(chatId);
    navigate('/');
  };

  const handleDeleteChat = async (e, chatId) => {
    e.stopPropagation();
    await deleteChat(chatId);
    toast.success('Chat deleted');
  };

  const handleLogout = () => {
    logout();
    toast.success('Logged out');
  };

  return (
    <aside
      className={clsx(
        'flex flex-col bg-surface-900 border-r border-surface-800 transition-all duration-200',
        open ? 'w-60' : 'w-[52px]'
      )}
    >
      {/* Header with logo & toggle */}
      <div className={clsx(
        'flex items-center h-14 border-b border-surface-800 px-3 flex-shrink-0',
        open ? 'justify-between' : 'justify-center'
      )}>
        {open && (
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-accent-600 flex items-center justify-center flex-shrink-0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                <path d="M12 2a8 8 0 0 0-8 8c0 3.4 2.1 6.3 5 7.5V20a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-2.5c2.9-1.2 5-4.1 5-7.5a8 8 0 0 0-8-8z"/>
                <path d="M10 22h4"/>
              </svg>
            </div>
            <span className="font-semibold text-surface-100 text-sm tracking-tight">Second Brain</span>
          </div>
        )}
        <button
          onClick={onToggle}
          className="w-7 h-7 rounded-md flex items-center justify-center text-surface-500 hover:text-surface-300 hover:bg-surface-800 transition-colors"
          title={open ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {open ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* New Chat button */}
      <div className="px-2.5 py-3 flex-shrink-0">
        <button
          onClick={handleNewChat}
          className={clsx(
            'btn-primary w-full text-sm',
            !open && 'px-0'
          )}
        >
          <Plus className="w-4 h-4 flex-shrink-0" />
          {open && <span>New Chat</span>}
        </button>
      </div>

      {/* Navigation links */}
      <div className="px-2.5 mb-1 flex-shrink-0">
        <button
          onClick={() => navigate('/documents')}
          className={clsx(
            'btn-ghost w-full text-sm',
            location.pathname === '/documents' && 'bg-surface-800 text-surface-200',
            !open && 'justify-center px-0'
          )}
        >
          <FileText className="w-4 h-4 flex-shrink-0" />
          {open && <span>Documents</span>}
        </button>
      </div>

      {/* Section label */}
      {open && (
        <div className="px-4 pt-3 pb-1.5 flex-shrink-0">
          <p className="text-2xs font-medium text-surface-600 uppercase tracking-wider">History</p>
        </div>
      )}

      {/* Chat history list */}
      <div className="flex-1 overflow-y-auto px-2.5 space-y-0.5">
        {isLoadingChats && (
          <div className="flex justify-center py-4">
            <Loader2 className="w-4 h-4 animate-spin text-surface-600" />
          </div>
        )}
        {chats.map((chat) => (
          <button
            key={chat._id}
            onClick={() => handleSelectChat(chat._id)}
            className={clsx(
              'group w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-colors duration-100',
              activeChat?._id === chat._id
                ? 'bg-surface-800 text-surface-200'
                : 'text-surface-500 hover:bg-surface-850 hover:text-surface-300',
              !open && 'justify-center'
            )}
          >
            <MessageSquare className="w-3.5 h-3.5 flex-shrink-0 opacity-60" />
            {open && (
              <>
                <span className="flex-1 text-xs truncate">{chat.title}</span>
                <button
                  onClick={(e) => handleDeleteChat(e, chat._id)}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-surface-600 hover:text-red-400 transition-all"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </>
            )}
          </button>
        ))}

        {!isLoadingChats && chats.length === 0 && open && (
          <p className="text-xs text-surface-600 text-center py-8 px-2">
            No chats yet
          </p>
        )}
      </div>

      {/* User info + logout */}
      <div className={clsx(
        'border-t border-surface-800 p-2.5 flex items-center gap-2 flex-shrink-0',
        !open && 'justify-center'
      )}>
        <div className="w-7 h-7 rounded-full bg-accent-600/15 flex items-center justify-center flex-shrink-0">
          <span className="text-2xs font-semibold text-accent-400">
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </span>
        </div>
        {open && (
          <>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-surface-300 truncate">{user?.name}</p>
              <p className="text-2xs text-surface-600 truncate">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-md text-surface-600 hover:text-surface-300 hover:bg-surface-800 transition-colors"
              title="Log out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>
    </aside>
  );
}
