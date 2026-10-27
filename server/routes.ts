import { Router, Response } from 'express';
import { db } from './db.js';
import {
  hashPassword,
  verifyPassword,
  generateId,
  validateEmail,
  createUserSession,
  requireAuth,
  optionalAuth,
  AuthenticatedRequest,
  extractToken,
} from './auth.js';
import {
  generateChatReply,
  testGeminiHealth,
  ChatMessage,
} from './gemini.js';

export const apiRouter = Router();

// Simple in-memory rate limiter for chat requests
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
function checkRateLimit(ip: string, limit = 40, windowMs = 60000): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= limit) {
    return false;
  }
  entry.count++;
  return true;
}

// -------------------------------------------------------------
// 1. Health Check
// -------------------------------------------------------------
apiRouter.get('/health', async (req, res) => {
  const dbStatus = db.getStatus();
  const apiKeyConfigured = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY');

  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    gemini: {
      configured: apiKeyConfigured,
      model: 'gemini-3.1-flash-lite',
      fallback: 'gemini-3.8-flash',
    },
    database: dbStatus,
  });
});

// -------------------------------------------------------------
// 2. Gemini Diagnostics / Live Connectivity Test
// -------------------------------------------------------------
apiRouter.get('/diagnostics/gemini-test', async (req, res) => {
  try {
    const healthResult = await testGeminiHealth();
    res.json({
      success: healthResult.ok,
      diagnostics: healthResult,
    });
  } catch (err: any) {
    res.status(502).json({
      success: false,
      error: err?.message || 'Gemini connectivity test failed',
    });
  }
});

// -------------------------------------------------------------
// 3. Authentication: Signup
// -------------------------------------------------------------
apiRouter.post('/auth/signup', async (req, res) => {
  try {
    const { email, password, name } = req.body || {};

    if (!email || typeof email !== 'string' || !validateEmail(email)) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid email address.',
      });
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long.',
      });
    }

    const existingUser = await db.findUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'An account with this email already exists.',
      });
    }

    const password_hash = await hashPassword(password);
    const userId = generateId();
    const newUser = await db.createUser({
      id: userId,
      email,
      password_hash,
      name: (name && typeof name === 'string' ? name.trim() : email.split('@')[0]) || 'User',
    });

    const { token, expiresAt } = await createUserSession(userId);

    // Set HTTP-only cookie
    res.cookie('myai_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: expiresAt,
    });

    res.status(201).json({
      success: true,
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        created_at: newUser.created_at,
      },
    });
  } catch (err: any) {
    console.error('[Signup Error]', err);
    res.status(500).json({
      success: false,
      error: 'An unexpected error occurred during signup.',
    });
  }
});

// -------------------------------------------------------------
// 4. Authentication: Login
// -------------------------------------------------------------
apiRouter.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required.',
      });
    }

    const user = await db.findUserByEmail(email);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password.',
      });
    }

    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password.',
      });
    }

    const { token, expiresAt } = await createUserSession(user.id);

    res.cookie('myai_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: expiresAt,
    });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        created_at: user.created_at,
      },
    });
  } catch (err: any) {
    console.error('[Login Error]', err);
    res.status(500).json({
      success: false,
      error: 'An unexpected error occurred during login.',
    });
  }
});

// -------------------------------------------------------------
// 5. Authentication: Demo / Quick Test User
// -------------------------------------------------------------
apiRouter.post('/auth/demo', async (req, res) => {
  try {
    const demoEmail = 'guest@myai.local';
    let user = await db.findUserByEmail(demoEmail);

    if (!user) {
      const demoHash = await hashPassword('DemoPass123!');
      user = await db.createUser({
        id: generateId(),
        email: demoEmail,
        password_hash: demoHash,
        name: 'Demo Explorer',
      });
    }

    const { token, expiresAt } = await createUserSession(user.id);

    res.cookie('myai_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: expiresAt,
    });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        created_at: user.created_at,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Could not create demo session.' });
  }
});

// -------------------------------------------------------------
// 6. Authentication: Logout
// -------------------------------------------------------------
apiRouter.post('/auth/logout', async (req, res) => {
  try {
    const token = extractToken(req);
    if (token) {
      await db.deleteSession(token);
    }

    res.clearCookie('myai_session');
    res.json({ success: true, message: 'Logged out successfully.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Logout failed.' });
  }
});

// -------------------------------------------------------------
// 7. Authentication: Current User (/api/auth/me)
// -------------------------------------------------------------
apiRouter.get('/auth/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  res.json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      created_at: user.created_at,
    },
  });
});

// -------------------------------------------------------------
// 8. Conversations: List
// -------------------------------------------------------------
apiRouter.get('/conversations', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const conversations = await db.listConversations(req.user!.id);
    res.json({
      success: true,
      conversations,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to retrieve conversations.' });
  }
});

