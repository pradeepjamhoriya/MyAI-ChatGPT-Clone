import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatArea } from './components/ChatArea';
import { AuthModal } from './components/AuthModal';
import { DiagnosticsModal } from './components/DiagnosticsModal';
import { User, Conversation, Message, HealthInfo } from './types';
import { api, getStoredToken } from './services/api';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [diagnosticsModalOpen, setDiagnosticsModalOpen] = useState(false);
  const [health, setHealth] = useState<HealthInfo | null>(null);

  // Refresh backend health info
  const loadHealth = useCallback(async () => {
    try {
      const data = await api.getHealth();
      setHealth(data);
    } catch (err) {
      console.warn('Failed to fetch health info:', err);
    }
  }, []);

  // Load user conversations
  const loadConversations = useCallback(async () => {
    try {
      const res = await api.listConversations();
      if (res.success) {
        setConversations(res.conversations);
      }
    } catch (err) {
      console.warn('Could not load conversations:', err);
    }
  }, []);

  // Check auth status on mount
  useEffect(() => {
    loadHealth();

    const checkAuth = async () => {
      const token = getStoredToken();
      if (token) {
        try {
          const res = await api.getMe();
          if (res.success && res.user) {
            setCurrentUser(res.user);
            await loadConversations();
          }
        } catch (err) {
          console.warn('Session expired or invalid.');
        }
      }
    };

    checkAuth();
  }, [loadHealth, loadConversations]);

  // Global Keyboard shortcuts (Ctrl+K for New Chat)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        handleNewChat();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Load selected conversation
  const handleSelectConversation = async (id: string) => {
    if (id === activeConversationId) return;
    setError(null);
    setActiveConversationId(id);
    setIsLoading(true);

    try {
      const res = await api.getConversation(id);
      if (res.success) {
        setMessages(res.messages);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load conversation.');
    } finally {
      setIsLoading(false);
    }
  };

  // Start a fresh new chat
  const handleNewChat = () => {
    setActiveConversationId(null);
    setMessages([]);
    setError(null);
  };

  // Send message
  const handleSendMessage = async (content: string) => {
    setError(null);

    const tempUserMessage: Message = {
      id: `temp-${Date.now()}`,
      conversation_id: activeConversationId || '',
      role: 'user',
      content,
      created_at: new Date().toISOString(),
    };

    // Optimistically show user message turn
    setMessages(prev => [...prev, tempUserMessage]);
    setIsLoading(true);

    try {
      // Build history for the chat endpoint
      const historyToSend = [...messages, tempUserMessage].map(m => ({
        role: m.role,
        content: m.content,
      }));

      const response = await api.sendMessage(historyToSend, activeConversationId || undefined);

      if (response.success) {
        const assistantMsg: Message = {
          id: response.messageId || `msg-${Date.now()}`,
          conversation_id: response.conversationId || '',
          role: 'assistant',
          content: response.reply,
          model: response.model,
          created_at: new Date().toISOString(),
        };

        setMessages(prev => [...prev, assistantMsg]);

        // If a new conversation was created on the server, update active state and list
        if (response.conversationId && response.conversationId !== activeConversationId) {
          setActiveConversationId(response.conversationId);
        }

        // If user is logged in, refresh conversation titles in sidebar
        if (currentUser) {
          loadConversations();
        }
      }
    } catch (err: any) {
      console.error('Chat error:', err);
      setError(err?.message || 'Failed to generate response. Please retry.');
    } finally {
      setIsLoading(false);
    }
  };

  // Retry last failed prompt
  const handleRetryLastMessage = () => {
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
    if (lastUserMessage) {
      // Remove trailing assistant error message if present
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last && last.role === 'assistant') {
          return prev.slice(0, -1);
        }
        return prev;
      });
      handleSendMessage(lastUserMessage.content);
    }
  };

  // Rename conversation
  const handleRenameConversation = async (id: string, newTitle: string) => {
    try {
      const res = await api.renameConversation(id, newTitle);
      if (res.success) {
        setConversations(prev =>
          prev.map(c => (c.id === id ? { ...c, title: newTitle } : c))
        );
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to rename conversation.');
    }
  };

  // Delete conversation
  const handleDeleteConversation = async (id: string) => {
    try {
      const res = await api.deleteConversation(id);
      if (res.success) {
        setConversations(prev => prev.filter(c => c.id !== id));
        if (activeConversationId === id) {
          handleNewChat();
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to delete conversation.');
    }
  };

  // Auth actions
  const handleLogin = async (email: string, pass: string) => {
    const res = await api.login(email, pass);
    setCurrentUser(res.user);
    await loadConversations();
  };

  const handleSignup = async (email: string, pass: string, name?: string) => {
    const res = await api.signup(email, pass, name);
    setCurrentUser(res.user);
    await loadConversations();
  };

  const handleDemoLogin = async () => {
    const res = await api.loginDemo();
    setCurrentUser(res.user);
    await loadConversations();
  };

  const handleLogout = async () => {
    await api.logout();
    setCurrentUser(null);
    setConversations([]);
    handleNewChat();
  };

  const activeConversation = conversations.find(c => c.id === activeConversationId) || null;

  return (
    <div className="flex h-screen w-screen bg-[#212121] overflow-hidden select-none">
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={handleSelectConversation}
        onNewChat={handleNewChat}
        onRenameConversation={handleRenameConversation}
        onDeleteConversation={handleDeleteConversation}
        currentUser={currentUser}
        onOpenAuth={() => setAuthModalOpen(true)}
        onLogout={handleLogout}
        onOpenDiagnostics={() => setDiagnosticsModalOpen(true)}
        health={health}
      />

      {/* Main Chat Interface */}
      <ChatArea
        conversation={activeConversation}
        messages={messages}
        isLoading={isLoading}
        error={error}
        onSendMessage={handleSendMessage}
        onRetryLastMessage={handleRetryLastMessage}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        sidebarOpen={sidebarOpen}
        health={health}
        onOpenDiagnostics={() => setDiagnosticsModalOpen(true)}
      />

      {/* Modals */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onLogin={handleLogin}
        onSignup={handleSignup}
        onDemoLogin={handleDemoLogin}
      />

      <DiagnosticsModal
        isOpen={diagnosticsModalOpen}
        onClose={() => setDiagnosticsModalOpen(false)}
        health={health}
        onRefreshHealth={loadHealth}
      />
    </div>
  );
}
