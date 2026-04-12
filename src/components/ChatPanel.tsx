"use client";
import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Database, Globe, GitBranch } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type Message = {
  role: 'user' | 'assistant';
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
       // For assistant messages, we send the exact JSON string back if it was successfully parsed
       // Otherwise we just send the content
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

      const chunk = decoder.decode(value);
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
                tool_call_id: data.toolCall.name, // Simplified for prototyping
                name: data.toolCall.name,
                content: JSON.stringify(data.result)
              });

              setMessages(prev => {
                  const newMessages = [...prev];
                  const currentMsg = newMessages[assistantMessageIndex];
                  currentMsg.toolResults = [...(currentMsg.toolResults || []), data.result];
                  return newMessages;
              });

              // Send to terminal view if it's a command
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
            console.error('Error parsing SSE:', e);
          }
        }
      }
    }

    // Auto-correction / Follow-up Loop
    // If the tool results indicate an error or require further processing, we feed it back
    if (turnToolResults.length > 0) {
       const hasError = turnToolResults.some(res => res.content.includes('"error"') || res.content.includes('"exitCode":') && !res.content.includes('"exitCode":0'));

       // For a fully autonomous ReAct loop, we should feed the observations back as "user" or "tool" messages.
       // Here we append a system/tool observation message and trigger the next turn automatically.
       const observationMessage = {
          role: 'user',
          content: `Tool Execution Results:\n${JSON.stringify(turnToolResults, null, 2)}\n\nAnalyze the results. If there are errors, fix them. If the task is incomplete, continue. If finished, output a thought stating completion and empty tool_calls.`
       };

       // Simple safeguard: only auto-loop if there's an error to fix or we just loaded a skill.
       // In a full implementation, you'd loop until LLM outputs empty tool_calls.
       if (hasError || parsedAssistantResponse?.tool_calls?.some((tc:any) => tc.name === 'load_skill')) {
           setMessages(prev => [...prev, {role: 'user', content: "System: Executed tools. Proceeding to next step..."}]);
           await processTurn([observationMessage]);
       }
    }
  };

  const renderMessageContent = (message: Message) => {
    if (message.role === 'user') return <p>{message.content}</p>;

    try {
      const parsed = JSON.parse(message.content);
      return (
        <div className="space-y-4 text-sm text-gray-300">
           <div className="bg-[#18181b] p-3 rounded-md border border-[#27272a]">
              <span className="text-[#8b5cf6] font-semibold mb-1 block">Thought</span>
              {parsed.thought}
           </div>

           {parsed.tool_calls?.map((tc: any, i: number) => (
             <div key={i} className="flex flex-col gap-2">
               <div className="flex items-center gap-2 text-xs bg-[#27272a] px-2 py-1 rounded w-max">
                  {tc.name === 'run_command' && <span className="text-green-400">⚡ Executing</span>}
                  {tc.name === 'write_file' && <span className="text-blue-400">📝 Writing File</span>}
                  {tc.name === 'read_file' && <span className="text-yellow-400">📖 Reading File</span>}
                  {tc.name === 'load_skill' && <span className="text-purple-400">🧠 Loading Skill</span>}
                  <span className="font-mono">{tc.name}</span>
               </div>
               {tc.name === 'write_file' && <div className="text-xs font-mono text-gray-500 pl-2">{tc.arguments.path}</div>}
             </div>
           ))}
        </div>
      );
    } catch {
       // While streaming, it might not be valid JSON yet. Show raw text.
       return <pre className="whitespace-pre-wrap font-mono text-xs text-gray-400 overflow-hidden">{message.content}</pre>;
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#09090b] border-r border-[#27272a]">
      {/* Header */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-[#27272a]">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#8b5cf6]"></div>
          <span className="font-semibold text-gray-200 tracking-wide">LUMINA</span>
        </div>
        <div className="flex items-center gap-2">
           {activeSkills.includes('database_skill') && <Database size={16} className="text-blue-400" />}
           {activeSkills.includes('web_search_skill') && <Globe size={16} className="text-green-400" />}
           {activeSkills.includes('git_skill') && <GitBranch size={16} className="text-orange-400" />}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 space-y-4">
             <div className="w-12 h-12 rounded-xl bg-[#27272a] flex items-center justify-center mb-2">
                <span className="text-2xl">✨</span>
             </div>
             <p className="max-w-[250px]">What would you like to build today?</p>
          </div>
        )}

        {messages.filter(m => m.content && !m.content.startsWith('System:')).map((message, i) => (
          <div key={i} className={cn("flex flex-col", message.role === 'user' ? 'items-end' : 'items-start')}>
            <div className={cn(
              "max-w-[90%] rounded-xl px-4 py-3",
              message.role === 'user'
                ? 'bg-[#8b5cf6] text-white rounded-tr-sm'
                : 'bg-transparent text-gray-200 w-full'
            )}>
              {renderMessageContent(message)}
            </div>
          </div>
        ))}
        {isLoading && messages.length > 0 && messages[messages.length-1].role === 'user' && (
           <div className="flex items-center gap-2 text-gray-500 text-sm px-4">
              <Loader2 className="animate-spin w-4 h-4" />
              <span>Thinking...</span>
           </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-[#27272a]">
        <form onSubmit={handleSubmit} className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Build me a react app..."
            className="w-full bg-[#18181b] border border-[#27272a] text-gray-200 rounded-lg pl-4 pr-12 py-3 focus:outline-none focus:border-[#8b5cf6] focus:ring-1 focus:ring-[#8b5cf6] transition-all"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="absolute right-2 p-2 rounded-md bg-[#8b5cf6] text-white hover:bg-[#7c3aed] disabled:opacity-50 disabled:hover:bg-[#8b5cf6] transition-colors"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </div>
  );
}
