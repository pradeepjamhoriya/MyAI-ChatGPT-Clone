import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';

export interface User {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  created_at: string;
  updated_at: string;
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
  model: string;
  created_at: string;
}

export interface Session {
  token: string;
  user_id: string;
  expires_at: string;
  created_at: string;
}

interface LocalDatabaseState {
  users: User[];
  conversations: Conversation[];
  messages: Message[];
  sessions: Session[];
}

class DatabaseManager {
  private pool: mysql.Pool | null = null;
  private isMySqlConnected = false;
  private localDataDir = path.resolve(process.cwd(), '.data');
  private localDataFile = path.resolve(process.cwd(), '.data', 'myai_database.json');
  private localData: LocalDatabaseState = {
    users: [],
    conversations: [],
    messages: [],
    sessions: [],
  };

  constructor() {
    this.initLocalStore();
  }

  private initLocalStore() {
    try {
      if (!fs.existsSync(this.localDataDir)) {
        fs.mkdirSync(this.localDataDir, { recursive: true });
      }
      if (fs.existsSync(this.localDataFile)) {
        const raw = fs.readFileSync(this.localDataFile, 'utf-8');
        this.localData = JSON.parse(raw);
      } else {
        this.saveLocalStore();
      }
    } catch (err) {
      console.warn('[DB] Failed reading local database file, using in-memory state:', err);
    }
  }

  private saveLocalStore() {
    try {
      fs.writeFileSync(this.localDataFile, JSON.stringify(this.localData, null, 2), 'utf-8');
    } catch (err) {
      console.error('[DB] Failed writing to local database file:', err);
    }
  }

  public async init() {
    const dbHost = process.env.DB_HOST || 'localhost';
    const dbUser = process.env.DB_USER || 'root';
    const dbPassword = process.env.DB_PASSWORD || '';
    const dbName = process.env.DB_NAME || 'myai_db';
    const dbPort = parseInt(process.env.DB_PORT || '3306', 10);

    // Only attempt MySQL if explicitly enabled or if DB_HOST/DB_NAME set
    const shouldTryMySQL = process.env.USE_MYSQL === 'true' || Boolean(process.env.DB_PASSWORD) || Boolean(process.env.DB_NAME);

    if (shouldTryMySQL) {
      try {
        console.log(`[DB] Attempting connection to MySQL server at ${dbHost}:${dbPort}...`);
        const pool = mysql.createPool({
          host: dbHost,
          user: dbUser,
          password: dbPassword,
          database: dbName,
          port: dbPort,
          waitForConnections: true,
          connectionLimit: 10,
          queueLimit: 0,
        });

        const conn = await pool.getConnection();
        await conn.ping();
        conn.release();

        this.pool = pool;
        this.isMySqlConnected = true;
        console.log(`[DB] Successfully connected to MySQL database: ${dbName}`);
      } catch (err: any) {
        console.warn(`[DB] MySQL not available (${err?.message || 'Connection refused'}). Falling back to persistent local store.`);
        this.isMySqlConnected = false;
        this.pool = null;
      }
    } else {
      console.log('[DB] Using high-performance persistent local JSON database. (Set USE_MYSQL=true in .env to use MySQL)');
    }
  }

  public getStatus() {
    return {
      connected: true,
      engine: this.isMySqlConnected ? 'MySQL' : 'Persistent Storage',
      details: this.isMySqlConnected 
        ? `MySQL (${process.env.DB_HOST || 'localhost'}/${process.env.DB_NAME || 'myai_db'})` 
        : 'File-backed persistent storage (.data/myai_database.json)',
      counts: {
        users: this.localData.users.length,
        conversations: this.localData.conversations.length,
        messages: this.localData.messages.length,
      }
    };
  }

