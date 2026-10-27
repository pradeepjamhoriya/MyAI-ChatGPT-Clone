import React, { useState } from 'react';
import { X, Lock, Mail, User, AlertCircle, Sparkles, Eye, EyeOff } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (email: string, pass: string) => Promise<void>;
  onSignup: (email: string, pass: string, name?: string) => Promise<void>;
  onDemoLogin: () => Promise<void>;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLogin,
  onSignup,
  onDemoLogin,
}) => {
  const [tab, setTab] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (tab === 'login') {
        await onLogin(email.trim(), password);
      } else {
        await onSignup(email.trim(), password, name.trim());
      }
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = async () => {
    setError(null);
    setLoading(true);
    try {
      await onDemoLogin();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div
        className="w-full max-w-md bg-[#1E1E1E] border border-[#333333] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative p-6 pb-4 border-b border-[#2C2C2C] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#10A37F] flex items-center justify-center text-white shadow-sm">
              <Sparkles className="w-4 h-4 fill-white/20" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">
                {tab === 'login' ? 'Welcome Back to MyAI' : 'Create your MyAI Account'}
              </h2>
              <p className="text-xs text-[#8E8E8E]">Persistent chat history & Gemini AI</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#888888] hover:text-white hover:bg-[#2C2C2C] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-[#2C2C2C] bg-[#171717] p-1">
          <button
            type="button"
            onClick={() => { setTab('login'); setError(null); }}
            className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors ${
              tab === 'login' ? 'bg-[#292929] text-white shadow-xs' : 'text-[#8E8E8E] hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setTab('signup'); setError(null); }}
            className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors ${
              tab === 'signup' ? 'bg-[#292929] text-white shadow-xs' : 'text-[#8E8E8E] hover:text-white'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-950/50 border border-red-800 text-red-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {tab === 'signup' && (
              <div>
                <label className="block text-xs font-medium text-[#A0A0A0] mb-1">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#707070] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Jane Doe"
                    className="w-full bg-[#141414] text-white text-xs pl-9 pr-3 py-2.5 rounded-xl border border-[#303030] focus:outline-hidden focus:border-[#10A37F]"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-[#A0A0A0] mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#707070] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-[#141414] text-white text-xs pl-9 pr-3 py-2.5 rounded-xl border border-[#303030] focus:outline-hidden focus:border-[#10A37F]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#A0A0A0] mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#707070] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full bg-[#141414] text-white text-xs pl-9 pr-9 py-2.5 rounded-xl border border-[#303030] focus:outline-hidden focus:border-[#10A37F]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#707070] hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-[#10A37F] hover:bg-[#0E8E6D] text-white text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer shadow-md mt-2 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : tab === 'login' ? (
                'Sign In'
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#303030]" />
            </div>
            <div className="relative flex justify-center text-[11px] uppercase">
              <span className="bg-[#1E1E1E] px-2 text-[#707070]">Or instant preview</span>
            </div>
          </div>

          {/* Quick Demo Test Access */}
          <button
            type="button"
            onClick={handleDemo}
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl bg-[#282828] hover:bg-[#323232] text-[#E0E0E0] hover:text-white text-xs font-medium transition-colors border border-[#383838] flex items-center justify-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#10A37F]" />
            <span>Continue as Demo Explorer (1-Click)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
