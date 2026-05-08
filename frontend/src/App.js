import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AuthPage from './components/AuthPage';
import Sidebar from './components/Sidebar';
import ChatPanel from './components/ChatPanel';
import { Loader2 } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

function MainApp() {
  const { user, loading } = useAuth();
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
    try {
      const { data } = await axios.get(`${API}/api/chats/${chatId}`, { withCredentials: true });
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
  }, []);

  // Create new chat
  const createChat = async () => {
    try {
      const { data } = await axios.post(`${API}/api/chats`, { title: 'New Chat' }, { withCredentials: true });
      setChats(prev => [data, ...prev]);
      setActiveChat(data._id);
      setMessages([]);
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
      <div className="flex-1 flex flex-col overflow-hidden">
        <ChatPanel
          chatId={activeChat}
          messages={messages}
          setMessages={setMessages}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />
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