  // --- Users ---
  public async findUserByEmail(email: string): Promise<User | null> {
    const normalized = email.trim().toLowerCase();
    if (this.isMySqlConnected && this.pool) {
      const [rows] = await this.pool.execute<mysql.RowDataPacket[]>(
        'SELECT * FROM users WHERE LOWER(email) = ? LIMIT 1',
        [normalized]
      );
      return (rows[0] as User) || null;
    }

    const found = this.localData.users.find(u => u.email.toLowerCase() === normalized);
    return found ? { ...found } : null;
  }

  public async findUserById(id: string): Promise<User | null> {
    if (this.isMySqlConnected && this.pool) {
      const [rows] = await this.pool.execute<mysql.RowDataPacket[]>(
        'SELECT * FROM users WHERE id = ? LIMIT 1',
        [id]
      );
      return (rows[0] as User) || null;
    }

    const found = this.localData.users.find(u => u.id === id);
    return found ? { ...found } : null;
  }

  public async createUser(user: Omit<User, 'created_at' | 'updated_at'>): Promise<User> {
    const now = new Date().toISOString();
    const newUser: User = {
      ...user,
      email: user.email.trim().toLowerCase(),
      created_at: now,
      updated_at: now,
    };

    if (this.isMySqlConnected && this.pool) {
      await this.pool.execute(
        'INSERT INTO users (id, email, password_hash, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
        [newUser.id, newUser.email, newUser.password_hash, newUser.name, newUser.created_at, newUser.updated_at]
      );
      return newUser;
    }

    this.localData.users.push(newUser);
    this.saveLocalStore();
    return newUser;
  }

  // --- Sessions ---
  public async createSession(token: string, userId: string, expiresAt: Date): Promise<Session> {
    const now = new Date().toISOString();
    const expiresStr = expiresAt.toISOString();
    const session: Session = {
      token,
      user_id: userId,
      expires_at: expiresStr,
      created_at: now,
    };

    if (this.isMySqlConnected && this.pool) {
      await this.pool.execute(
        'INSERT INTO sessions (token, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)',
        [token, userId, expiresStr, now]
      );
      return session;
    }

    // Clean up expired sessions
    this.localData.sessions = this.localData.sessions.filter(s => new Date(s.expires_at) > new Date());
    this.localData.sessions.push(session);
    this.saveLocalStore();
    return session;
  }

  public async findSession(token: string): Promise<Session | null> {
    if (this.isMySqlConnected && this.pool) {
      const [rows] = await this.pool.execute<mysql.RowDataPacket[]>(
        'SELECT * FROM sessions WHERE token = ? AND expires_at > NOW() LIMIT 1',
        [token]
      );
      return (rows[0] as Session) || null;
    }

    const session = this.localData.sessions.find(s => s.token === token);
    if (!session) return null;
    if (new Date(session.expires_at) <= new Date()) {
      this.deleteSession(token);
      return null;
    }
    return session;
  }

  public async deleteSession(token: string): Promise<void> {
    if (this.isMySqlConnected && this.pool) {
      await this.pool.execute('DELETE FROM sessions WHERE token = ?', [token]);
      return;
    }

    this.localData.sessions = this.localData.sessions.filter(s => s.token !== token);
    this.saveLocalStore();
  }

  // --- Conversations ---
  public async listConversations(userId: string): Promise<Conversation[]> {
    if (this.isMySqlConnected && this.pool) {
      const [rows] = await this.pool.execute<mysql.RowDataPacket[]>(
        `SELECT c.*, COUNT(m.id) as message_count 
         FROM conversations c 
         LEFT JOIN messages m ON c.id = m.conversation_id 
         WHERE c.user_id = ? 
         GROUP BY c.id 
         ORDER BY c.updated_at DESC`,
        [userId]
      );
      return rows as Conversation[];
    }

    const list = this.localData.conversations
      .filter(c => c.user_id === userId)
      .map(c => {
        const count = this.localData.messages.filter(m => m.conversation_id === c.id).length;
        return { ...c, message_count: count };
      })
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

    return list;
  }

