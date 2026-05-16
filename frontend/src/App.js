import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AuthPage from './components/AuthPage';
import Sidebar from './components/Sidebar';
import ChatPanel from './components/ChatPanel';
import SkillsPanel from './components/SkillsPanel';
import SettingsPanel from './components/SettingsPanel';
import { Loader2 } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

function MainApp() {
  const { user, loading, getAccessToken } = useAuth();
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [skillsPanelOpen, setSkillsPanelOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [skillInput, setSkillInput] = useState('');

  const authHeaders = useCallback(() => {
    const token = getAccessToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, [getAccessToken]);

  // Load chats
  const loadChats = useCallback(async () => {
    try {
      const resp = await fetch(`${API}/api/chats`, { headers: authHeaders() });
      if (resp.ok) {
        const data = await resp.json();
        setChats(data);
      }
    } catch {}
  }, [authHeaders]);

  useEffect(() => {
    if (user) loadChats();
  }, [user, loadChats]);

  // Load chat messages
  const loadChat = useCallback(async (chatId) => {
    setActiveChat(chatId);
    setMessages([]);
    setSettingsOpen(false); // Close settings when switching chat
    try {
      const resp = await fetch(`${API}/api/chats/${chatId}`, { headers: authHeaders() });
      if (!resp.ok) return;
      const data = await resp.json();
      const displayMsgs = [];
      for (const m of (data.messages || [])) {
        if (m.role === 'user' && !m.content.startsWith('Tool Result (')) {
          displayMsgs.push({ id: Math.random(), role: 'user', content: m.content });
        } else if (m.role === 'assistant') {
          let parsed = null;
          try { parsed = JSON.parse(m.content); } catch {}
          displayMsgs.push({
            id: Math.random(),
            role: 'assistant',
            content: m.content,
            parsedData: parsed,
            isStreaming: false,
            toolCalls: [],
          });
        }
      }
      setMessages(displayMsgs);
    } catch {}
  }, [authHeaders]);

  // Create new chat
  const createChat = async () => {
    try {
      const resp = await fetch(`${API}/api/chats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ title: 'New Chat' }),
      });
      if (!resp.ok) return;
      const data = await resp.json();
      setChats(prev => [data, ...prev]);
      setActiveChat(data.id);
      setMessages([]);
      setSidebarOpen(false);
      setSettingsOpen(false);
    } catch {}
  };

  // Delete chat
  const deleteChat = async (chatId) => {
    try {
      await fetch(`${API}/api/chats/${chatId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      setChats(prev => prev.filter(c => c.id !== chatId));
      if (activeChat === chatId) {
        setActiveChat(null);
        setMessages([]);
      }
    } catch {}
  };

  // Refresh chat list when messages change (to update titles)
  useEffect(() => {
    if (messages.length > 0) {
      const timer = setTimeout(() => loadChats(), 1000);
      return () => clearTimeout(timer);
    }
  }, [messages.length, loadChats]);

  if (loading) {
    return (
      <div className="h-screen w-full bg-bg flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <AuthPage />;

  return (
    <div className="w-full flex overflow-hidden bg-bg text-zinc-50" data-testid="main-app" style={{ height: '100dvh' }}>
      {/* Sidebar */}
      <Sidebar
        chats={chats}
        activeChat={activeChat}
        onSelectChat={loadChat}
        onNewChat={createChat}
        onDeleteChat={deleteChat}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onOpenSkills={() => setSkillsPanelOpen(true)}
        onOpenSettings={() => {
          setSettingsOpen(true);
          setSidebarOpen(false);
        }}
      />

      {/* Main Content */}
      <div className="flex-1 flex min-h-0">
        <div className="flex-1 flex flex-col min-h-0">
          <ChatPanel
            chatId={activeChat}
            messages={messages}
            setMessages={setMessages}
            onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
            onOpenSkills={() => setSkillsPanelOpen(true)}
            skillInput={skillInput}
            onSkillInputUsed={() => setSkillInput('')}
          />
        </div>

        {/* Settings Panel (replacing preview when open) */}
        {settingsOpen ? (
          <SettingsPanel
            isOpen={settingsOpen}
            onClose={() => setSettingsOpen(false)}
          />
        ) : (
          <div className="hidden lg:flex flex-1 bg-zinc-900 border-l border-zinc-800 items-center justify-center text-zinc-600">
             {/* This space is usually the PreviewPanel */}
             <div className="text-center">
                <p className="text-sm">Vista Previa / Skills</p>
                <p className="text-[10px]">Abre ajustes para configurar el agente</p>
             </div>
          </div>
        )}
      </div>

      {/* Skills Panel (Modal-like) */}
      <SkillsPanel
        isOpen={skillsPanelOpen}
        onClose={() => setSkillsPanelOpen(false)}
        onUseSkill={(skill) => {
          setSkillInput(`@${skill.slug} `);
          setSkillsPanelOpen(false);
        }}
      />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

export default App;
