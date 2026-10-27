import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { Request, Response, NextFunction } from 'express';
import { db, User } from './db.js';

export interface AuthenticatedRequest extends Request {
  user?: User;
  sessionToken?: string;
}

const SESSION_EXPIRATION_DAYS = 30;

export async function hashPassword(plainText: string): Promise<string> {
  return bcrypt.hash(plainText, 10);
}

export async function verifyPassword(plainText: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plainText, hash);
}

export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function generateId(): string {
  return crypto.randomUUID();
}

export function validateEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

export async function createUserSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = generateToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_EXPIRATION_DAYS);

  await db.createSession(token, userId, expiresAt);
  return { token, expiresAt };
}

export function extractToken(req: Request): string | null {
  // Check Authorization Bearer header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }

  // Check custom header
  const customHeader = req.headers['x-session-token'];
  if (typeof customHeader === 'string' && customHeader) {
    return customHeader.trim();
  }

  // Check cookies
  if (req.cookies && req.cookies.myai_session) {
    return req.cookies.myai_session;
  }

  return null;
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Please log in or sign up.',
      });
    }

    const session = await db.findSession(token);
    if (!session) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired session. Please log in again.',
      });
    }

    const user = await db.findUserById(session.user_id);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found.',
      });
    }

    req.user = user;
    req.sessionToken = token;
    next();
  } catch (err: any) {
    console.error('[Auth Error]', err);
    res.status(500).json({
      success: false,
      error: 'Authentication verification failed.',
    });
  }
}

export async function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const token = extractToken(req);
    if (token) {
      const session = await db.findSession(token);
      if (session) {
        const user = await db.findUserById(session.user_id);
        if (user) {
          req.user = user;
          req.sessionToken = token;
        }
      }
    }
  } catch (err) {
    // Ignore in optional auth
  }
  next();
}