// -------------------------------------------------------------
// 9. Conversations: Get single conversation with messages
// -------------------------------------------------------------
apiRouter.get('/conversations/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const conversation = await db.getConversation(id, req.user!.id);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found or unauthorized.',
      });
    }

    const messages = await db.getMessages(id);

    res.json({
      success: true,
      conversation,
      messages,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to retrieve conversation details.' });
  }
});

// -------------------------------------------------------------
// 10. Conversations: Rename (PATCH)
// -------------------------------------------------------------
apiRouter.patch('/conversations/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { title } = req.body || {};

    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ success: false, error: 'Title cannot be empty.' });
    }

    const cleanTitle = title.trim().substring(0, 150);
    const updated = await db.updateConversationTitle(id, req.user!.id, cleanTitle);

    if (!updated) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found or unauthorized.',
      });
    }

    res.json({
      success: true,
      id,
      title: cleanTitle,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to rename conversation.' });
  }
});

// -------------------------------------------------------------
// 11. Conversations: Delete (DELETE)
// -------------------------------------------------------------
apiRouter.delete('/conversations/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await db.deleteConversation(id, req.user!.id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found or unauthorized.',
      });
    }

    res.json({
      success: true,
      message: 'Conversation deleted successfully.',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to delete conversation.' });
  }
});

// -------------------------------------------------------------
// 12. Chat: POST /api/chat
// Supports authenticated storage + optional guest testing
// -------------------------------------------------------------
apiRouter.post('/chat', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  // Rate limiting check
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
  if (!checkRateLimit(clientIp)) {
    return res.status(429).json({
      success: false,
      error: 'Rate limit exceeded. Please wait a moment before sending more messages.',
    });
  }

  try {
    const { messages, conversationId } = req.body || {};

    // Validate payload
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Field "messages" must be a non-empty array of message objects.',
      });
    }

    // Validate each message structure and content size
    for (const msg of messages) {
      if (!msg || typeof msg !== 'object') {
        return res.status(400).json({ success: false, error: 'Invalid message item in array.' });
      }
      if (!['user', 'assistant', 'system'].includes(msg.role)) {
        return res.status(400).json({
          success: false,
          error: `Invalid role "${msg.role}". Supported roles are "user", "assistant", or "system".`,
        });
      }
      if (typeof msg.content !== 'string') {
        return res.status(400).json({ success: false, error: 'Message content must be a string.' });
      }
      if (msg.content.length > 50000) {
        return res.status(400).json({ success: false, error: 'Message exceeds maximum length of 50,000 characters.' });
      }
    }

    const latestUserMessage = [...messages].reverse().find(m => m.role === 'user');
    if (!latestUserMessage || !latestUserMessage.content.trim()) {
      return res.status(400).json({ success: false, error: 'A user prompt is required.' });
    }

    const user = req.user;
    let activeConvId = conversationId as string | undefined;

    // If user is authenticated, handle conversation existence & permissions
    if (user) {
      if (activeConvId) {
        const existingConv = await db.getConversation(activeConvId, user.id);
        if (!existingConv) {
          return res.status(403).json({
            success: false,
            error: 'You do not have access to this conversation.',
          });
        }
      } else {
        // Auto-generate title from first 6 words
        const snippet = latestUserMessage.content.trim();
        const words = snippet.split(/\s+/).slice(0, 6).join(' ');
        const autoTitle = words.length < snippet.length ? `${words}...` : words;

        activeConvId = generateId();
        await db.createConversation(activeConvId, user.id, autoTitle);
      }

      // Persist the user message turn
      await db.createMessage(
        generateId(),
        activeConvId,
        'user',
        latestUserMessage.content.trim()
      );
    }

    // Invoke Gemini Model
    const geminiResult = await generateChatReply(messages as ChatMessage[]);

    // If user is authenticated, persist assistant message turn
    let assistantMessageId: string | undefined;
    if (user && activeConvId) {
      assistantMessageId = generateId();
      await db.createMessage(
        assistantMessageId,
        activeConvId,
        'assistant',
        geminiResult.text,
        geminiResult.model
      );
    }

    // Return target API response contract
    res.json({
      success: true,
      reply: geminiResult.text,
      model: geminiResult.model,
      conversationId: activeConvId || null,
      messageId: assistantMessageId || null,
    });
  } catch (err: any) {
    console.error('[Chat Endpoint Error]', err);

    // Differentiate between 4xx validation/blocked and 502/500 upstream errors
    const errorMessage = err?.message || 'Failed to process chat message';
    const isUpstreamFailure = errorMessage.includes('fetch') || errorMessage.includes('network') || errorMessage.includes('GEMINI_API_KEY');

    res.status(isUpstreamFailure ? 502 : 500).json({
      success: false,
      error: errorMessage,
      details: process.env.NODE_ENV !== 'production' ? err?.stack : undefined,
    });
  }
});

