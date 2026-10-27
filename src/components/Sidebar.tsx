import React, { useState, useMemo } from 'react';
import {
  MessageSquare,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Search,
  LogOut,
  User as UserIcon,
  Activity,
  Sparkles,
  ChevronLeft,
} from 'lucide-react';
import { Conversation, User, HealthInfo } from '../types';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onRenameConversation: (id: string, newTitle: string) => Promise<void>;
  onDeleteConversation: (id: string) => Promise<void>;
  currentUser: User | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  onOpenDiagnostics: () => void;
  health: HealthInfo | null;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onToggle,
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewChat,
  onRenameConversation,
  onDeleteConversation,
  currentUser,
  onOpenAuth,
  onLogout,
  onOpenDiagnostics,
  health,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Filter conversations by search
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const query = searchQuery.toLowerCase();
    return conversations.filter(c => c.title.toLowerCase().includes(query));
  }, [conversations, searchQuery]);

  // Group conversations chronologically like ChatGPT
  const groupedConversations = useMemo(() => {
    const groups: { [key: string]: Conversation[] } = {
      Today: [],
      Yesterday: [],
      'Previous 7 Days': [],
      Older: [],
    };

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterday = today - 86400000;
    const sevenDaysAgo = today - 7 * 86400000;

    for (const conv of filteredConversations) {
      const convTime = new Date(conv.updated_at || conv.created_at).getTime();
      if (convTime >= today) {
        groups.Today.push(conv);
      } else if (convTime >= yesterday) {
        groups.Yesterday.push(conv);
      } else if (convTime >= sevenDaysAgo) {
        groups['Previous 7 Days'].push(conv);
      } else {
        groups.Older.push(conv);
      }
    }

    return Object.entries(groups).filter(([_, list]) => list.length > 0);
  }, [filteredConversations]);

  const handleStartEdit = (conv: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(conv.id);
    setEditTitle(conv.title);
  };

  const handleSaveEdit = async (convId: string, e?: React.MouseEvent | React.FormEvent) => {
    if (e) e.stopPropagation();
    if (editTitle.trim()) {
      await onRenameConversation(convId, editTitle.trim());
    }
    setEditingId(null);
  };

  const handleCancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
  };

  const handleDeleteClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingId(id);
  };

  const handleConfirmDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await onDeleteConversation(id);
    setDeletingId(null);
  };

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingId(null);
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 md:hidden backdrop-blur-xs"
          onClick={onToggle}
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 flex flex-col w-[260px] bg-[#171717] border-r border-[#262626] transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0 md:w-0 md:overflow-hidden md:border-none'
        }`}
      >
        {/* Top Header: Logo & New Chat */}
        <div className="p-3.5 space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2 font-semibold text-white tracking-wide">
              <div className="w-7 h-7 rounded-lg bg-[#10A37F] flex items-center justify-center text-white shadow-sm">
                <Sparkles className="w-4 h-4 fill-white/20" />
              </div>
              <span className="text-base font-medium">MyAI</span>
              <span className="text-[10px] font-mono uppercase bg-[#282828] text-[#10A37F] px-1.5 py-0.5 rounded border border-[#383838]">
                {health?.gemini?.model || 'Gemini Flash'}
              </span>
            </div>

            <button
              onClick={onToggle}
              className="md:hidden p-1.5 rounded-lg text-[#A0A0A0] hover:text-white hover:bg-[#282828]"
              title="Close sidebar"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>

          {/* New Chat Button */}
          <button
            onClick={onNewChat}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[#212121] hover:bg-[#2A2A2A] text-white border border-[#333333] transition-all cursor-pointer group shadow-xs"
          >
            <div className="flex items-center gap-2.5">
              <Plus className="w-4 h-4 text-[#10A37F] group-hover:scale-110 transition-transform" />
              <span className="text-sm font-medium">New chat</span>
            </div>
            <span className="text-[11px] text-[#707070] font-mono group-hover:text-[#A0A0A0]">Ctrl+K</span>
          </button>

          {/* Search Bar */}
          {conversations.length > 3 && (
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#707070] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search chats..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-[#202020] text-xs text-white pl-8 pr-3 py-1.5 rounded-lg border border-[#303030] focus:outline-hidden focus:border-[#10A37F] placeholder-[#666666]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#707070] hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto px-2 py-1 space-y-4">
          {conversations.length === 0 ? (
            <div className="px-3 py-8 text-center text-xs text-[#707070]">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 text-[#404040]" />
              <p>No recent conversations.</p>
              <p className="mt-1 text-[11px]">Start a chat to keep history!</p>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="px-3 py-6 text-center text-xs text-[#707070]">
              No chats matching "{searchQuery}"
            </div>
          ) : (
            groupedConversations.map(([groupLabel, list]) => (
              <div key={groupLabel} className="space-y-1">
                <div className="px-3 py-1 text-[11px] font-semibold text-[#666666] tracking-wider uppercase">
                  {groupLabel}
                </div>
                {list.map(conv => {
                  const isActive = conv.id === activeConversationId;
                  const isEditing = conv.id === editingId;
                  const isDeleting = conv.id === deletingId;

                  return (
                    <div
                      key={conv.id}
                      onClick={() => !isEditing && !isDeleting && onSelectConversation(conv.id)}
                      className={`group relative flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors cursor-pointer select-none ${
                        isActive
                          ? 'bg-[#262626] text-white font-medium shadow-xs'
                          : 'text-[#C5C5C5] hover:bg-[#202020] hover:text-white'
                      }`}
                    >
                      {/* Left: icon & title or input */}
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <MessageSquare
                          className={`w-3.5 h-3.5 shrink-0 ${
                            isActive ? 'text-[#10A37F]' : 'text-[#707070] group-hover:text-[#A0A0A0]'
                          }`}
                        />

                        {isEditing ? (
                          <div className="flex items-center gap-1 w-full" onClick={e => e.stopPropagation()}>
                            <input
                              type="text"
                              value={editTitle}
                              onChange={e => setEditTitle(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') handleSaveEdit(conv.id, e);
                                if (e.key === 'Escape') handleCancelEdit(e as any);
                              }}
                              autoFocus
                              className="w-full bg-[#181818] text-white px-2 py-0.5 rounded border border-[#10A37F] focus:outline-hidden text-xs"
                            />
                            <button
                              onClick={e => handleSaveEdit(conv.id, e)}
                              className="p-1 hover:text-[#10A37F] text-[#A0A0A0]"
                              title="Save"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="p-1 hover:text-red-400 text-[#A0A0A0]"
                              title="Cancel"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : isDeleting ? (
                          <div className="flex items-center justify-between w-full" onClick={e => e.stopPropagation()}>
                            <span className="text-red-400 font-medium">Delete chat?</span>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={e => handleConfirmDelete(conv.id, e)}
                                className="px-2 py-0.5 rounded bg-red-600/80 hover:bg-red-600 text-white text-[11px]"
                              >
                                Delete
                              </button>
                              <button
                                onClick={handleCancelDelete}
                                className="p-1 text-[#A0A0A0] hover:text-white"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <span className="truncate" title={conv.title}>
                            {conv.title}
                          </span>
                        )}
                      </div>

                      {/* Right action buttons on hover */}
                      {!isEditing && !isDeleting && (
                        <div
                          className={`flex items-center gap-1 shrink-0 ${
                            isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                          } transition-opacity ml-1`}
                        >
                          <button
                            onClick={e => handleStartEdit(conv, e)}
                            className="p-1 rounded hover:bg-[#333333] text-[#808080] hover:text-[#E0E0E0]"
                            title="Rename"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={e => handleDeleteClick(conv.id, e)}
                            className="p-1 rounded hover:bg-[#333333] text-[#808080] hover:text-red-400"
                            title="Delete"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer Area: Diagnostics, Status, and User Profile */}
        <div className="p-3 border-t border-[#262626] bg-[#141414] space-y-2">
          {/* System Diagnostics Trigger */}
          <button
            onClick={onOpenDiagnostics}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs bg-[#1C1C1C] hover:bg-[#242424] text-[#A0A0A0] hover:text-white transition-colors cursor-pointer border border-[#2B2B2B]"
          >
            <div className="flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-[#10A37F]" />
              <span>System & Tests</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#10A37F] animate-pulse" />
              <span className="text-[10px] text-[#777777] font-mono">Ready</span>
            </div>
          </button>

          {/* User Account / Profile button */}
          {currentUser ? (
            <div className="flex items-center justify-between p-2 rounded-xl bg-[#1C1C1C] border border-[#2B2B2B]">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#10A37F] to-emerald-400 flex items-center justify-center text-white font-bold text-xs uppercase shadow-xs">
                  {currentUser.name ? currentUser.name[0] : currentUser.email[0]}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-medium text-white truncate max-w-[130px]">
                    {currentUser.name || 'User'}
                  </div>
                  <div className="text-[11px] text-[#808080] truncate max-w-[130px]">
                    {currentUser.email}
                  </div>
                </div>
              </div>
              <button
                onClick={onLogout}
                className="p-1.5 rounded-lg text-[#888888] hover:text-red-400 hover:bg-[#282828] transition-colors"
                title="Log out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-[#10A37F] hover:bg-[#0E8E6D] text-white text-xs font-medium transition-colors shadow-sm cursor-pointer"
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span>Sign in / Create Account</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
};
