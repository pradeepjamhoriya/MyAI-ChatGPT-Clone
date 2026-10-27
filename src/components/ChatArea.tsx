import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowUp,
  PanelLeft,
  Sparkles,
  Copy,
  Check,
  RotateCcw,
  AlertCircle,
  Code2,
  Cpu,
  BookOpen,
  HelpCircle,
  Database,
} from 'lucide-react';
import { Message, Conversation, HealthInfo } from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';

interface ChatAreaProps {
  conversation: Conversation | null;
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  onSendMessage: (content: string) => Promise<void>;
  onRetryLastMessage: () => void;
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
  health: HealthInfo | null;
  onOpenDiagnostics: () => void;
}

const PROMPT_SUGGESTIONS = [
  {
    icon: HelpCircle,
    title: 'Explain simply',
    prompt: 'Explain the difference between synchronous and asynchronous JavaScript with real-world examples.',
  },
  {
    icon: Code2,
    title: 'Write a script',
    prompt: 'Write a complete Node.js Express route with JWT authentication and MySQL connection pooling.',
  },
  {
    icon: Cpu,
    title: 'Troubleshoot 502',
    prompt: 'What causes a 502 Bad Gateway error when integrating an LLM API into a Node.js backend?',
  },
  {
    icon: BookOpen,
    title: 'Database optimization',
    prompt: 'Show me best practices for indexing MySQL tables with millions of chat messages.',
  },
];

