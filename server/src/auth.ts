import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { db } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'irontrack_j1900_secure_key_2026';
const TOKEN_EXPIRY = '90d'; // Long-lived token for seamless gym-first experience

export interface AuthUser {
  id: string;
  username: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

interface UserRow {
  id: string;
  username: string;
  password_hash: string;
  created_at: number;
  updated_at: number;
}

export function registerUser(username: string, password: string): { user: AuthUser; token: string } {
  const trimmed = username.trim();
  if (!trimmed || trimmed.length < 2) {
    throw new Error('用户名长度至少为 2 个字符');
  }
  if (!password || password.length < 4) {
    throw new Error('密码长度至少为 4 个字符');
  }

  // Check if user already exists
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(trimmed);
  if (existing) {
    throw new Error('用户名已存在，请直接登录');
  }

  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(password, salt);
  const id = randomUUID();
  const now = Date.now();

  db.prepare(`
    INSERT INTO users (id, username, password_hash, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, trimmed, passwordHash, now, now);

  const authUser: AuthUser = { id, username: trimmed };
  const token = jwt.sign(authUser, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });

  return { user: authUser, token };
}

export function loginUser(username: string, password: string): { user: AuthUser; token: string } {
  const trimmed = username.trim();
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(trimmed) as UserRow | undefined;

  if (!user) {
    throw new Error('用户名或密码错误');
  }

  const isMatch = bcrypt.compareSync(password, user.password_hash);
  if (!isMatch) {
    throw new Error('用户名或密码错误');
  }

  const authUser: AuthUser = { id: user.id, username: user.username };
  const token = jwt.sign(authUser, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });

  return { user: authUser, token };
}

export function verifyToken(token: string): AuthUser {
  return jwt.verify(token, JWT_SECRET) as AuthUser;
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: '未授权：请提供有效的 Bearer Token' });
    return;
  }

  const token = authHeader.substring(7).trim();
  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: '登录凭证已过期或无效，请重新登录' });
  }
}
