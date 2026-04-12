"use client";
import { useState, useEffect, useRef } from 'react';
import ChatPanel from '@/components/ChatPanel';
import { Terminal } from 'lucide-react';

export default function Home() {
  const [activeSkills, setActiveSkills] = useState<string[]>([]);
  const [terminalLogs, setTerminalLogs] = useState<string>('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Poll for preview URL
  useEffect(() => {
    const interval = setInterval(async () => {
       try {
         const res = await fetch('/api/preview-url');
         const data = await res.json();
         if (data.url && data.url !== previewUrl) {
            setPreviewUrl(data.url);
         }
       } catch (e) {
         // silent ignore
       }
    }, 2000);
    return () => clearInterval(interval);
  }, [previewUrl]);

  const handleTerminalUpdate = (log: string) => {
     setTerminalLogs(prev => prev + '\n' + log);
  };

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [terminalLogs]);

  return (
    <main className="flex h-screen w-full bg-[#000000] text-gray-200 overflow-hidden">
      {/* Left Panel: Chat */}
      <div className="w-[450px] min-w-[400px] h-full flex-shrink-0">
         <ChatPanel
           onActiveSkillsChange={setActiveSkills}
           onTerminalUpdate={handleTerminalUpdate}
         />
      </div>

      {/* Right Panel: Workspace */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">

        {/* Preview Area */}
        <div className="flex-1 border-b border-[#27272a] bg-[#18181b] relative">
           <div className="absolute top-0 w-full h-8 bg-[#09090b] border-b border-[#27272a] flex items-center px-4">
              <span className="text-xs text-gray-400 font-mono">
                 {previewUrl ? previewUrl : 'Preview (Waiting for port...)'}
              </span>
           </div>
           <div className="w-full h-full pt-8">
              {previewUrl ? (
                <iframe
                  src={previewUrl}
                  className="w-full h-full border-none bg-white"
                  title="Preview"
                  sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-600 font-mono text-sm">
                   [ No active preview ]
                </div>
              )}
           </div>
        </div>

        {/* Terminal Area */}
        <div className="h-[30%] min-h-[200px] bg-[#09090b] flex flex-col">
           <div className="h-8 border-b border-[#27272a] flex items-center px-4 gap-2 text-gray-400">
              <Terminal size={14} />
              <span className="text-xs font-mono uppercase tracking-wider">Terminal</span>
           </div>
           <div className="flex-1 p-4 overflow-y-auto font-mono text-xs text-gray-300 leading-relaxed whitespace-pre-wrap">
              {terminalLogs || <span className="text-gray-600">Waiting for commands...</span>}
              <div ref={terminalEndRef} />
           </div>
        </div>

      </div>
    </main>
  );
}