export const ChatArea: React.FC<ChatAreaProps> = ({
  conversation,
  messages,
  isLoading,
  error,
  onSendMessage,
  onRetryLastMessage,
  onToggleSidebar,
  sidebarOpen,
  health,
  onOpenDiagnostics,
}) => {
  const [input, setInput] = useState('');
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Adjust textarea height automatically
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    await onSendMessage(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageId(id);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  return (
    <main className="flex-1 flex flex-col h-full bg-[#212121] relative overflow-hidden">
      {/* Top Bar Header */}
      <header className="h-14 border-b border-[#2C2C2C] bg-[#212121]/90 backdrop-blur-md flex items-center justify-between px-4 z-20 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-lg text-[#A0A0A0] hover:text-white hover:bg-[#2C2C2C] transition-colors cursor-pointer"
            title={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
          >
            <PanelLeft className="w-5 h-5" />
          </button>

          <div className="min-w-0 flex items-center gap-2">
            <h1 className="text-sm font-semibold text-white truncate max-w-[200px] sm:max-w-md">
              {conversation ? conversation.title : 'MyAI'}
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#2A2A2A] text-[#10A37F] border border-[#3A3A3A]">
              <Sparkles className="w-3 h-3" />
              {health?.gemini?.model || 'gemini-flash'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Database status pill */}
          <button
            onClick={onOpenDiagnostics}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-[#282828] hover:bg-[#323232] text-[#A0A0A0] hover:text-white border border-[#353535] transition-colors cursor-pointer"
            title="System & Database Info"
          >
            <Database className="w-3.5 h-3.5 text-[#10A37F]" />
            <span className="hidden md:inline">{health?.database?.engine || 'Database'}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#10A37F]" />
          </button>
        </div>
      </header>

      {/* Main Message Stream or Welcome Screen */}
      <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8 space-y-6">
        {messages.length === 0 ? (
          // Welcome Screen
          <div className="max-w-2xl mx-auto h-full flex flex-col justify-center items-center text-center py-12">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#10A37F] to-emerald-400 flex items-center justify-center text-white mb-6 shadow-lg shadow-emerald-950/20">
              <Sparkles className="w-7 h-7 fill-white/20" />
            </div>

            <h2 className="text-2xl font-semibold text-white mb-2">
              What can I help with today?
            </h2>
            <p className="text-sm text-[#A0A0A0] mb-8 max-w-md">
              Powered by Google Gemini 3.8 with persistent history, MySQL readiness, and secure authentication.
            </p>

            {/* Prompt Suggestion Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full text-left">
              {PROMPT_SUGGESTIONS.map((sugg, idx) => {
                const Icon = sugg.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      setInput(sugg.prompt);
                      textareaRef.current?.focus();
                    }}
                    className="p-3.5 rounded-xl bg-[#262626] hover:bg-[#2D2D2D] border border-[#333333] hover:border-[#444444] text-white transition-all cursor-pointer group shadow-xs"
                  >
                    <div className="flex items-center gap-2 mb-1.5 text-xs font-semibold text-[#10A37F]">
                      <Icon className="w-3.5 h-3.5" />
                      <span>{sugg.title}</span>
                    </div>
                    <p className="text-xs text-[#B4B4B4] line-clamp-2 leading-relaxed">
                      {sugg.prompt}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          // Message List
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map(msg => {
              const isUser = msg.role === 'user';
              const isCopied = copiedMessageId === msg.id;

              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 md:gap-4 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {/* Assistant Avatar */}
                  {!isUser && (
                    <div className="w-8 h-8 rounded-full bg-[#10A37F] flex items-center justify-center text-white shrink-0 shadow-sm mt-0.5">
                      <Sparkles className="w-4 h-4 fill-white/20" />
                    </div>
                  )}

                  {/* Message Bubble */}
                  <div
                    className={`relative group max-w-[85%] md:max-w-[78%] rounded-2xl px-4 py-3 shadow-xs ${
                      isUser
                        ? 'bg-[#2F2F2F] text-white rounded-br-xs'
                        : 'bg-[#262626] text-[#F5F5F5] rounded-bl-xs border border-[#333333]'
                    }`}
                  >
                    {isUser ? (
                      <p className="text-[15px] whitespace-pre-wrap leading-relaxed select-text">
                        {msg.content}
                      </p>
                    ) : (
                      <MarkdownRenderer content={msg.content} />
                    )}

                    {/* Hover copy button & details */}
                    <div className="flex items-center justify-between gap-3 mt-2 pt-1 border-t border-[#383838]/60 text-[11px] text-[#808080]">
                      <span>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <button
                        onClick={() => handleCopyMessage(msg.id, msg.content)}
                        className="flex items-center gap-1 hover:text-[#10A37F] transition-colors cursor-pointer"
                        title="Copy message"
                      >
                        {isCopied ? (
                          <>
                            <Check className="w-3 h-3 text-[#10A37F]" />
                            <span className="text-[#10A37F]">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex gap-3 md:gap-4 justify-start items-center">
                <div className="w-8 h-8 rounded-full bg-[#10A37F] flex items-center justify-center text-white shrink-0 shadow-sm animate-pulse">
                  <Sparkles className="w-4 h-4 fill-white/20" />
                </div>
                <div className="px-4 py-3 rounded-2xl bg-[#262626] border border-[#333333] text-sm text-[#A0A0A0] flex items-center gap-2 shadow-xs">
                  <div className="flex gap-1.5 items-center">
                    <span className="w-2 h-2 rounded-full bg-[#10A37F] animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 rounded-full bg-[#10A37F] animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 rounded-full bg-[#10A37F] animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-xs text-[#CCCCCC]">MyAI is thinking...</span>
                </div>
              </div>
            )}

            {/* Error Banner */}
            {error && (
              <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/60 text-red-200 flex items-start justify-between gap-3 text-xs shadow-md">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-red-300">Request Error</div>
                    <div className="text-red-200/90 mt-0.5 leading-relaxed">{error}</div>
                  </div>
                </div>
                <button
                  onClick={onRetryLastMessage}
                  className="px-2.5 py-1.5 rounded-lg bg-red-900/60 hover:bg-red-800 text-white font-medium flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Retry</span>
                </button>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Composer Input Area */}
      <div className="p-4 md:p-6 bg-[#212121] shrink-0 border-t border-[#2C2C2C]/50">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto relative">
          <div className="flex items-end gap-2 bg-[#2F2F2F] rounded-2xl p-2 pl-4 border border-[#383838] focus-within:border-[#505050] transition-colors shadow-lg shadow-black/20">
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message MyAI..."
              disabled={isLoading}
              className="flex-1 bg-transparent text-white placeholder-[#888888] text-sm resize-none focus:outline-hidden py-1 max-h-[200px] leading-relaxed"
            />

            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                input.trim() && !isLoading
                  ? 'bg-white text-black hover:bg-[#E5E5E5] shadow-xs active:scale-95'
                  : 'bg-[#404040] text-[#707070] cursor-not-allowed'
              }`}
              title="Send message"
            >
              <ArrowUp className="w-4 h-4 font-bold stroke-[2.5]" />
            </button>
          </div>

          <div className="text-[11px] text-[#707070] text-center mt-2.5">
            MyAI can make mistakes. Verify important facts and code before production.
          </div>
        </form>
      </div>
    </main>
  );
};
