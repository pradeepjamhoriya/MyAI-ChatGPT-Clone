import { User, Conversation, Message, HealthInfo, TestSuiteResponse } from '../types';

const TOKEN_KEY = 'myai_auth_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
    headers.set('x-session-token', token);
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
    credentials: 'include',
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data?.error || `Request failed with status ${response.status}`;
    throw new Error(errorMsg);
  }

  return data as T;
}

export const api = {
  // Health & Diagnostics
  getHealth: () => request<HealthInfo>('/api/health'),
  
  testGemini: () => request<{ success: boolean; diagnostics: any }>('/api/diagnostics/gemini-test'),
  
  runSystemTests: () => request<TestSuiteResponse>('/api/system/run-tests', { method: 'POST' }),

  // Auth
  signup: async (email: string, password: string, name?: string) => {
    const res = await request<{ success: boolean; token: string; user: User }>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
    setStoredToken(res.token);
    return res;
  },

  login: async (email: string, password: string) => {
    const res = await request<{ success: boolean; token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setStoredToken(res.token);
    return res;
  },

  loginDemo: async () => {
    const res = await request<{ success: boolean; token: string; user: User }>('/api/auth/demo', {
      method: 'POST',
    });
    setStoredToken(res.token);
    return res;
  },

  logout: async () => {
    try {
      await request('/api/auth/logout', { method: 'POST' });
    } finally {
      setStoredToken(null);
    }
  },

  getMe: () => request<{ success: boolean; user: User }>('/api/auth/me'),

  // Conversations
  listConversations: () => request<{ success: boolean; conversations: Conversation[] }>('/api/conversations'),

  getConversation: (id: string) => 
    request<{ success: boolean; conversation: Conversation; messages: Message[] }>(`/api/conversations/${id}`),

  renameConversation: (id: string, title: string) =>
    request<{ success: boolean; id: string; title: string }>(`/api/conversations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ title }),
    }),

  deleteConversation: (id: string) =>
    request<{ success: boolean; message: string }>(`/api/conversations/${id}`, {
      method: 'DELETE',
    }),

  // Chat
  sendMessage: (messages: Array<{ role: string; content: string }>, conversationId?: string) =>
    request<{
      success: boolean;
      reply: string;
      model: string;
      conversationId: string | null;
      messageId: string | null;
    }>('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ messages, conversationId }),
    }),
};
