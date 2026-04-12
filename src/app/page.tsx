"use client";
import { useState, useEffect } from 'react';
import ChatPanel from '@/components/ChatPanel';
import { Monitor, Cpu, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';

export default function Home() {
  const [activeSkills, setActiveSkills] = useState<string[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'chat' | 'preview'>('chat');

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

  return (
    <div className="flex flex-col h-screen w-full bg-[#050505] text-[#fafafa] overflow-hidden">
      
      {/* Main Content Area */}
      <div className="flex-1 relative overflow-hidden bg-[#0a0a0a]">

        <div className={cn("absolute inset-0 z-10", activeTab === 'chat' ? 'block' : 'hidden')}>
          <ChatPanel
            onActiveSkillsChange={setActiveSkills}
            onTerminalUpdate={() => {}}
          />
        </div>

        <div className={cn("absolute inset-0 flex-col", activeTab === 'preview' ? 'flex' : 'hidden')}>
          {/* Preview Header */}
          <header className="h-14 border-b border-zinc-800/50 bg-[#0a0a0a]/80 backdrop-blur-md flex items-center justify-between px-4 shrink-0 z-10">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-xs font-medium text-zinc-400">
                <Monitor size={18} className="text-zinc-500" />
                <span className="font-bold tracking-tight uppercase text-[10px]">Preview</span>
              </div>
              <div className="h-4 w-px bg-zinc-800" />
              <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-500">
                {previewUrl ? (
                  <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="hover:text-violet-400 transition-colors flex items-center gap-1">
                    {previewUrl} <ExternalLink size={12} />
                  </a>
                ) : (
                  "Waiting for environment..."
                )}
              </div>
            </div>
          </header>

          {/* Preview Content */}
          <div className="flex-1 relative bg-[#0c0c0e]">
            {previewUrl ? (
              <iframe
                key="preview-iframe"
                src={previewUrl}
                className="w-full h-full border-none bg-white"
                title="Preview"
                sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
              />
            ) : (
              <div key="preview-placeholder" className="w-full h-full p-8 flex items-center justify-center">
                <div className="max-w-md w-full bg-[#161618] border border-zinc-800 rounded-2xl p-6 space-y-4 shadow-2xl">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center text-white font-bold text-2xl">
                    L
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-zinc-200">Lumina Application</h3>
                    <p className="text-sm text-zinc-500">Environment is initializing...</p>
                  </div>
                  <div className="pt-2">
                    <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-violet-600 w-1/2 animate-pulse" />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Bottom Navigation Bar */}
      <nav className="h-20 bg-[#0c0c0e] border-t border-zinc-800/50 flex items-center justify-center px-6 shrink-0 z-30 pb-safe">
        <div className="flex items-center gap-4 bg-[#161618] p-1.5 rounded-2xl border border-zinc-800 shadow-xl">
          <button 
            onClick={() => setActiveTab('chat')}
            className={cn(
              "flex flex-col items-center gap-1 px-8 py-2.5 rounded-xl transition-all duration-300",
              activeTab === 'chat' 
                ? "bg-violet-600 text-white shadow-lg shadow-violet-900/40" 
                : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            <Cpu size={22} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Chat</span>
          </button>
          <button 
            onClick={() => setActiveTab('preview')}
            className={cn(
              "flex flex-col items-center gap-1 px-8 py-2.5 rounded-xl transition-all duration-300",
              activeTab === 'preview' 
                ? "bg-violet-600 text-white shadow-lg shadow-violet-900/40" 
                : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            <Monitor size={22} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Preview</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
