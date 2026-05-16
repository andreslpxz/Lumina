import React, { useState, useRef, useEffect } from 'react';
import { Send, Menu, Paperclip, Zap, Bot, User, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import ContentRenderer from './ContentRenderer';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { useTranslation } from 'react-i18next';

const API = process.env.REACT_APP_BACKEND_URL;

export default function ChatPanel({
  chatId,
  messages,
  setMessages,
  onToggleSidebar,
  onOpenSkills,
  skillInput,
  onSkillInputUsed
}) {
  const { getAccessToken } = useAuth();
  const { settings } = useSettings();
  const { t } = useTranslation();

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (skillInput) {
      setInput(prev => prev + skillInput);
      onSkillInputUsed();
    }
  }, [skillInput, onSkillInputUsed]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!input.trim() || !chatId || isLoading) return;

    const userMsg = { id: Date.now(), role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const resp = await fetch(`${API}/api/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getAccessToken()}`
        },
        body: JSON.stringify({
          chat_id: chatId,
          content: input,
          settings: settings // Send current settings with request
        })
      });

      if (!resp.ok) throw new Error("API Error");

      const data = await resp.json();
      const assistantMsg = {
        id: Date.now() + 1,
        role: 'assistant',
        content: data.content,
        parsedData: null
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-bg">
      {/* Header */}
      <header className="h-16 flex items-center justify-between px-4 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onToggleSidebar} className="lg:hidden p-2 text-zinc-400 hover:text-white">
            <Menu size={20} />
          </button>
          <div className="flex flex-col">
            <h1 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
              Lumina AI <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
            </h1>
            <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">{settings.model}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <button onClick={onOpenSkills} className="p-2 text-zinc-400 hover:text-primary transition-colors">
             <Sparkles size={18} />
           </button>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-8 space-y-8 scrollbar-hide">
        {!chatId ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-4 animate-in fade-in duration-700">
             <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center text-primary mb-2 ring-8 ring-primary/5">
                <Zap size={40} className="fill-current" />
             </div>
             <h2 className="text-2xl font-bold text-zinc-100 tracking-tight">{t('select_chat')}</h2>
             <p className="text-zinc-500 text-sm max-w-xs">{t('start_building')}</p>
          </div>
        ) : (
          <>
            {messages.map((m) => (
              <div key={m.id} className={`flex gap-4 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex gap-4 max-w-[85%] lg:max-w-[70%] ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    m.role === 'user' ? 'bg-zinc-800 text-zinc-400' : 'bg-primary/20 text-primary'
                  }`}>
                    {m.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                  </div>
                  <div className={`space-y-2 ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`rounded-2xl px-5 py-3 text-sm leading-relaxed ${
                      m.role === 'user'
                        ? 'bg-primary text-white shadow-lg shadow-primary/10'
                        : 'bg-surface border border-zinc-800 text-zinc-200'
                    }`}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]} className="prose prose-invert max-w-none prose-sm">
                        {m.content}
                      </ReactMarkdown>
                    </div>
                    {m.role === 'assistant' && m.content && (
                      <ContentRenderer code={m.content} />
                    )}
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-4 justify-start animate-in fade-in duration-300">
                <div className="w-8 h-8 rounded-lg bg-primary/20 text-primary flex items-center justify-center">
                  <Bot size={16} />
                </div>
                <div className="bg-surface border border-zinc-800 rounded-2xl px-5 py-3 flex gap-1">
                  <div className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce"></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="p-4 bg-gradient-to-t from-bg via-bg to-transparent">
        <form
          onSubmit={handleSend}
          className="max-w-4xl mx-auto relative group"
        >
          <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-primary/10 rounded-2xl blur opacity-25 group-focus-within:opacity-100 transition duration-500"></div>
          <div className="relative bg-surface border border-zinc-800 rounded-2xl p-2 flex items-end gap-2 focus-within:border-primary/50 transition-colors">
             <button type="button" className="p-3 text-zinc-500 hover:text-zinc-300 transition-colors">
               <Paperclip size={20} />
             </button>
             <textarea
               value={input}
               onChange={(e) => setInput(e.target.value)}
               onKeyDown={(e) => {
                 if (e.key === 'Enter' && !e.shiftKey && settings.enter_to_send) {
                   e.preventDefault();
                   handleSend();
                 }
               }}
               placeholder={chatId ? "Escribe un mensaje..." : t('select_chat')}
               disabled={!chatId || isLoading}
               rows={1}
               className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-zinc-100 py-3 resize-none max-h-48 scrollbar-hide"
             />
             <button
               type="submit"
               disabled={!input.trim() || !chatId || isLoading}
               className="bg-primary hover:bg-primary-hover text-white p-3 rounded-xl disabled:opacity-50 disabled:grayscale transition-all shadow-lg shadow-primary/20"
             >
               <Send size={20} />
             </button>
          </div>
          <div className="mt-2 flex justify-center">
             <p className="text-[10px] text-zinc-600 font-medium">Lumina can make mistakes. Check important info.</p>
          </div>
        </form>
      </div>
    </div>
  );
}
