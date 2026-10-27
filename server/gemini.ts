import { GoogleGenAI } from '@google/genai';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'model';
  content: string;
}

export interface GeminiContentPart {
  text: string;
}

export interface GeminiContent {
  role: 'user' | 'model';
  parts: GeminiContentPart[];
}

// Supported models: gemini-3.1-flash-lite is high-speed and responsive
export const DEFAULT_MODEL = 'gemini-3.1-flash-lite';
export const FALLBACK_MODEL = 'gemini-3.8-flash';

// Initialize the official Google GenAI SDK
function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not configured.');
  }

  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

/**
 * Transforms standard chat history (role: 'user' | 'assistant' | 'system')
 * into the format expected by the Google GenAI SDK (role: 'user' | 'model').
 */
export function formatMessagesForGemini(messages: ChatMessage[]): {
  systemInstruction?: string;
  contents: GeminiContent[];
} {
  const systemInstructions: string[] = [
    'You are MyAI, an advanced, articulate, helpful, and creative conversational assistant inspired by ChatGPT.',
    'Format code with markdown backticks and language identifiers.',
    'Provide structured, clear, and comprehensive answers.',
  ];

  const contents: GeminiContent[] = [];

  for (const msg of messages) {
    const rawContent = (msg.content || '').trim();
    if (!rawContent) continue;

    if (msg.role === 'system') {
      systemInstructions.push(rawContent);
      continue;
    }

    const geminiRole: 'user' | 'model' = msg.role === 'assistant' || msg.role === 'model' ? 'model' : 'user';

    // If consecutive roles are the same, merge their text parts to satisfy Gemini turn alternation
    const lastItem = contents[contents.length - 1];
    if (lastItem && lastItem.role === geminiRole) {
      lastItem.parts.push({ text: rawContent });
    } else {
      contents.push({
        role: geminiRole,
        parts: [{ text: rawContent }],
      });
    }
  }

  // Ensure conversation begins with a user turn if there are any contents
  if (contents.length > 0 && contents[0].role === 'model') {
    contents.unshift({
      role: 'user',
      parts: [{ text: 'Hello' }],
    });
  }

  return {
    systemInstruction: systemInstructions.join('\n'),
    contents,
  };
}

/**
 * Generates an AI response from Gemini given the conversation history.
 */
export async function generateChatReply(
  messages: ChatMessage[],
  options?: {
    model?: string;
    temperature?: number;
  }
): Promise<{ text: string; model: string }> {
  const primaryModel = options?.model || DEFAULT_MODEL;
  const modelsToTry = [primaryModel];
  if (!modelsToTry.includes(FALLBACK_MODEL)) {
    modelsToTry.push(FALLBACK_MODEL);
  }

  const ai = getGeminiClient();
  const { systemInstruction, contents } = formatMessagesForGemini(messages);

  if (contents.length === 0) {
    throw new Error('At least one user message is required.');
  }

  let lastError: any = null;

  for (const model of modelsToTry) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: contents as any,
        config: {
          systemInstruction,
          temperature: options?.temperature ?? 0.7,
        },
      });

      const reply = response.text;
      if (!reply) {
        throw new Error('The Gemini model returned an empty response.');
      }

      return {
        text: reply,
        model,
      };
    } catch (err: any) {
      lastError = err;
      console.warn(`[Gemini Warn] Model ${model} returned error: ${err?.message || err}. Trying next model...`);
    }
  }

  console.error('[Gemini API Final Failure]', {
    attemptedModels: modelsToTry,
    lastError: lastError?.message || lastError,
  });
  throw lastError;
}

/**
 * Diagnostic method to test live Gemini connection and measure latency
 */
export async function testGeminiHealth(): Promise<{
  ok: boolean;
  model: string;
  latencyMs: number;
  sampleReply?: string;
  error?: string;
}> {
  const startTime = Date.now();

  if (!process.env.GEMINI_API_KEY) {
    return {
      ok: false,
      model: 'none',
      latencyMs: 0,
      error: 'GEMINI_API_KEY is not defined in environment variables.',
    };
  }

  try {
    const res = await generateChatReply([{ role: 'user', content: 'Say READY' }]);
    return {
      ok: true,
      model: res.model,
      latencyMs: Date.now() - startTime,
      sampleReply: res.text.trim(),
    };
  } catch (err: any) {
    return {
      ok: false,
      model: DEFAULT_MODEL,
      latencyMs: Date.now() - startTime,
      error: err?.message || 'Gemini service unreachable',
    };
  }
}
