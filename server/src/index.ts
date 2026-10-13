import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'node:fs';
import { initDatabase } from './db.js';
import { registerUser, loginUser, requireAuth, type AuthenticatedRequest } from './auth.js';
import { syncRouter } from './routes/sync.js';
import { adminRouter } from './routes/admin.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const serverPkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf-8'));
const SERVER_VERSION: string = serverPkg.version || '1.0.0';

// Initialize SQLite database
initDatabase();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
const HOST = process.env.HOST || '0.0.0.0';

// Enable CORS for all Tailscale and local origins
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parser
app.use(express.json({ limit: '15mb' }));

// Request logger for troubleshooting
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.path !== '/api/health') {
      console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.path} -> ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// Health check (used by mobile client for latency ping & connectivity detection)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    serverTime: Date.now(),
    service: 'IronTrack J1900 Server',
    version: SERVER_VERSION,
  });
});

// Auth routes
app.post('/api/auth/register', (req, res) => {
  try {
    const { username, password } = req.body || {};
    const result = registerUser(username, password);
    res.json({ success: true, ...result });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(400).json({ error: errorMsg || '注册失败' });
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const { username, password } = req.body || {};
    const result = loginUser(username, password);
    res.json({ success: true, ...result });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(400).json({ error: errorMsg || '登录失败' });
  }
});

app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res) => {
  res.json({ success: true, user: req.user });
});

// Sync routes
app.use('/api/sync', syncRouter);

// Admin routes
app.use('/api/admin', adminRouter);

// Admin Web SPA static assets hosting
const adminDistPath = path.resolve(__dirname, '../dist/admin-web');
const fallbackAdminPath = path.resolve(__dirname, '../../dist/admin-web');
const targetAdminDist = fs.existsSync(adminDistPath) ? adminDistPath : (fs.existsSync(fallbackAdminPath) ? fallbackAdminPath : null);

if (targetAdminDist) {
  app.use('/admin', express.static(targetAdminDist));
  app.get('/admin/*', (req, res) => {
    res.sendFile(path.join(targetAdminDist, 'index.html'));
  });
  app.get('/', (req, res) => {
    res.redirect('/admin');
  });
} else {
  app.get('/admin', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head><title>IronTrack Admin</title><meta charset="utf-8"></head>
      <body style="background:#0b0d10;color:#e2e8f0;font-family:sans-serif;padding:40px;text-align:center;">
        <h1 style="color:#22c55e;">🏋️‍♂️ IronTrack 后端服务正常运行中</h1>
        <p>Admin Web 前端页面正在构建中或尚未编译...</p>
        <p style="color:#64748b;">API 状态: <a href="/api/health" style="color:#06b6d4;">/api/health</a></p>
      </body>
      </html>
    `);
  });
}

// Start server
app.listen(PORT, HOST, () => {
  console.log('====================================================');
  console.log(`🚀 IronTrack J1900 Backend Service Started!`);
  console.log(`📡 Listening on: http://${HOST}:${PORT}`);
  console.log(`🖥️ PC Admin Web: http://${HOST}:${PORT}/admin`);
  console.log(`🔗 Tailscale Admin: http://<Your-Tailscale-IP>:${PORT}/admin`);
  console.log(`✨ Ready for local & mobile client sync`);
  console.log('====================================================');
});

