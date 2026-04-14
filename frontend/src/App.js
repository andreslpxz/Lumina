import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AuthPage from './components/AuthPage';
import Sidebar from './components/Sidebar';
import ChatPanel from './components/ChatPanel';
import PreviewPanel from './components/PreviewPanel';
import { Loader2, Monitor, MessageSquare } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

function MainApp() {
  const { user, loading } = useAuth();
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('chat'); // mobile: 'chat' | 'preview'

  // Load chats
  const loadChats = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/api/chats`, { withCredentials: true });
      setChats(data);
    } catch {}
  }, []);

  useEffect(() => {
    if (user) loadChats();
  }, [user, loadChats]);

  // Load chat messages
  const loadChat = useCallback(async (chatId) => {
    setActiveChat(chatId);
    setMessages([]);
    setPreviewUrl(null);
    try {
      const { data } = await axios.get(`${API}/api/chats/${chatId}`, { withCredentials: true });
      // Convert stored messages to display format
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
      if (data.preview_url) setPreviewUrl(data.preview_url);
    } catch {}
  }, []);

  // Create new chat
  const createChat = async () => {
    try {
      const { data } = await axios.post(`${API}/api/chats`, { title: 'New Chat' }, { withCredentials: true });
      setChats(prev => [data, ...prev]);
      setActiveChat(data._id);
      setMessages([]);
      setPreviewUrl(null);
      setSidebarOpen(false);
    } catch {}
  };

  // Delete chat
  const deleteChat = async (chatId) => {
    try {
      await axios.delete(`${API}/api/chats/${chatId}`, { withCredentials: true });
      setChats(prev => prev.filter(c => c._id !== chatId));
      if (activeChat === chatId) {
        setActiveChat(null);
        setMessages([]);
        setPreviewUrl(null);
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
    <div className="h-screen w-full flex overflow-hidden bg-bg text-zinc-50" data-testid="main-app">
      {/* Sidebar */}
      <Sidebar
        chats={chats}
        activeChat={activeChat}
        onSelectChat={loadChat}
        onNewChat={createChat}
        onDeleteChat={deleteChat}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Chat Panel */}
        <div className={`flex-1 lg:max-w-lg xl:max-w-xl lg:border-r lg:border-zinc-800 ${activeTab === 'chat' ? '' : 'hidden lg:flex'} flex flex-col pb-16 lg:pb-0`}>
          <ChatPanel
            chatId={activeChat}
            messages={messages}
            setMessages={setMessages}
            onPreviewUrl={setPreviewUrl}
            onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          />
        </div>

        {/* Preview Panel */}
        <div className={`flex-1 ${activeTab === 'preview' ? '' : 'hidden lg:flex'} flex flex-col pb-16 lg:pb-0`}>
          <PreviewPanel
            previewUrl={previewUrl}
            isVisible={true}
            onClose={() => setActiveTab('chat')}
          />
        </div>
      </div>

      {/* Mobile Bottom Tab Bar */}
      <div className="fixed bottom-0 left-0 right-0 h-16 bg-bg border-t border-zinc-800 flex items-center justify-center gap-4 lg:hidden z-50 pb-safe" style={{pointerEvents: 'auto'}}>
        <button
          data-testid="tab-chat-btn"
          onClick={() => setActiveTab('chat')}
          className={`flex flex-col items-center gap-1 px-8 py-2 rounded-md transition-all relative z-50 ${
            activeTab === 'chat'
              ? 'bg-primary text-white'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <MessageSquare size={20} />
          <span className="text-[10px] font-medium uppercase tracking-widest">Chat</span>
        </button>
        <button
          data-testid="tab-preview-btn"
          onClick={() => setActiveTab('preview')}
          className={`flex flex-col items-center gap-1 px-8 py-2 rounded-md transition-all relative z-50 ${
            activeTab === 'preview'
              ? 'bg-primary text-white'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Monitor size={20} />
          <span className="text-[10px] font-medium uppercase tracking-widest">Preview</span>
        </button>
      </div>
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
