export interface User {
  id: string;
  email: string;
  name: string;
  created_at: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count?: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  model?: string;
  created_at: string;
}

export interface HealthInfo {
  status: string;
  timestamp: string;
  version: string;
  gemini: {
    configured: boolean;
    model: string;
  };
  database: {
    connected: boolean;
    engine: string;
    details: string;
    counts: {
      users: number;
      conversations: number;
      messages: number;
    };
  };
}

export interface TestResultItem {
  name: string;
  passed: boolean;
  message: string;
  durationMs: number;
}

export interface TestSuiteResponse {
  success: boolean;
  summary: string;
  results: TestResultItem[];
}
