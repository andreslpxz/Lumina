// src/components/ChatPanel.tsx
"use client";
import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Database, Globe, GitBranch, Cpu } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type Message = {
  role: 'user' | 'assistant' | 'system';
  content: string;
  isStreaming?: boolean;
  toolCalls?: any[];
  toolResults?: any[];
};

export default function ChatPanel({
  onActiveSkillsChange,
  onTerminalUpdate
}: {
  onActiveSkillsChange: (skills: string[]) => void;
  onTerminalUpdate: (log: string) => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeSkills, setActiveSkills] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      await processTurn([{ role: 'user', content: userMessage }]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const processTurn = async (newMessages: any[]) => {
    const currentHistory = [...messages.map(m => ({
       role: m.role,
       content: m.content
    })), ...newMessages];

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

    const assistantMessageIndex = messages.length + newMessages.length;
    setMessages(prev => [...prev, { role: 'assistant', content: '', isStreaming: true, toolCalls: [], toolResults: [] }]);

    let rawJsonBuffer = "";
    let parsedAssistantResponse: any = null;
    const turnToolResults: any[] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));

            if (data.type === 'token') {
              rawJsonBuffer += data.content;
              setMessages(prev => {
                const newMessages = [...prev];
                newMessages[assistantMessageIndex].content = rawJsonBuffer;
                return newMessages;
              });
            }
            else if (data.type === 'parsed') {
               parsedAssistantResponse = data.data;
               setMessages(prev => {
                  const newMessages = [...prev];
                  newMessages[assistantMessageIndex].isStreaming = false;
                  newMessages[assistantMessageIndex].content = JSON.stringify(data.data);
                  return newMessages;
               });
            }
            else if (data.type === 'tool_start') {
              setMessages(prev => {
                  const newMessages = [...prev];
                  const currentMsg = newMessages[assistantMessageIndex];
                  currentMsg.toolCalls = [...(currentMsg.toolCalls || []), data.toolCall];
                  return newMessages;
              });
            }
            else if (data.type === 'tool_result') {
               turnToolResults.push({
                 tool_call_id: data.toolCall.name,
                 name: data.toolCall.name,
                 content: JSON.stringify(data.result)
               });

               setMessages(prev => {
                  const newMessages = [...prev];
                  const currentMsg = newMessages[assistantMessageIndex];
                  currentMsg.toolResults = [...(currentMsg.toolResults || []), data.result];
                  return newMessages;
               });

               if (data.toolCall.name === 'run_command') {
                  const log = `$ ${data.toolCall.arguments.command}\n${data.result.stdout || ''}\n${data.result.stderr || ''}`;
                  onTerminalUpdate(log);
               }
            }
            else if (data.type === 'skill_loaded') {
               setActiveSkills(prev => {
                 const newSkills = Array.from(new Set([...prev, data.skill]));
                 onActiveSkillsChange(newSkills);
                 return newSkills;
               });
            }
          } catch (e) {
            // Silently ignore partial JSON parse errors during chunking
          }
        }
      }
    }

    // Auto-Loop Action (ReAct loop)
    if (turnToolResults.length > 0) {
       const hasError = turnToolResults.some(res => res.content.includes('"error"') || (res.content.includes('"exitCode":') && !res.content.includes('"exitCode":0')));

       const observationMessage = {
          role: 'user',
          content: `Tool Execution Results:\n${JSON.stringify(turnToolResults, null, 2)}\n\nAnalyze the results. If there are errors, fix them. If the task is incomplete, continue. If finished, output a thought stating completion and empty tool_calls.`
       };

       if (hasError || parsedAssistantResponse?.tool_calls?.length > 0) {
           setMessages(prev => [...prev, {role: 'system', content: "Executing automated task loop..."}]);
           await processTurn([observationMessage]);
       }
    }
  };

  const renderMessageContent = (message: Message) => {
    if (message.role === 'user') return <p>{message.content}</p>;
    if (message.role === 'system') return <p className="text-xs text-gray-500 italic flex items-center gap-2"><Cpu size={12}/> {message.content}</p>;

    // Regex para extraer el pensamiento en vivo mientras Groq hace streaming
    const extractThought = (raw: string) => {
      const match = raw.match(/"thought"\s*:\s*"([^]*?)(?:",|$)/);
      return match ? match[1] : raw.replace(/[{}"\\]/g, ''); 
    };

    if (message.isStreaming) {
      return (
        <div className="space-y-4 text-sm text-gray-300 w-full animate-pulse">
           <div className="bg-[#18181b] p-3 rounded-md border border-[#27272a]">
              <span className="text-[#8b5cf6] font-semibold mb-1 block flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" /> Thinking
              </span>
              <span className="opacity-80">{extractThought(message.content)}</span>
           </div>
        </div>
      );
    }

    try {
      const parsed = JSON.parse(message.content);
      return (
        <div className="space-y-4 text-sm text-gray-300 w-full">
           <div className="bg-[#18181b] p-3 rounded-md border border-[#27272a] shadow-sm">
              <span className="text-[#8b5cf6] font-semibold mb-1 block">Thought</span>
              {parsed.thought || "Processing complete."}
           </div>

           {parsed.tool_calls?.map((tc: any, i: number) => (
             <div key={i} className="flex flex-col gap-2">
               <div className="flex items-center gap-2 text-xs bg-[#27272a] px-3 py-1.5 rounded-md border border-zinc-700 w-max">
                  {tc.name === 'run_command' && <span className="text-emerald-400">⚡ Executing</span>}
                  {tc.name === 'write_file' && <span className="text-sky-400">📝 Writing</span>}
                  {tc.name === 'read_file' && <span className="text-amber-400">📖 Reading</span>}
                  {tc.name === 'load_skill' && <span className="text-[#8b5cf6]">🧠 Loading</span>}
                  <span className="font-mono">{tc.name}</span>
               </div>
               {tc.name === 'write_file' && <div className="text-[11px] font-mono text-gray-500 pl-2 opacity-80">{'->'} {tc.arguments.path}</div>}
             </div>
           ))}
        </div>
      );
    } catch {
       return <pre className="whitespace-pre-wrap font-mono text-xs text-gray-400 overflow-hidden">{message.content}</pre>;
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#09090b] border-r border-[#27272a]">
      {/* Header */}
      <div className="h-14 flex items-center justify-between px-5 border-b border-[#27272a] shrink-0 bg-[#09090b]/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-[#8b5cf6] shadow-[0_0_8px_rgba(139,92,246,0.6)]"></div>
          <span className="font-semibold text-gray-200 tracking-wider text-sm">LUMINA</span>
        </div>
        <div className="flex items-center gap-3">
           {activeSkills.includes('database_skill') && <Database size={15} className="text-blue-400" />}
           {activeSkills.includes('web_search_skill') && <Globe size={15} className="text-green-400" />}
           {activeSkills.includes('git_skill') && <GitBranch size={15} className="text-orange-400" />}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6 scroll-smooth">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 space-y-4">
             <div className="w-12 h-12 rounded-xl bg-[#18181b] border border-[#27272a] flex items-center justify-center mb-2 shadow-inner">
                <span className="text-2xl">✨</span>
             </div>
             <p className="max-w-[250px] text-sm">What would you like to build today?</p>
          </div>
        )}

        {messages.filter(m => m.content).map((message, i) => (
          <div key={i} className={cn("flex flex-col w-full", message.role === 'user' ? 'items-end' : 'items-start')}>
            <div className={cn(
              "rounded-xl",
              message.role === 'user'
                ? 'max-w-[85%] bg-[#8b5cf6] text-white px-4 py-2.5 shadow-md'
                : 'w-full bg-transparent text-gray-200'
            )}>
              {renderMessageContent(message)}
            </div>
          </div>
        ))}
        {isLoading && messages.length > 0 && messages[messages.length-1].role === 'user' && (
           <div className="flex items-center gap-2 text-[#8b5cf6] text-sm px-1 py-2">
              <Loader2 className="animate-spin w-4 h-4" />
              <span className="font-medium">Initializing agent...</span>
           </div>
        )}
        <div ref={messagesEndRef} className="h-1" />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-[#27272a] bg-[#09090b] shrink-0">
        <form onSubmit={handleSubmit} className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Deploy a web app..."
            className="w-full bg-[#18181b] border border-[#27272a] text-gray-200 rounded-lg pl-4 pr-12 py-3.5 focus:outline-none focus:border-[#8b5cf6] focus:ring-1 focus:ring-[#8b5cf6] transition-all shadow-inner text-sm"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="absolute right-2 p-2 rounded-md bg-[#8b5cf6] text-white hover:bg-[#7c3aed] disabled:opacity-40 disabled:hover:bg-[#8b5cf6] transition-all"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </div>
  );
}