// -------------------------------------------------------------
// 13. System: Automated Backend Integration Test Runner
// -------------------------------------------------------------
apiRouter.post('/system/run-tests', async (req, res) => {
  const results: Array<{ name: string; passed: boolean; message: string; durationMs: number }> = [];

  const runTest = async (name: string, fn: () => Promise<void>) => {
    const t0 = Date.now();
    try {
      await fn();
      results.push({ name, passed: true, message: 'Passed', durationMs: Date.now() - t0 });
    } catch (e: any) {
      results.push({ name, passed: false, message: e.message || String(e), durationMs: Date.now() - t0 });
    }
  };

  // Test 1: Database Status & Write capability
  await runTest('Database Initialization & Status', async () => {
    const st = db.getStatus();
    if (!st.connected) throw new Error('Database not connected');
  });

  // Test 2: User Creation & Password Hash
  let testUserId = '';
  const testEmail = `test_${Date.now()}@myai.test`;
  await runTest('User Signup & Password Hashing', async () => {
    const hash = await hashPassword('Secret123!');
    const user = await db.createUser({
      id: generateId(),
      email: testEmail,
      password_hash: hash,
      name: 'QA Tester',
    });
    testUserId = user.id;
    const verified = await verifyPassword('Secret123!', hash);
    if (!verified) throw new Error('Password verification failed');
  });

  // Test 3: Session Creation & Lookup
  let testSessionToken = '';
  await runTest('Session Token Lifecycle', async () => {
    const { token, expiresAt } = await createUserSession(testUserId);
    testSessionToken = token;
    const session = await db.findSession(token);
    if (!session || session.user_id !== testUserId) throw new Error('Session lookup failed');
  });

  // Test 4: Conversation Creation & Retrieval
  let testConvId = '';
  await runTest('Conversation CRUD & Ownership', async () => {
    testConvId = generateId();
    await db.createConversation(testConvId, testUserId, 'Initial Title');
    const conv = await db.getConversation(testConvId, testUserId);
    if (!conv || conv.title !== 'Initial Title') throw new Error('Conversation not retrieved');

    // Test rename
    await db.updateConversationTitle(testConvId, testUserId, 'Updated Title');
    const updated = await db.getConversation(testConvId, testUserId);
    if (updated?.title !== 'Updated Title') throw new Error('Conversation rename failed');
  });

  // Test 5: Message Persistence
  await runTest('Message Persistence (User & Assistant turns)', async () => {
    await db.createMessage(generateId(), testConvId, 'user', 'Hello MyAI');
    await db.createMessage(generateId(), testConvId, 'assistant', 'Hello! How can I assist you today?');
    const msgs = await db.getMessages(testConvId);
    if (msgs.length !== 2) throw new Error(`Expected 2 messages, found ${msgs.length}`);
    if (msgs[0].role !== 'user' || msgs[1].role !== 'assistant') throw new Error('Message roles mismatch');
  });

  // Test 6: Message Formatting for Gemini
  await runTest('Gemini Message Schema Transformation', async () => {
    const { contents, systemInstruction } = (await import('./gemini.js')).formatMessagesForGemini([
      { role: 'system', content: 'Act as expert' },
      { role: 'user', content: 'What is 2+2?' },
      { role: 'assistant', content: '4' },
      { role: 'user', content: 'Multiply by 3' },
    ]);
    if (!systemInstruction || !systemInstruction.includes('Act as expert')) throw new Error('System instruction lost');
    if (contents.length !== 3) throw new Error(`Expected 3 contents turns, got ${contents.length}`);
    if (contents[1].role !== 'model') throw new Error('Assistant role must be mapped to model');
  });

  // Test 7: Gemini Live Connectivity
  await runTest('Gemini Model API Call (gemini-3.1-flash-lite / 3.8-flash)', async () => {
    const geminiTest = await testGeminiHealth();
    if (!geminiTest.ok) {
      throw new Error(`Gemini check failed: ${geminiTest.error}`);
    }
  });

  // Test 8: Conversation Deletion
  await runTest('Safe Cascade Conversation Deletion', async () => {
    const deleted = await db.deleteConversation(testConvId, testUserId);
    if (!deleted) throw new Error('Conversation deletion failed');
    const remainingMsgs = await db.getMessages(testConvId);
    if (remainingMsgs.length !== 0) throw new Error('Cascaded messages were not cleaned up');
  });

  // Cleanup session
  await db.deleteSession(testSessionToken);

  const totalPassed = results.filter(r => r.passed).length;
  res.json({
    success: totalPassed === results.length,
    summary: `${totalPassed} / ${results.length} tests passed`,
    results,
  });
});
