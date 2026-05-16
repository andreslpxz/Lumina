import React, { useState, useEffect, useRef } from 'react';
import {
  Send, Paperclip, Zap, Cpu, Search, X, Menu, Loader2, ArrowDown
} from 'lucide-react';
import ContentRenderer from './ContentRenderer';

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
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [attachedFile, setAttachedFile] = useState(null);

  // Skill autocomplete states
  const [showSkillSuggestions, setShowSkillSuggestions] = useState(false);
  const [skillSuggestions, setSkillSuggestions] = useState([]);
  const [selectedSuggestionIdx, setSelectedSuggestionIdx] = useState(0);

  const endRef = useRef(null);
  const containerRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (skillInput) {
      setInput(prev => prev + skillInput);
      onSkillInputUsed();
      if (textareaRef.current) textareaRef.current.focus();
    }
  }, [skillInput, onSkillInputUsed]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 300);
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInput(val);

    // Skill autocomplete logic
    const lastWordMatch = val.match(/@(\w*)$/);
    if (lastWordMatch) {
      const query = lastWordMatch[1].toLowerCase();
      // Fetch skills from API
      fetch(`${API}/api/skills/search?q=${query}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('sb-access-token')}` }
      })
      .then(r => r.json())
      .then(data => {
        setSkillSuggestions(data);
        setShowSkillSuggestions(data.length > 0);
        setSelectedSuggestionIdx(0);
      })
      .catch(() => setShowSkillSuggestions(false));
    } else {
      setShowSkillSuggestions(false);
    }
  };

  const insertSkillSuggestion = (skill) => {
    const newVal = input.replace(/@\w*$/, `@${skill.slug} `);
    setInput(newVal);
    setShowSkillSuggestions(false);
    if (textareaRef.current) textareaRef.current.focus();
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) setAttachedFile(file);
    e.target.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || !chatId || isLoading) return;

    const userMsg = input.trim();
    setInput('');
    setAttachedFile(null);
    setIsLoading(true);

    const msgId = Math.random();
    setMessages(prev => [...prev, { id: msgId, role: 'user', content: userMsg }]);

    try {
      const resp = await fetch(`${API}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('sb-access-token')}`
        },
        body: JSON.stringify({ chat_id: chatId, content: userMsg }),
      });

      if (!resp.ok) throw new Error('Chat failed');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let assistantMsg = {
        id: Math.random(),
        role: 'assistant',
        content: '',
        isStreaming: true,
        toolCalls: []
      };

      setMessages(prev => [...prev, assistantMsg]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === 'token') {
                assistantMsg.content += data.content;
                setMessages(prev => prev.map(m => m.id === assistantMsg.id ? { ...assistantMsg } : m));
              } else if (data.type === 'parsed') {
                assistantMsg.parsedData = data.data;
                setMessages(prev => prev.map(m => m.id === assistantMsg.id ? { ...assistantMsg } : m));
              } else if (data.type === 'done') {
                assistantMsg.isStreaming = false;
                setMessages(prev => prev.map(m => m.id === assistantMsg.id ? { ...assistantMsg } : m));
              }
            } catch {}
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredMessages = messages.filter(m =>
    m.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderMessage = (msg) => (
    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} mb-6`}>
      <div className={`max-w-[85%] ${msg.role === 'user' ? 'bg-zinc-800' : 'bg-transparent'} rounded-lg p-3`}>
        <ContentRenderer
          content={msg.content}
          role={msg.role}
          parsedData={msg.parsedData}
          isStreaming={msg.isStreaming}
          chatId={chatId}
        />
      </div>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col bg-bg relative min-w-0 h-full">
      {/* Header */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-zinc-800 bg-bg/80 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="md:hidden text-zinc-400 hover:text-zinc-200 transition-colors p-1"
          >
            <Menu size={20} />
          </button>
          <img src="/lumina-logo.jpeg" alt="Lumina" className="w-7 h-7 rounded-md object-cover" />
          <span className="font-semibold text-zinc-200 tracking-tight text-sm">Lumina</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            data-testid="search-toggle-btn"
            onClick={() => { setShowSearch(!showSearch); setSearchQuery(''); }}
            className="text-zinc-400 hover:text-zinc-200 transition-colors p-1.5 rounded-md hover:bg-zinc-800"
            title="Search messages"
          >
            <Search size={16} />
          </button>
        </div>
      </div>

      {/* Search bar */}
      {showSearch && (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-zinc-800 bg-surface animate-fade-in-up">
          <Search size={14} className="text-zinc-500 shrink-0" />
          <input
            data-testid="search-input"
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search in conversation..."
            className="flex-1 bg-transparent text-zinc-200 text-sm focus:outline-none placeholder-zinc-600"
            autoFocus
          />
          <button
            onClick={() => { setShowSearch(false); setSearchQuery(''); }}
            className="text-zinc-500 hover:text-zinc-300 transition-colors p-0.5"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Messages */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-6 space-y-1 relative scrollbar-hide"
      >
        {!chatId ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
            <img src="/lumina-logo.jpeg" alt="Lumina" className="w-16 h-16 rounded-md object-cover" />
            <div>
              <p className="text-sm font-medium text-zinc-400">Select or create a chat</p>
              <p className="text-xs text-zinc-600 mt-1">Start building with Lumina</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 rounded-md bg-surface border border-zinc-800 flex items-center justify-center">
              <Cpu size={28} className="text-primary/60" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-300">What should we build?</p>
              <p className="text-xs text-zinc-600 mt-1">Describe your project and I'll start coding</p>
            </div>
          </div>
        ) : (
          filteredMessages.map(renderMessage)
        )}
        <div ref={endRef} />
      </div>

      {/* Scroll to bottom */}
      {showScrollBtn && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-24 right-6 bg-surface border border-zinc-800 rounded-full p-2 text-zinc-400 hover:text-zinc-200 shadow-lg transition-all"
        >
          <ArrowDown size={16} />
        </button>
      )}

      {/* Input */}
      <div className="p-3 border-t border-zinc-800 bg-bg" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))', position: 'relative', zIndex: 10 }}>
        {attachedFile && (
          <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-surface border border-zinc-800 rounded-md text-xs text-zinc-400 animate-fade-in-up">
            <Zap size={12} className="text-blue-400 shrink-0" />
            <span className="truncate flex-1 text-zinc-300">{attachedFile.name}</span>
            <span className="text-zinc-600 shrink-0">{(attachedFile.size / 1024).toFixed(1)}KB</span>
            <button
              onClick={() => setAttachedFile(null)}
              className="text-zinc-500 hover:text-zinc-300 transition-colors shrink-0"
            >
              <X size={12} />
            </button>
          </div>
        )}
        <form onSubmit={handleSubmit} className="bg-surface border border-zinc-800 rounded-md p-3 focus-within:border-primary/50 transition-all relative">
          {/* Skill autocomplete suggestions */}
          {showSkillSuggestions && skillSuggestions.length > 0 && (
            <div className="absolute bottom-full left-0 right-0 mb-1 bg-surface border border-zinc-700 rounded-md shadow-xl overflow-hidden z-20 max-h-48 overflow-y-auto">
              {skillSuggestions.map((skill, idx) => (
                <button
                  key={skill.slug}
                  type="button"
                  onClick={() => insertSkillSuggestion(skill)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                    idx === selectedSuggestionIdx ? 'bg-zinc-800' : 'hover:bg-zinc-800/50'
                  }`}
                >
                  <Zap size={13} className="text-primary shrink-0" />
                  <div className="min-w-0">
                    <span className="text-xs font-medium text-zinc-200">@{skill.slug}</span>
                    <span className="text-[10px] text-zinc-500 ml-2 truncate">{skill.name}</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          <div
            onClick={() => {
              if (chatId && !isLoading && textareaRef.current) {
                textareaRef.current.focus();
              }
            }}
            style={{ cursor: 'text' }}
          >
            <textarea
              ref={textareaRef}
              data-testid="chat-input-textarea"
              value={input}
              onChange={handleInputChange}
              onKeyDown={e => {
                if (showSkillSuggestions && skillSuggestions.length > 0) {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setSelectedSuggestionIdx(i => Math.min(i + 1, skillSuggestions.length - 1));
                    return;
                  }
                  if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setSelectedSuggestionIdx(i => Math.max(i - 1, 0));
                    return;
                  }
                  if (e.key === 'Tab' || (e.key === 'Enter' && !e.shiftKey)) {
                    e.preventDefault();
                    insertSkillSuggestion(skillSuggestions[selectedSuggestionIdx]);
                    return;
                  }
                  if (e.key === 'Escape') {
                    setShowSkillSuggestions(false);
                    return;
                  }
                }
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder={chatId ? "Describe what you want to build... (use @skill-name or /skills)" : "Select a chat first"}
              disabled={!chatId || isLoading}
              className="w-full bg-transparent text-zinc-200 resize-none focus:outline-none placeholder-zinc-600 disabled:opacity-50"
              rows={2}
              style={{ fontSize: '16px', lineHeight: '1.5', minHeight: '48px', maxHeight: '120px', touchAction: 'manipulation', WebkitUserSelect: 'text', userSelect: 'text', caretColor: '#FAFAFA' }}
            />
          </div>
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                className="hidden"
                accept=".js,.jsx,.ts,.tsx,.py,.json,.md,.css,.html,.xml,.csv,.yaml,.yml,.toml,.sh,.sql,.rb,.go,.rs,.java,.c,.cpp,.h,.txt,.log,.env,.cfg,.ini,.pdf,.png,.jpg,.jpeg,.gif,.svg,.webp"
              />
              <button
                data-testid="attach-file-btn"
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={!chatId || isLoading}
                className="text-zinc-500 hover:text-zinc-300 transition-colors p-1 rounded hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed"
                title="Attach file"
              >
                <Paperclip size={16} />
              </button>
              <button
                data-testid="skills-quick-btn"
                type="button"
                onClick={onOpenSkills}
                disabled={!chatId}
                className="text-zinc-500 hover:text-primary transition-colors p-1 rounded hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed"
                title="Skills (@skill-name)"
              >
                <Zap size={16} />
              </button>
              <span className="text-[10px] text-zinc-600 hidden sm:inline">@skill or /skills</span>
            </div>
            <button
              data-testid="send-message-btn"
              type="submit"
              disabled={isLoading || !input.trim() || !chatId}
              className="px-3 py-1.5 rounded-md bg-primary text-white text-sm hover:bg-primary-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
            >
              {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              <span className="text-xs font-medium">Send</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
