import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Send, Loader2, Terminal as TerminalIcon, Cpu,
  ChevronDown, ChevronRight, CheckCircle2, AlertCircle,
  ArrowDown, Wrench, Globe, Menu
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

function ToolCallBlock({ toolCall, result, isRunning }) {
  const [expanded, setExpanded] = useState(false);
  const name = toolCall?.name || 'unknown';

  const getIcon = () => {
    if (name === 'run_command') return <TerminalIcon size={13} />;
    if (name === 'write_file') return <Wrench size={13} />;
    if (name === 'read_file') return <Wrench size={13} />;
    if (name === 'search_web') return <Globe size={13} />;
    return <Wrench size={13} />;
  };

  return (
    <div
      data-testid={`tool-call-${name}`}
      className={`border rounded-md overflow-hidden mb-2 transition-colors ${
        isRunning
          ? 'border-blue-500/40 bg-blue-950/20'
          : result?.error
          ? 'border-red-800/40 bg-red-950/10'
          : 'border-zinc-800 bg-black/30'
      }`}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-zinc-800/30 transition-colors"
      >
        <span className={`${isRunning ? 'text-blue-400' : result?.error ? 'text-red-400' : 'text-emerald-400'}`}>
          {isRunning ? <Loader2 size={13} className="animate-spin" /> : getIcon()}
        </span>
        <span className="font-mono text-xs text-zinc-400 flex-1 truncate">
          {name}
          {toolCall?.arguments?.command && (
            <span className="text-zinc-600 ml-2">$ {toolCall.arguments.command.substring(0, 60)}</span>
          )}
          {toolCall?.arguments?.path && (
            <span className="text-zinc-600 ml-2">{toolCall.arguments.path}</span>
          )}
        </span>
        {isRunning && <span className="text-[10px] text-blue-400 animate-pulse">Running...</span>}
        {!isRunning && result && !result.error && <CheckCircle2 size={13} className="text-emerald-500" />}
        {!isRunning && result?.error && <AlertCircle size={13} className="text-red-500" />}
        {expanded ? <ChevronDown size={13} className="text-zinc-500" /> : <ChevronRight size={13} className="text-zinc-500" />}
      </button>
      {expanded && result && (
        <div className="border-t border-zinc-800/50 px-3 py-2 max-h-48 overflow-y-auto">
          <pre className="text-[11px] font-mono text-zinc-500 whitespace-pre-wrap break-all">
            {result.stdout && <span className="text-zinc-400">{result.stdout.substring(0, 2000)}</span>}
            {result.stderr && <span className="text-amber-500">{result.stderr.substring(0, 1000)}</span>}
            {result.error && <span className="text-red-400">{result.error}</span>}
            {result.content && <span className="text-zinc-400">{result.content.substring(0, 2000)}</span>}
            {result.success && <span className="text-emerald-400">{result.message}</span>}
            {result.answer && <span className="text-zinc-300">{result.answer}</span>}
          </pre>
        </div>
      )}
    </div>
  );
}

