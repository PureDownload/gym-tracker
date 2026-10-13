import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { db } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'irontrack_dev_insecure_secret_key';
if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  console.warn('⚠️ [安全警告] 未检测到环境变量 JWT_SECRET，当前使用开发默认密钥。请在 .env 文件中设置强随机密钥！');
}
const TOKEN_EXPIRY = '90d'; // Long-lived token for seamless gym-first experience

export interface AuthUser {
  id: string;
  username: string;
  role: 'admin' | 'user';
  status?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

interface UserRow {
  id: string;
  username: string;
  password_hash: string;
  role: 'admin' | 'user';
  status: string;
  last_login_at?: number;
  created_at: number;
  updated_at: number;
}

export function registerUser(
  username: string,
  password: string,
  role?: 'admin' | 'user'
): { user: AuthUser; token: string } {
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

  // Check total user count to auto-promote first user to admin
  const countRow = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number } | undefined;
  const totalCount = countRow?.count || 0;
  const assignedRole: 'admin' | 'user' = role || (totalCount === 0 ? 'admin' : 'user');

  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(password, salt);
  const id = randomUUID();
  const now = Date.now();

  db.prepare(`
    INSERT INTO users (id, username, password_hash, role, status, last_login_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'active', ?, ?, ?)
  `).run(id, trimmed, passwordHash, assignedRole, now, now, now);

  const authUser: AuthUser = { id, username: trimmed, role: assignedRole, status: 'active' };
  const token = jwt.sign(authUser, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });

  return { user: authUser, token };
}

export function loginUser(username: string, password: string): { user: AuthUser; token: string } {
  const trimmed = username.trim();
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(trimmed) as UserRow | undefined;

  if (!user) {
    throw new Error('用户名或密码错误');
  }

  if (user.status === 'disabled') {
    throw new Error('该账号已被管理员停用，无法登录');
  }

  const isMatch = bcrypt.compareSync(password, user.password_hash);
  if (!isMatch) {
    throw new Error('用户名或密码错误');
  }

  const now = Date.now();
  db.prepare('UPDATE users SET last_login_at = ?, updated_at = ? WHERE id = ?').run(now, now, user.id);

  const authUser: AuthUser = {
    id: user.id,
    username: user.username,
    role: user.role || 'user',
    status: user.status || 'active',
  };
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
    console.warn('[auth] Token verification failed:', err);
    res.status(401).json({ error: '登录凭证已过期或无效，请重新登录' });
  }
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  // First ensure requireAuth passed
  if (!req.user) {
    res.status(401).json({ error: '未授权：请先登录' });
    return;
  }

  // Double check in DB for role & status consistency
  const user = db.prepare('SELECT role, status FROM users WHERE id = ?').get(req.user.id) as { role: 'admin' | 'user'; status: string } | undefined;
  if (!user) {
    res.status(401).json({ error: '用户不存在' });
    return;
  }

  if (user.status === 'disabled') {
    res.status(403).json({ error: '该账号已被停用' });
    return;
  }

  if (user.role !== 'admin') {
    res.status(403).json({ error: '权限不足：仅管理员可以访问管理后台' });
    return;
  }

  next();
}

export function hashPassword(plainText: string): string {
  const salt = bcrypt.genSaltSync(10);
  return bcrypt.hashSync(plainText, salt);
}

