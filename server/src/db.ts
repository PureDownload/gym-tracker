import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure data folder exists
const DATA_DIR = process.env.DATA_DIR || path.resolve(__dirname, '../data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, 'irontrack.db');

export const db = new Database(DB_PATH);

// Optimize SQLite for high performance and reliability on low-power servers like J1900
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('foreign_keys = ON');
db.pragma('cache_size = -64000'); // 64MB RAM page cache
db.pragma('temp_store = MEMORY'); // In-memory temp tables and indexes

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      status TEXT NOT NULL DEFAULT 'active',
      last_login_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS workouts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      date TEXT NOT NULL,
      title TEXT NOT NULL,
      duration_minutes INTEGER,
      exercises_json TEXT NOT NULL,
      notes TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      is_deleted INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_workouts_user_updated ON workouts(user_id, updated_at);
    CREATE INDEX IF NOT EXISTS idx_workouts_user_date ON workouts(user_id, date);

    CREATE TABLE IF NOT EXISTS custom_exercises (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      data_json TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      is_deleted INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_custom_exercises_user_updated ON custom_exercises(user_id, updated_at);

    CREATE TABLE IF NOT EXISTS templates (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT,
      exercises_json TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      is_deleted INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_templates_user_updated ON templates(user_id, updated_at);

    CREATE TABLE IF NOT EXISTS body_metrics (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      date TEXT NOT NULL,
      weight_kg REAL,
      body_fat_percent REAL,
      measurements_json TEXT,
      notes TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      is_deleted INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_body_metrics_user_updated ON body_metrics(user_id, updated_at);
    CREATE INDEX IF NOT EXISTS idx_body_metrics_user_date ON body_metrics(user_id, date);

    CREATE TABLE IF NOT EXISTS daily_habits (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      date TEXT NOT NULL,
      data_json TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      is_deleted INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_daily_habits_user_updated ON daily_habits(user_id, updated_at);
    CREATE INDEX IF NOT EXISTS idx_daily_habits_user_date ON daily_habits(user_id, date);
  `);

  // Migrate existing users table if columns are missing
  const tableInfo = db.prepare(`PRAGMA table_info(users)`).all() as Array<{ name: string }>;
  const existingCols = new Set(tableInfo.map(col => col.name));

  if (!existingCols.has('role')) {
    db.exec(`ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user';`);
  }
  if (!existingCols.has('status')) {
    db.exec(`ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'active';`);
  }
  if (!existingCols.has('last_login_at')) {
    db.exec(`ALTER TABLE users ADD COLUMN last_login_at INTEGER;`);
  }

  // Create role & status indexes now that columns are guaranteed
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
  `);

  // 保证内置系统默认管理员账号存在 (用户名: admin / 默认密码: admin123)
  const defaultAdminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123';
  const defaultAdmin = db.prepare('SELECT id, role, password_hash FROM users WHERE username = ?').get('admin') as { id: string; role: string; password_hash: string } | undefined;

  if (!defaultAdmin) {
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(defaultAdminPassword, salt);
    const now = Date.now();
    db.prepare(`
      INSERT INTO users (id, username, password_hash, role, status, created_at, updated_at)
      VALUES (?, 'admin', ?, 'admin', 'active', ?, ?)
    `).run(randomUUID(), passwordHash, now, now);
    console.log(`👑 [内置管理员] 已创建系统默认管理员账号 -> 用户名: admin | 密码: ${defaultAdminPassword} (登录后可自行修改)`);
  } else {
    // 确保其角色为 admin 且状态正常
    if (defaultAdmin.role !== 'admin') {
      db.prepare(`UPDATE users SET role = 'admin', status = 'active' WHERE id = ?`).run(defaultAdmin.id);
    }
    // 若环境变量显式要求重置管理员密码
    if (process.env.RESET_DEFAULT_ADMIN === 'true') {
      const salt = bcrypt.genSaltSync(10);
      const passwordHash = bcrypt.hashSync(defaultAdminPassword, salt);
      db.prepare(`UPDATE users SET password_hash = ?, status = 'active' WHERE id = ?`).run(passwordHash, defaultAdmin.id);
      console.log(`🔑 [密码重置] admin 密码已重置为: ${defaultAdminPassword}`);
    }
  }

  // 兜底保障：若系统中尚无任何管理员，自动将最早注册的用户提升为管理员
  const adminCountRow = db.prepare(`SELECT COUNT(*) as count FROM users WHERE role = 'admin'`).get() as { count: number } | undefined;
  const adminCount = adminCountRow?.count || 0;
  if (adminCount === 0) {
    const firstUser = db.prepare(`SELECT id, username FROM users ORDER BY created_at ASC LIMIT 1`).get() as { id: string; username: string } | undefined;
    if (firstUser) {
      db.prepare(`UPDATE users SET role = 'admin' WHERE id = ?`).run(firstUser.id);
      console.log(`👑 [权限自举] 已自动将首位用户【${firstUser.username}】提升为系统管理员 (admin)`);
    }
  }
}