export default function ChatPanel({ chatId, messages, setMessages, onPreviewUrl, onToggleSidebar }) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const containerRef = useRef(null);
  const endRef = useRef(null);

  const scrollToBottom = () => endRef.current?.scrollIntoView({ behavior: 'smooth' });

  useEffect(() => { scrollToBottom(); }, [messages]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 100);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !chatId) return;

    const userMsg = { id: Date.now(), role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    const assistantId = Date.now() + 1;
    setMessages(prev => [...prev, {
      id: assistantId,
      role: 'assistant',
      content: '',
      isStreaming: true,
      toolCalls: [],
      toolResults: [],
    }]);

    try {
      const response = await fetch(`${API}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: input, chat_id: chatId }),
        credentials: 'include',
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';
      let parsedData = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (!line.trim()) continue;
          let content = line.startsWith('data: ') ? line.slice(6) : line;
          try {
            const data = JSON.parse(content);
            switch (data.type) {
              case 'token':
                fullContent += data.content;
                setMessages(prev => prev.map(m =>
                  m.id === assistantId ? { ...m, content: fullContent } : m
                ));
                break;
              case 'parsed':
                parsedData = data.data;
                setMessages(prev => prev.map(m =>
                  m.id === assistantId ? { ...m, parsedData: parsedData, content: fullContent } : m
                ));
                break;
              case 'tool_start':
                setMessages(prev => prev.map(m =>
                  m.id === assistantId
                    ? { ...m, toolCalls: [...(m.toolCalls || []), { ...data.toolCall, isRunning: true }] }
                    : m
                ));
                break;
              case 'tool_result':
                setMessages(prev => prev.map(m => {
                  if (m.id !== assistantId) return m;
                  const updatedCalls = (m.toolCalls || []).map(tc =>
                    tc.name === data.toolCall.name && tc.isRunning
                      ? { ...tc, isRunning: false, result: data.result }
                      : tc
                  );
                  return { ...m, toolCalls: updatedCalls };
                }));
                break;
              case 'preview_url':
                if (data.url) onPreviewUrl(data.url);
                break;
              case 'error':
                setMessages(prev => prev.map(m =>
                  m.id === assistantId ? { ...m, content: `Error: ${data.content}`, isStreaming: false } : m
                ));
                break;
              case 'done':
                break;
              default:
                break;
            }
          } catch {}
        }
      }

      setMessages(prev => prev.map(m =>
        m.id === assistantId ? { ...m, isStreaming: false } : m
      ));
    } catch (err) {
      setMessages(prev => prev.map(m =>
        m.id === assistantId
          ? { ...m, content: `Error: ${err.message}`, isStreaming: false }
          : m
      ));
    } finally {
      setIsLoading(false);
    }
  };

  const renderMessage = (msg) => {
    if (msg.role === 'user') {
      return (
        <div className="flex justify-end mb-4 animate-fade-in-up" key={msg.id}>
          <div className="max-w-[85%] bg-zinc-800 text-zinc-200 px-4 py-3 rounded-md rounded-tr-none text-sm leading-relaxed border border-zinc-700/50">
            {msg.content}
          </div>
        </div>
      );
    }

    if (msg.role === 'system') {
      return (
        <div className="flex items-center gap-2 px-4 py-2 mb-4 bg-red-900/20 border border-red-800/30 rounded-md text-xs text-red-400 font-mono" key={msg.id}>
          <AlertCircle size={14} />
          {msg.content}
        </div>
      );
    }

    // Assistant message
    const parsed = msg.parsedData || (() => {
      try { return JSON.parse(msg.content); } catch { return null; }
    })();

    return (
      <div className="mb-6 animate-fade-in-up" key={msg.id}>
        {/* Thought */}
        {parsed?.thought && (
          <div className="text-[11px] text-zinc-600 italic border-l-2 border-zinc-800 pl-3 py-1 mb-3">
            {parsed.thought}
          </div>
        )}

        {/* Message content */}
        {parsed?.message ? (
          <div className="text-sm text-zinc-300 leading-relaxed prose prose-invert prose-sm max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{parsed.message}</ReactMarkdown>
          </div>
        ) : !parsed && msg.content ? (
          <div className="text-sm text-zinc-300 leading-relaxed">
            {msg.isStreaming ? (
              <span>
                {msg.content}
                <span className="inline-block w-1.5 h-4 bg-primary ml-0.5 animate-pulse-dot" />
              </span>
            ) : (
              <div className="prose prose-invert prose-sm max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
              </div>
            )}
          </div>
        ) : null}

        {/* Tool calls */}
        {msg.toolCalls && msg.toolCalls.length > 0 && (
          <div className="mt-3 space-y-1">
            {msg.toolCalls.map((tc, i) => (
              <ToolCallBlock key={i} toolCall={tc} result={tc.result} isRunning={tc.isRunning} />
            ))}
          </div>
        )}

        {/* Streaming indicator */}
        {msg.isStreaming && !msg.content && (
          <div className="flex items-center gap-2 text-zinc-500 text-xs">
            <Loader2 size={14} className="animate-spin text-primary" />
            <span>Thinking...</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-bg" data-testid="chat-panel">
      {/* Header */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-3">
          <button
            data-testid="hamburger-menu-btn"
            onClick={onToggleSidebar}
            className="md:hidden text-zinc-400 hover:text-zinc-200 transition-colors p-1"
          >
            <Menu size={20} />
          </button>
          <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
            <Cpu size={14} className="text-white" />
          </div>
          <span className="font-semibold text-zinc-200 tracking-tight text-sm">Axon Agent</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="px-2.5 py-1 rounded-md bg-emerald-900/30 border border-emerald-800/40 text-[10px] text-emerald-400 font-medium">
            Groq
          </div>
          <div className="px-2.5 py-1 rounded-md bg-blue-900/30 border border-blue-800/40 text-[10px] text-blue-400 font-medium">
            E2B
          </div>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-6 space-y-1 relative scrollbar-hide"
      >
        {!chatId ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 rounded-md bg-surface border border-zinc-800 flex items-center justify-center">
              <TerminalIcon size={28} className="text-zinc-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-400">Select or create a chat</p>
              <p className="text-xs text-zinc-600 mt-1">Start building with Axon Agent</p>
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
          messages.map(renderMessage)
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
      <div className="p-3 border-t border-zinc-800 bg-bg">
        <form onSubmit={handleSubmit} className="bg-surface border border-zinc-800 rounded-md p-3 focus-within:border-primary/50 transition-all">
          <textarea
            data-testid="chat-input-textarea"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder={chatId ? "Describe what you want to build..." : "Select a chat first"}
            disabled={!chatId || isLoading}
            className="w-full bg-transparent text-zinc-200 text-sm resize-none focus:outline-none min-h-[40px] max-h-[120px] placeholder-zinc-600 disabled:opacity-50"
            rows={1}
          />
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2 text-[10px] text-zinc-600">
              <span>Shift+Enter for newline</span>
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
