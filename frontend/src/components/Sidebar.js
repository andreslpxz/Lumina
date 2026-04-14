import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  Plus, MessageSquare, Trash2, LogOut, Terminal, X
} from 'lucide-react';

export default function Sidebar({ chats, activeChat, onSelectChat, onNewChat, onDeleteChat, isOpen, onClose }) {
  const { user, logout } = useAuth();

  const groupChats = (chatList) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
    const weekAgo = new Date(today); weekAgo.setDate(today.getDate() - 7);

    const groups = { Today: [], Yesterday: [], 'This Week': [], Older: [] };
    chatList.forEach(c => {
      const d = new Date(c.updated_at || c.created_at);
      if (d >= today) groups.Today.push(c);
      else if (d >= yesterday) groups.Yesterday.push(c);
      else if (d >= weekAgo) groups['This Week'].push(c);
      else groups.Older.push(c);
    });
    return groups;
  };

  const groups = groupChats(chats);
  

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={onClose}
          data-testid="sidebar-overlay"
        />
      )}

      <aside
        data-testid="sidebar"
        className={`
          fixed md:relative z-50 h-full w-72 bg-bg border-r border-zinc-800 flex flex-col
          transition-transform duration-200 ease-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* Header */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
              <Terminal size={15} className="text-white" />
            </div>
            <span className="font-semibold text-zinc-200 tracking-tight text-sm">Axon Agent</span>
          </div>
          <button
            onClick={onClose}
            className="md:hidden text-zinc-500 hover:text-zinc-300 transition-colors p-1"
          >
            <X size={18} />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-3">
          <button
            data-testid="new-chat-btn"
            onClick={onNewChat}
            className="w-full flex items-center gap-2 px-3 py-2.5 bg-surface hover:bg-surface-hover border border-zinc-800 rounded-md text-sm text-zinc-300 hover:text-white transition-all"
          >
            <Plus size={16} />
            <span>New Chat</span>
          </button>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto px-2 pb-2 scrollbar-hide">
          {Object.entries(groups).map(([label, items]) => {
            if (items.length === 0) return null;
            return (
              <div key={label} className="mb-2">
                <p className="text-[10px] uppercase tracking-widest text-zinc-500 px-2 mb-1 mt-3 font-medium">
                  {label}
                </p>
                {items.map(chat => (
                  <div
                    key={chat._id}
                    data-testid={`chat-item-${chat._id}`}
                    onClick={() => { onSelectChat(chat._id); onClose(); }}
                    className={`
                      group flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer text-sm truncate relative
                      transition-colors duration-150
                      ${activeChat === chat._id
                        ? 'bg-zinc-800 text-white'
                        : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
                      }
                    `}
                  >
                    <MessageSquare size={14} className="shrink-0 opacity-60" />
                    <span className="truncate flex-1">{chat.title || 'New Chat'}</span>
                    <button
                      data-testid={`delete-chat-${chat._id}`}
                      onClick={(e) => { e.stopPropagation(); onDeleteChat(chat._id); }}
                      className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-400 transition-all shrink-0"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            );
          })}
          {chats.length === 0 && (
            <div className="text-center text-zinc-600 text-xs mt-10 px-4">
              No chats yet. Start a new conversation.
            </div>
          )}
        </div>

        {/* User Info */}
        <div className="border-t border-zinc-800 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-md bg-zinc-800 flex items-center justify-center text-xs font-semibold text-zinc-400 shrink-0">
                {user?.name?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="min-w-0">
                <p className="text-xs text-zinc-300 truncate">{user?.name || 'User'}</p>
                <p className="text-[10px] text-zinc-600 truncate">{user?.email}</p>
              </div>
            </div>
            <button
              data-testid="logout-btn"
              onClick={logout}
              className="text-zinc-500 hover:text-zinc-300 transition-colors p-1"
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
