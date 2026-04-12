"use client";
import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Database, Globe, GitBranch, Cpu, User, Sparkles, ChevronRight, Terminal as TerminalIcon, FileCode, CheckCircle2, AlertCircle, Plus, ChevronDown, ArrowDown } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { motion, AnimatePresence } from 'motion/react';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function generateId() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

interface ToolCall {
  name: string;
  arguments: any;
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  isStreaming?: boolean;
  toolCalls?: ToolCall[];
  toolResults?: any[];
}

interface ChatPanelProps {
  onActiveSkillsChange: (skills: string[]) => void;
  onTerminalUpdate: (log: string) => void;
}

export default function ChatPanel({ onActiveSkillsChange, onTerminalUpdate }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem('lumina_chat_history');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setMessages(parsed.map((m: any) => m.id ? m : { ...m, id: generateId() }));
      } catch (e) {
        console.error('Failed to parse chat history', e);
      }
    }
    setIsInitialized(true);
  }, []);

  // Save to local storage when messages change
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem('lumina_chat_history', JSON.stringify(messages));
    }
  }, [messages, isInitialized]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeSkills, setActiveSkills] = useState<string[]>([]);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleScroll = () => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShowScrollButton(!isAtBottom);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { id: generateId(), role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      await processTurn([userMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        id: generateId(),
        role: 'system',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const processTurn = async (newMessages: Message[]) => {
    let currentHistory: any[] = [];
    setMessages(prev => {
      currentHistory = [...prev.map(m => ({
        role: m.role,
        content: m.content
      })), ...newMessages.map(m => ({
        role: m.role,
        content: m.content
      }))];
      return prev;
    });

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: currentHistory,
        activeSkills
      })
    });

    if (!response.body) throw new Error('No response body');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    // Crear el mensaje del asistente
    const assistantMessageId = generateId();
    setMessages(prev => [...prev, {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      isStreaming: true,
      toolCalls: [],
      toolResults: []
    }]);

    let fullContent = "";
    const turnToolResults: any[] = [];
    let parsedData: any = null;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (!line.trim()) continue;

          let contentToProcess = line;
          if (line.startsWith('data: ')) {
            contentToProcess = line.slice(6);
          }

          try {
            const data = JSON.parse(contentToProcess);

            switch (data.type) {
              case 'token':
                // Acumular tokens para mostrar streaming
                fullContent += data.content;
                setMessages(prev => prev.map(m => m.id === assistantMessageId ? { ...m, content: fullContent } : m));
                break;

              case 'parsed':
                // Se recibió la respuesta parseada completa
                parsedData = data.data;
                // Actualizar con el contenido parseado formateado
                setMessages(prev => prev.map(m => m.id === assistantMessageId ? { ...m, content: JSON.stringify(parsedData) } : m));
                break;

              case 'tool_start':
                // Agregar tool call al mensaje
                setMessages(prev => prev.map(m => m.id === assistantMessageId ? { ...m, toolCalls: [...(m.toolCalls || []), data.toolCall] } : m));
                break;

              case 'tool_result':
                // Guardar resultado de herramienta
                turnToolResults.push({
                  tool_call_id: data.toolCall.name,
                  name: data.toolCall.name,
                  content: JSON.stringify(data.result)
                });

                // Actualizar UI si es un comando terminal
                if (data.toolCall.name === 'run_command') {
                  onTerminalUpdate(
                    `$ ${data.toolCall.arguments.command}\n${data.result.stdout || ''}${data.result.stderr ? '\nError: ' + data.result.stderr : ''}`
                  );
                }

                // Agregar resultado al mensaje
                setMessages(prev => prev.map(m => m.id === assistantMessageId ? { ...m, toolResults: [...(m.toolResults || []), data.result] } : m));
                break;

              case 'error':
                console.error('Stream error:', data.content);
                setMessages(prev => prev.map(m => m.id === assistantMessageId ? { ...m, content: `Error: ${data.content}` } : m));
                break;

              case 'skill_loaded':
                console.log('Skill loaded:', data.skill);
                break;
            }
          } catch (e) {
            // Si no es JSON válido, ignorar línea vacía o malformada
            if (line.trim() && !line.startsWith('data: ')) {
              console.warn('Non-JSON line:', line);
            }
          }
        }
      }

      // Finalizar streaming
      setMessages(prev => prev.map(m => m.id === assistantMessageId ? { ...m, isStreaming: false } : m));

      // Si hay tool calls que ejecutar, procesar resultados
      if (turnToolResults.length > 0 && parsedData?.tool_calls?.length > 0) {
        const observationMessage: Message = {
          id: generateId(),
          role: 'user',
          content: `Tool Execution Results:\n${JSON.stringify(turnToolResults, null, 2)}`
        };
        await processTurn([observationMessage]);
      }
    } catch (error) {
      console.error('Error processing stream:', error);
      setMessages(prev => prev.map(m => m.id === assistantMessageId ? { ...m, content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`, isStreaming: false } : m));
    }
  };

  const renderMessageContent = (message: Message) => {
    // Mensaje del usuario
    if (message.role === 'user') {
      return (
        <div className="flex items-start gap-3 justify-end mb-4">
          <div className="bg-violet-600/20 text-zinc-200 px-4 py-2.5 rounded-2xl rounded-tr-none text-sm leading-relaxed border border-violet-500/30">
            {message.content}
          </div>
        </div>
      );
    }

    // Mensaje del sistema
    if (message.role === 'system') {
      return (
        <div className="flex items-center gap-2 px-4 py-2 mb-4 bg-red-900/20 border border-red-800/30 rounded-lg text-[10px] text-red-400 font-mono">
          <AlertCircle size={12} />
          {message.content}
        </div>
      );
    }

    // Mensaje del asistente - Streaming
    if (message.isStreaming) {
      return (
        <div className="space-y-3 w-full mb-6">
          <div className="flex items-center gap-2 text-zinc-500 text-[10px] font-bold uppercase tracking-widest px-1">
            <Loader2 size={12} className="animate-spin text-violet-500" />
            <span>Agent Active</span>
          </div>
          <div className="text-sm text-zinc-300 leading-relaxed">
            {message.content ? message.content.substring(0, 200) : "Processing..."}
            {message.content && message.content.length > 200 ? "..." : ""}
          </div>
        </div>
      );
    }

    // Mensaje del asistente - Procesado
    let parsedContent: any = null;
    try {
      parsedContent = JSON.parse(message.content);
    } catch (e) {
      // No es JSON válido
    }

    // Si se pudo parsear como JSON estructurado
    if (parsedContent && typeof parsedContent === 'object') {
      return (
        <div className="space-y-4 w-full mb-8">
          {/* Thought/Reasoning */}
          {parsedContent.thought && (
            <div className="text-[11px] text-zinc-500 italic opacity-60 border-l-2 border-zinc-700 pl-3 py-1">
              💭 {parsedContent.thought}
            </div>
          )}

          {/* Main message */}
          {parsedContent.message && (
            <div className="text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap">
              {parsedContent.message}
            </div>
          )}

          {/* Tool calls display */}
          {parsedContent.tool_calls && parsedContent.tool_calls.length > 0 && (
            <div className="space-y-2">
              {parsedContent.tool_calls.map((tc: any, i: number) => (
                <div
                  key={i}
                  className="flex items-center gap-2 px-3 py-2 rounded bg-zinc-900/50 border border-zinc-800 w-fit hover:border-zinc-700 transition-colors"
                >
                  <TerminalIcon size={12} className="text-violet-400" />
                  <span className="text-[10px] font-mono text-zinc-400">{tc.name}</span>
                  {tc.arguments && (
                    <span className="text-[9px] text-zinc-500 ml-1">
                      {JSON.stringify(tc.arguments).substring(0, 50)}...
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    // Fallback: Mostrar como texto plano si no es JSON
    return (
      <div className="text-sm text-zinc-200 leading-relaxed mb-8 whitespace-pre-wrap">
        {message.content || "(No content)"}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#0c0c0e]">
      {/* Header */}
      <div className="h-14 flex items-center justify-between px-6 border-b border-zinc-800/50 bg-[#0c0c0e]/80 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded bg-violet-600 flex items-center justify-center">
            <Cpu size={14} className="text-white" />
          </div>
          <span className="font-bold text-zinc-200 tracking-tight text-sm">Axón Agent</span>
        </div>
      </div>

      {/* Messages Container */}
      <div
        ref={chatContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-6 space-y-2 relative scrollbar-hide"
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50">
            <Sparkles size={32} className="text-violet-500" />
            <p className="text-sm font-medium text-zinc-500">Make, test, iterate...</p>
          </div>
        ) : (
          messages.map((m) => (
            <div key={m.id} className="animate-in fade-in-50 slide-in-from-bottom-2">
              {renderMessageContent(m)}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-[#0c0c0e] border-t border-zinc-800/50">
        <form onSubmit={handleSubmit} className="bg-[#161618] border border-zinc-800 rounded-xl p-3 focus-within:border-violet-600/50 transition-all">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e as any);
              }
            }}
            placeholder="Type a message..."
            className="w-full bg-transparent text-zinc-200 text-sm resize-none focus:outline-none min-h-[40px] placeholder-zinc-600"
            rows={1}
          />
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2">
              <Plus size={16} className="text-zinc-500 cursor-pointer hover:text-zinc-400" />
              <div className="px-2 py-1 rounded bg-violet-900/30 border border-violet-700/50 text-[10px] text-violet-400">
                Economy
              </div>
            </div>
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="p-2 rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Send size={16} />
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
