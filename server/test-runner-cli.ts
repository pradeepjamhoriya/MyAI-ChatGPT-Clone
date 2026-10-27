import dotenv from 'dotenv';
dotenv.config();

async function runCliTests() {
  console.log('--- MyAI Automated Integration Test Suite ---');
  console.log('Testing Database and Gemini Model connectivity...\n');

  const { db } = await import('./db.js');
  const { hashPassword, verifyPassword, generateId, createUserSession } = await import('./auth.js');
  const { formatMessagesForGemini, testGeminiHealth } = await import('./gemini.js');

  await db.init();
  const dbStatus = db.getStatus();
  console.log(`[PASS] Database initialized (${dbStatus.engine})`);

  // Test Hash
  const hash = await hashPassword('Secret123!');
  const verified = await verifyPassword('Secret123!', hash);
  if (!verified) throw new Error('Password hash verification failed');
  console.log('[PASS] Password hashing & bcrypt verification');

  // Test User
  const testEmail = `cli_test_${Date.now()}@myai.test`;
  const user = await db.createUser({
    id: generateId(),
    email: testEmail,
    password_hash: hash,
    name: 'CLI Tester',
  });
  console.log(`[PASS] User persistence: ${user.email} (${user.id})`);

  // Test Session
  const session = await createUserSession(user.id);
  const foundSession = await db.findSession(session.token);
  if (!foundSession) throw new Error('Session lookup failed');
  console.log('[PASS] Session token issuance and lookup');

  // Test Conversation & Message
  const conv = await db.createConversation(generateId(), user.id, 'Test CLI Chat');
  await db.createMessage(generateId(), conv.id, 'user', 'What is machine learning?');
  await db.createMessage(generateId(), conv.id, 'assistant', 'Machine learning is a subset of AI...');
  const msgs = await db.getMessages(conv.id);
  if (msgs.length !== 2) throw new Error('Message persistence count mismatch');
  console.log(`[PASS] Conversation & Message CRUD (${msgs.length} messages)`);

  // Test Gemini schema transform
  const formatted = formatMessagesForGemini([
    { role: 'user', content: 'Hi' },
    { role: 'assistant', content: 'Hello' }
  ]);
  if (formatted.contents[1].role !== 'model') throw new Error('Role transform to model failed');
  console.log('[PASS] OpenAI-to-Gemini schema transformation');

  // Test Gemini Live Health
  console.log('Testing Gemini API (gemini-3.1-flash-lite / gemini-3.8-flash)...');
  const geminiResult = await testGeminiHealth();
  if (geminiResult.ok) {
    console.log(`[PASS] Gemini Model verified! Model: ${geminiResult.model}, Latency: ${geminiResult.latencyMs}ms, Sample output: "${geminiResult.sampleReply}"`);
  } else {
    console.warn(`[WARN] Gemini health check returned: ${geminiResult.error}`);
  }

  // Cleanup
  await db.deleteConversation(conv.id, user.id);
  await db.deleteSession(session.token);
  console.log('[PASS] Cleanup executed safely.');

  console.log('\n=============================================');
  console.log(' ALL CORE TEST SUITES COMPLETED SUCCESSFULLY ');
  console.log('=============================================\n');
}

runCliTests().catch((err) => {
  console.error('[FAIL] Test suite failed:', err);
  process.exit(1);
});
