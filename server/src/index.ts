import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDatabase } from './db.js';
import { registerUser, loginUser, requireAuth, type AuthenticatedRequest } from './auth.js';
import { syncRouter } from './routes/sync.js';

dotenv.config();

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
    version: '1.0.0',
  });
});

// Auth routes
app.post('/api/auth/register', (req, res) => {
  try {
    const { username, password } = req.body || {};
    const result = registerUser(username, password);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(400).json({ error: err.message || '注册失败' });
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const { username, password } = req.body || {};
    const result = loginUser(username, password);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(400).json({ error: err.message || '登录失败' });
  }
});

app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res) => {
  res.json({ success: true, user: req.user });
});

// Sync routes
app.use('/api/sync', syncRouter);

// Start server
app.listen(PORT, HOST, () => {
  console.log('====================================================');
  console.log(`🚀 IronTrack J1900 Backend Service Started!`);
  console.log(`📡 Listening on: http://${HOST}:${PORT}`);
  console.log(`🔗 Tailscale Access: http://<Your-Tailscale-IP>:${PORT}`);
  console.log(`✨ Ready for local & mobile client sync`);
  console.log('====================================================');
});