  public async getConversation(id: string, userId: string): Promise<Conversation | null> {
    if (this.isMySqlConnected && this.pool) {
      const [rows] = await this.pool.execute<mysql.RowDataPacket[]>(
        'SELECT * FROM conversations WHERE id = ? AND user_id = ? LIMIT 1',
        [id, userId]
      );
      return (rows[0] as Conversation) || null;
    }

    const conv = this.localData.conversations.find(c => c.id === id && c.user_id === userId);
    return conv ? { ...conv } : null;
  }

  public async createConversation(id: string, userId: string, title = 'New Chat'): Promise<Conversation> {
    const now = new Date().toISOString();
    const conv: Conversation = {
      id,
      user_id: userId,
      title,
      created_at: now,
      updated_at: now,
    };

    if (this.isMySqlConnected && this.pool) {
      await this.pool.execute(
        'INSERT INTO conversations (id, user_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
        [conv.id, conv.user_id, conv.title, conv.created_at, conv.updated_at]
      );
      return conv;
    }

    this.localData.conversations.unshift(conv);
    this.saveLocalStore();
    return conv;
  }

  public async updateConversationTitle(id: string, userId: string, title: string): Promise<boolean> {
    const now = new Date().toISOString();
    if (this.isMySqlConnected && this.pool) {
      const [result] = await this.pool.execute<mysql.ResultSetHeader>(
        'UPDATE conversations SET title = ?, updated_at = ? WHERE id = ? AND user_id = ?',
        [title, now, id, userId]
      );
      return result.affectedRows > 0;
    }

    const conv = this.localData.conversations.find(c => c.id === id && c.user_id === userId);
    if (!conv) return false;
    conv.title = title;
    conv.updated_at = now;
    this.saveLocalStore();
    return true;
  }

  public async touchConversation(id: string): Promise<void> {
    const now = new Date().toISOString();
    if (this.isMySqlConnected && this.pool) {
      await this.pool.execute('UPDATE conversations SET updated_at = ? WHERE id = ?', [now, id]);
      return;
    }
    const conv = this.localData.conversations.find(c => c.id === id);
    if (conv) {
      conv.updated_at = now;
      this.saveLocalStore();
    }
  }

  public async deleteConversation(id: string, userId: string): Promise<boolean> {
    if (this.isMySqlConnected && this.pool) {
      const [result] = await this.pool.execute<mysql.ResultSetHeader>(
        'DELETE FROM conversations WHERE id = ? AND user_id = ?',
        [id, userId]
      );
      return result.affectedRows > 0;
    }

    const beforeLen = this.localData.conversations.length;
    this.localData.conversations = this.localData.conversations.filter(c => !(c.id === id && c.user_id === userId));
    const deleted = this.localData.conversations.length < beforeLen;
    if (deleted) {
      this.localData.messages = this.localData.messages.filter(m => m.conversation_id !== id);
      this.saveLocalStore();
    }
    return deleted;
  }

  // --- Messages ---
  public async getMessages(conversationId: string): Promise<Message[]> {
    if (this.isMySqlConnected && this.pool) {
      const [rows] = await this.pool.execute<mysql.RowDataPacket[]>(
        'SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC',
        [conversationId]
      );
      return rows as Message[];
    }

    return this.localData.messages
      .filter(m => m.conversation_id === conversationId)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }

  public async createMessage(
    id: string,
    conversationId: string,
    role: 'user' | 'assistant' | 'system',
    content: string,
    model = 'gemini-3.8-flash'
  ): Promise<Message> {
    const now = new Date().toISOString();
    const message: Message = {
      id,
      conversation_id: conversationId,
      role,
      content,
      model,
      created_at: now,
    };

    if (this.isMySqlConnected && this.pool) {
      await this.pool.execute(
        'INSERT INTO messages (id, conversation_id, role, content, model, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [message.id, message.conversation_id, message.role, message.content, message.model, message.created_at]
      );
      await this.touchConversation(conversationId);
      return message;
    }

    this.localData.messages.push(message);
    await this.touchConversation(conversationId);
    this.saveLocalStore();
    return message;
  }
}

export const db = new DatabaseManager();
