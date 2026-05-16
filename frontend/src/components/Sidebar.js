import React from 'react';
import { Plus, MessageSquare, Trash2, Settings, Zap, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function Sidebar({
  chats,
  activeChat,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  isOpen,
  onClose,
  onOpenSkills,
  onOpenSettings
}) {
  const { t } = useTranslation();

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-72 bg-bg border-r border-zinc-800
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        flex flex-col
      `}>
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
               <Zap size={18} className="text-white fill-current" />
            </div>
            <span className="font-bold text-lg tracking-tight">Lumina</span>
          </div>
          <button onClick={onClose} className="lg:hidden p-2 text-zinc-500 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-4">
          <button
            onClick={onNewChat}
            className="w-full flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl py-3 text-sm font-semibold transition-all border border-zinc-700/50"
          >
            <Plus size={18} /> {t('new_chat')}
          </button>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto px-3 space-y-1 scrollbar-hide">
          {chats.map((chat) => (
            <div
              key={chat.id}
              className={`
                group flex items-center justify-between px-3 py-3 rounded-xl cursor-pointer transition-all
                ${activeChat === chat.id
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'text-zinc-400 hover:bg-surface hover:text-zinc-200 border border-transparent'}
              `}
              onClick={() => onSelectChat(chat.id)}
            >
              <div className="flex items-center gap-3 min-w-0">
                <MessageSquare size={16} className={activeChat === chat.id ? 'text-primary' : 'text-zinc-500'} />
                <span className="text-sm font-medium truncate">{chat.title || 'Chat'}</span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteChat(chat.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/10 hover:text-red-400 rounded-lg transition-all"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>

        {/* Footer Actions */}
        <div className="p-4 mt-auto border-t border-zinc-800 space-y-2">
          <button
            onClick={onOpenSkills}
            className="w-full flex items-center gap-3 px-4 py-3 text-zinc-400 hover:text-zinc-100 hover:bg-surface rounded-xl transition-all text-sm font-medium"
          >
            <Zap size={18} /> Skills
          </button>
          <button
            onClick={onOpenSettings}
            className="w-full flex items-center gap-3 px-4 py-3 text-zinc-400 hover:text-zinc-100 hover:bg-surface rounded-xl transition-all text-sm font-medium"
          >
            <Settings size={18} /> {t('settings')}
          </button>
        </div>
      </aside>
    </>
  );
}
