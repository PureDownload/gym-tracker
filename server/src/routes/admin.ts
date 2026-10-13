import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { requireAuth, requireAdmin, hashPassword, type AuthenticatedRequest } from '../auth.js';
import { db } from '../db.js';

export const adminRouter = Router();

// Protect all admin endpoints with both authentication & admin role check
adminRouter.use(requireAuth);
adminRouter.use(requireAdmin);

// Database record type definitions
interface CountRow {
  count: number;
}

interface TotalRow {
  total: number;
}

interface UserRow {
  id: string;
  username: string;
  role: 'admin' | 'user';
  status: 'active' | 'disabled';
  last_login_at?: number | null;
  created_at: number;
  updated_at: number;
}

interface UserListRow extends UserRow {
  workout_count: number;
  last_workout_date?: string | null;
  custom_exercise_count: number;
  template_count: number;
  body_metric_count: number;
}

interface ExerciseSetRecord {
  weight?: number | string;
  reps?: number | string;
  completed?: boolean;
  isCompleted?: boolean;
}

interface ExerciseRecord {
  name?: string;
  exerciseName?: string;
  sets?: ExerciseSetRecord[];
}

interface WorkoutDbRow {
  id: string;
  user_id: string;
  username?: string;
  date: string;
  title: string;
  duration_minutes: number | null;
  exercises_json: string | null;
  notes: string | null;
  created_at: number;
  updated_at: number;
  is_deleted?: number;
}

interface BodyMetricDbRow {
  id: string;
  user_id: string;
  username?: string;
  date: string;
  weight_kg: number | null;
  body_fat_percent: number | null;
  measurements_json: string | null;
  notes: string | null;
  created_at: number;
  updated_at: number;
  is_deleted?: number;
}

// Muscle group matching heuristic for Chinese & English exercise names
function inferMuscleGroup(name: string): string {
  const n = (name || '').toLowerCase();
  if (/胸|卧推|夹胸|飞鸟|俯卧撑|bench|chest|pec|fly/i.test(n)) return '胸部 (Chest)';
  if (/背|引体|划船|高位下拉|硬拉|lat|row|pull-up|deadlift|back/i.test(n)) return '背部 (Back)';
  if (/腿|深蹲|倒蹬|腿屈伸|腿弯举|箭步|臀|squat|leg|calf|glute|lunge/i.test(n)) return '腿臀 (Legs & Glutes)';
  if (/肩|推举|侧平举|前平举|面拉|shoulder|press|deltoid|lateral|overhead/i.test(n)) return '肩部 (Shoulders)';
  if (/臂|二头|三头|弯举|臂屈伸|下压|bicep|tricep|curl|extension|dip/i.test(n)) return '手臂 (Arms)';
  if (/腹|核心|平板支撑|卷腹|悬垂举腿|crunch|plank|ab|core/i.test(n)) return '核心 (Core)';
  if (/跑|单车|划船机|椭圆机|爬楼|有氧|treadmill|bike|cardio|rower/i.test(n)) return '有氧 (Cardio)';
  return '综合/其他 (Other)';
}

// Calculate Epley 1RM: Weight * (1 + Reps / 30)
function calculate1RM(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
}

// ---------------------------------------------------------------------------
// 1. Dashboard Overview
// ---------------------------------------------------------------------------
adminRouter.get('/overview', (req: AuthenticatedRequest, res) => {
  try {
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

    // Total counts
    const totalUsers = (db.prepare('SELECT COUNT(*) as count FROM users').get() as CountRow | undefined)?.count || 0;
    const activeUsers7d = (db.prepare('SELECT COUNT(DISTINCT user_id) as count FROM workouts WHERE updated_at > ?').get(sevenDaysAgo) as CountRow | undefined)?.count || 0;
    const totalWorkouts = (db.prepare('SELECT COUNT(*) as count FROM workouts WHERE is_deleted = 0').get() as CountRow | undefined)?.count || 0;
    const totalCustomExercises = (db.prepare('SELECT COUNT(*) as count FROM custom_exercises WHERE is_deleted = 0').get() as CountRow | undefined)?.count || 0;
    const totalTemplates = (db.prepare('SELECT COUNT(*) as count FROM templates WHERE is_deleted = 0').get() as CountRow | undefined)?.count || 0;
    const totalBodyMetrics = (db.prepare('SELECT COUNT(*) as count FROM body_metrics WHERE is_deleted = 0').get() as CountRow | undefined)?.count || 0;

    // Today's date string YYYY-MM-DD
    const todayStr = new Date().toISOString().split('T')[0];
    const todayWorkouts = (db.prepare('SELECT COUNT(*) as count FROM workouts WHERE date = ? AND is_deleted = 0').get(todayStr) as CountRow | undefined)?.count || 0;

    // Workout tonnage & muscle group breakdown
    const allWorkouts = db.prepare(`
      SELECT user_id, date, title, exercises_json, created_at, duration_minutes 
      FROM workouts 
      WHERE is_deleted = 0 
      ORDER BY date DESC
    `).all() as WorkoutDbRow[];

    let totalVolumeKg = 0;
    const muscleMap: Record<string, number> = {};
    const trendMap: Record<string, { count: number; volume: number }> = {};

    // Strength Records tracking for Big 3 (卧推 Bench, 深蹲 Squat, 硬拉 Deadlift)
    const prRecords: Record<string, { exercise: string; max1RM: number; weight: number; reps: number; username: string; date: string }> = {
      bench: { exercise: '杠铃卧推', max1RM: 0, weight: 0, reps: 0, username: '暂无', date: '' },
      squat: { exercise: '深蹲', max1RM: 0, weight: 0, reps: 0, username: '暂无', date: '' },
      deadlift: { exercise: '硬拉', max1RM: 0, weight: 0, reps: 0, username: '暂无', date: '' },
    };

    // User lookup map for names
    const usersList = db.prepare('SELECT id, username FROM users').all() as Array<{ id: string; username: string }>;
    const userMap = new Map<string, string>();
    usersList.forEach(u => userMap.set(u.id, u.username));

    // Initialize 30-day trend slots
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      trendMap[d] = { count: 0, volume: 0 };
    }

    allWorkouts.forEach(w => {
      let workoutVol = 0;
      const userName = userMap.get(w.user_id) || '未知用户';

      try {
        const exercises: ExerciseRecord[] = JSON.parse(w.exercises_json || '[]');
        if (Array.isArray(exercises)) {
          exercises.forEach((ex) => {
            const exName = ex.name || ex.exerciseName || '';
            const group = inferMuscleGroup(exName);
            muscleMap[group] = (muscleMap[group] || 0) + 1;

            const sets = ex.sets || [];
            if (Array.isArray(sets)) {
              sets.forEach((set) => {
                if (set.completed !== false && set.isCompleted !== false) {
                  const weight = Number(set.weight) || 0;
                  const reps = Number(set.reps) || 0;
                  const setVol = weight * reps;
                  workoutVol += setVol;

                  // Track 1RM for Big 3
                  const e1rm = calculate1RM(weight, reps);
                  if (/卧推|bench/i.test(exName) && e1rm > prRecords.bench.max1RM) {
                    prRecords.bench = { exercise: exName, max1RM: e1rm, weight, reps, username: userName, date: w.date };
                  } else if (/深蹲|squat/i.test(exName) && e1rm > prRecords.squat.max1RM) {
                    prRecords.squat = { exercise: exName, max1RM: e1rm, weight, reps, username: userName, date: w.date };
                  } else if (/硬拉|deadlift/i.test(exName) && e1rm > prRecords.deadlift.max1RM) {
                    prRecords.deadlift = { exercise: exName, max1RM: e1rm, weight, reps, username: userName, date: w.date };
                  }
                }
              });
            }
          });
        }
      } catch (err) {
        console.warn(`[admin/overview] Failed parsing exercises_json for workout ${w.id}:`, err);
      }

      totalVolumeKg += workoutVol;

      if (trendMap[w.date]) {
        trendMap[w.date].count += 1;
        trendMap[w.date].volume += Math.round(workoutVol);
      }
    });

    const trend30Days = Object.entries(trendMap).map(([date, data]) => ({
      date,
      count: data.count,
      volume: data.volume,
    }));

    const muscleDistribution = Object.entries(muscleMap).map(([name, value]) => ({
      name,
      value,
    })).sort((a, b) => b.value - a.value);

    // Latest 10 workout records
    const recentWorkoutsRows = db.prepare(`
      SELECT w.id, w.user_id, u.username, w.date, w.title, w.duration_minutes, w.exercises_json, w.created_at
      FROM workouts w
      LEFT JOIN users u ON w.user_id = u.id
      WHERE w.is_deleted = 0
      ORDER BY w.created_at DESC
      LIMIT 10
    `).all() as Array<WorkoutDbRow & { username: string | null }>;

    const recentWorkouts = recentWorkoutsRows.map(row => {
      let exCount = 0;
      let vol = 0;
      try {
        const exs: ExerciseRecord[] = JSON.parse(row.exercises_json || '[]');
        exCount = exs.length;
        exs.forEach((e) => {
          (e.sets || []).forEach((s) => {
            if (s.completed !== false && s.isCompleted !== false) {
              vol += (Number(s.weight) || 0) * (Number(s.reps) || 0);
            }
          });
        });
      } catch (err) {
        console.warn(`[admin/overview] Failed parsing recent workout exercises ${row.id}:`, err);
      }

      return {
        id: row.id,
        userId: row.user_id,
        username: row.username || '匿名用户',
        date: row.date,
        title: row.title,
        durationMinutes: row.duration_minutes || 0,
        exerciseCount: exCount,
        volumeKg: Math.round(vol),
        createdAt: row.created_at,
      };
    });

    // Database size on disk
    const dataDir = process.env.DATA_DIR || path.resolve(process.cwd(), 'data');
    const dbPath = process.env.DB_PATH || path.join(dataDir, 'irontrack.db');
    let dbSizeBytes = 0;
    let walSizeBytes = 0;
    try {
      if (fs.existsSync(dbPath)) dbSizeBytes = fs.statSync(dbPath).size;
      const walPath = `${dbPath}-wal`;
      if (fs.existsSync(walPath)) walSizeBytes = fs.statSync(walPath).size;
    } catch (err) {
      console.warn('[admin/overview] Failed reading DB file stats:', err);
    }

    const memUsage = process.memoryUsage();

    res.json({
      success: true,
      kpis: {
        totalUsers,
        activeUsers7d,
        totalWorkouts,
        totalVolumeKg: Math.round(totalVolumeKg),
        totalTonnage: Math.round(totalVolumeKg / 1000 * 10) / 10, // in Metric Tons
        totalCustomExercises,
        totalTemplates,
        totalBodyMetrics,
        todayWorkoutsCount: todayWorkouts,
      },
      trend30Days,
      muscleDistribution,
      recentWorkouts,
      strengthRecords: Object.values(prRecords),
      systemInfo: {
        dbSizeBytes,
        walSizeBytes,
        dbSizeFormatted: `${(dbSizeBytes / (1024 * 1024)).toFixed(2)} MB`,
        walSizeFormatted: `${(walSizeBytes / (1024 * 1024)).toFixed(2)} MB`,
        serverUptimeSeconds: Math.round(process.uptime()),
        nodeVersion: process.version,
        memoryUsageMb: Math.round(memUsage.rss / (1024 * 1024)),
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('Error in /api/admin/overview:', err);
    res.status(500).json({ error: errorMsg || '获取管理大盘数据失败' });
  }
});

// ---------------------------------------------------------------------------
// 2. User Management
// ---------------------------------------------------------------------------
adminRouter.get('/users', (req: AuthenticatedRequest, res) => {
  try {
    const { keyword = '', role = '', status = '', page = '1', pageSize = '20' } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(pageSize as string, 10) || 20));
    const offset = (pageNum - 1) * limit;

    let whereClause = '1=1';
    const params: unknown[] = [];

    if (keyword) {
      whereClause += ' AND u.username LIKE ?';
      params.push(`%${(keyword as string).trim()}%`);
    }
    if (role) {
      whereClause += ' AND u.role = ?';
      params.push(role);
    }
    if (status) {
      whereClause += ' AND u.status = ?';
      params.push(status);
    }

    const countRow = db.prepare(`SELECT COUNT(*) as total FROM users u WHERE ${whereClause}`).get(...params) as TotalRow | undefined;
    const total = countRow?.total || 0;

    // Query user list with aggregated statistics
    const query = `
      SELECT 
        u.id, 
        u.username, 
        u.role, 
        u.status, 
        u.last_login_at, 
        u.created_at, 
        u.updated_at,
        (SELECT COUNT(*) FROM workouts WHERE user_id = u.id AND is_deleted = 0) as workout_count,
        (SELECT MAX(date) FROM workouts WHERE user_id = u.id AND is_deleted = 0) as last_workout_date,
        (SELECT COUNT(*) FROM custom_exercises WHERE user_id = u.id AND is_deleted = 0) as custom_exercise_count,
        (SELECT COUNT(*) FROM templates WHERE user_id = u.id AND is_deleted = 0) as template_count,
        (SELECT COUNT(*) FROM body_metrics WHERE user_id = u.id AND is_deleted = 0) as body_metric_count
      FROM users u
      WHERE ${whereClause}
      ORDER BY u.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const userRows = db.prepare(query).all(...params, limit, offset) as UserListRow[];

    // Batch query user workouts to avoid N+1 query bottleneck
    const userIds = userRows.map(u => u.id);
    const volumeByUserId = new Map<string, number>();

    if (userIds.length > 0) {
      const placeholders = userIds.map(() => '?').join(',');
      const batchWorkouts = db.prepare(`
        SELECT user_id, exercises_json 
        FROM workouts 
        WHERE user_id IN (${placeholders}) AND is_deleted = 0
      `).all(...userIds) as Array<{ user_id: string; exercises_json: string | null }>;

      batchWorkouts.forEach(w => {
        try {
          const exs: ExerciseRecord[] = JSON.parse(w.exercises_json || '[]');
          let vol = 0;
          exs.forEach(e => {
            (e.sets || []).forEach(s => {
              if (s.completed !== false && s.isCompleted !== false) {
                vol += (Number(s.weight) || 0) * (Number(s.reps) || 0);
              }
            });
          });
          volumeByUserId.set(w.user_id, (volumeByUserId.get(w.user_id) || 0) + vol);
        } catch (err) {
          console.warn(`[admin/users] Failed parsing workout JSON for user ${w.user_id}:`, err);
        }
      });
    }

    const usersWithVolume = userRows.map(u => ({
      id: u.id,
      username: u.username,
      role: u.role,
      status: u.status,
      lastLoginAt: u.last_login_at || null,
      createdAt: u.created_at,
      updatedAt: u.updated_at,
      workoutCount: u.workout_count,
      lastWorkoutDate: u.last_workout_date || null,
      customExerciseCount: u.custom_exercise_count,
      templateCount: u.template_count,
      bodyMetricCount: u.body_metric_count,
      totalVolumeKg: Math.round(volumeByUserId.get(u.id) || 0),
    }));

    res.json({
      success: true,
      data: usersWithVolume,
      pagination: {
        page: pageNum,
        pageSize: limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('Error in GET /api/admin/users:', err);
    res.status(500).json({ error: errorMsg || '获取用户列表失败' });
  }
});

// Create new user by Admin
adminRouter.post('/users', (req: AuthenticatedRequest, res) => {
  try {
    const { username, password, role = 'user' } = req.body || {};
    const trimmed = (username || '').trim();
    if (!trimmed || trimmed.length < 2) {
      res.status(400).json({ error: '用户名长度至少为 2 个字符' });
      return;
    }
    if (!password || password.length < 4) {
      res.status(400).json({ error: '密码长度至少为 4 个字符' });
      return;
    }

    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(trimmed) as { id: string } | undefined;
    if (existing) {
      res.status(400).json({ error: '用户名已存在' });
      return;
    }

    const passwordHash = hashPassword(password);
    const id = crypto.randomUUID();
    const now = Date.now();
    const assignedRole = role === 'admin' ? 'admin' : 'user';

    db.prepare(`
      INSERT INTO users (id, username, password_hash, role, status, last_login_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'active', ?, ?, ?)
    `).run(id, trimmed, passwordHash, assignedRole, null, now, now);

    res.json({
      success: true,
      user: { id, username: trimmed, role: assignedRole, status: 'active' },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: errorMsg || '创建用户失败' });
  }
});

// Update user role (admin | user)
adminRouter.put('/users/:id/role', (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body || {};

    if (!role || !['admin', 'user'].includes(role)) {
      res.status(400).json({ error: '无效的角色类型，仅支持 admin 或 user' });
      return;
    }

    const targetUser = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;
    if (!targetUser) {
      res.status(404).json({ error: '用户不存在' });
      return;
    }

    // Safety guard: cannot demote the only remaining admin
    if (targetUser.role === 'admin' && role === 'user') {
      const adminCount = (db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin' AND status = 'active'").get() as CountRow | undefined)?.count || 0;
      if (adminCount <= 1) {
        res.status(400).json({ error: '系统必须保留至少一位活跃管理员，无法将此账号降级' });
        return;
      }
    }

    db.prepare('UPDATE users SET role = ?, updated_at = ? WHERE id = ?').run(role, Date.now(), id);
    res.json({ success: true, message: `已成功将用户【${targetUser.username}】角色变更为 ${role}` });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: errorMsg || '修改角色失败' });
  }
});

// Update user status (active | disabled)
adminRouter.put('/users/:id/status', (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};

    if (!status || !['active', 'disabled'].includes(status)) {
      res.status(400).json({ error: '无效的状态，仅支持 active 或 disabled' });
      return;
    }

    const currentAdminId = req.user!.id;
    if (id === currentAdminId && status === 'disabled') {
      res.status(400).json({ error: '不能停用当前登录的管理员账号自身' });
      return;
    }

    const targetUser = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;
    if (!targetUser) {
      res.status(404).json({ error: '用户不存在' });
      return;
    }

    db.prepare('UPDATE users SET status = ?, updated_at = ? WHERE id = ?').run(status, Date.now(), id);
    res.json({ success: true, message: `已成功将用户【${targetUser.username}】状态设置为 ${status === 'active' ? '正常' : '已停用'}` });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: errorMsg || '修改状态失败' });
  }
});

// Reset user password
adminRouter.post('/users/:id/reset-password', (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body || {};

    if (!newPassword || newPassword.length < 4) {
      res.status(400).json({ error: '新密码长度至少需要 4 位字符' });
      return;
    }

    const targetUser = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;
    if (!targetUser) {
      res.status(404).json({ error: '用户不存在' });
      return;
    }

    const passwordHash = hashPassword(newPassword);
    db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?').run(passwordHash, Date.now(), id);

    res.json({ success: true, message: `已成功为用户【${targetUser.username}】重置新密码` });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: errorMsg || '重置密码失败' });
  }
});

// Delete user and cascade workout data
adminRouter.delete('/users/:id', (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const currentAdminId = req.user!.id;

    if (id === currentAdminId) {
      res.status(400).json({ error: '无法删除当前正在登录的管理员自身账号' });
      return;
    }

    const targetUser = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;
    if (!targetUser) {
      res.status(404).json({ error: '用户不存在' });
      return;
    }

    db.transaction(() => {
      db.prepare('DELETE FROM workouts WHERE user_id = ?').run(id);
      db.prepare('DELETE FROM custom_exercises WHERE user_id = ?').run(id);
      db.prepare('DELETE FROM templates WHERE user_id = ?').run(id);
      db.prepare('DELETE FROM body_metrics WHERE user_id = ?').run(id);
      db.prepare('DELETE FROM users WHERE id = ?').run(id);
    })();

    res.json({ success: true, message: `已成功永久删除用户【${targetUser.username}】及其全部训练数据` });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: errorMsg || '删除用户失败' });
  }
});

// Export single user full JSON backup (App-compatible)
adminRouter.get('/users/:id/export', (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const user = db.prepare('SELECT id, username, role, created_at FROM users WHERE id = ?').get(id) as UserRow | undefined;
    if (!user) {
      res.status(404).json({ error: '用户不存在' });
      return;
    }

    const workouts = db.prepare('SELECT * FROM workouts WHERE user_id = ? AND is_deleted = 0 ORDER BY date ASC').all(id) as WorkoutDbRow[];
    const customExercises = db.prepare('SELECT * FROM custom_exercises WHERE user_id = ? AND is_deleted = 0').all(id) as Array<{ id: string; data_json: string }>;
    const templates = db.prepare('SELECT * FROM templates WHERE user_id = ? AND is_deleted = 0').all(id) as Array<{ id: string; name: string; category: string; description: string; exercises_json: string; created_at: number }>;
    const bodyMetrics = db.prepare('SELECT * FROM body_metrics WHERE user_id = ? AND is_deleted = 0 ORDER BY date ASC').all(id) as BodyMetricDbRow[];

    const backupData = {
      version: '1.1.4',
      exportDate: new Date().toISOString(),
      user: { id: user.id, username: user.username },
      workouts: workouts.map(w => ({
        id: w.id,
        date: w.date,
        title: w.title,
        durationMinutes: w.duration_minutes,
        exercises: JSON.parse(w.exercises_json || '[]'),
        notes: w.notes,
        createdAt: w.created_at,
        updatedAt: w.updated_at,
      })),
      customExercises: customExercises.map(e => ({
        id: e.id,
        data: JSON.parse(e.data_json || '{}'),
      })),
      templates: templates.map(t => ({
        id: t.id,
        name: t.name,
        category: t.category,
        description: t.description,
        exercises: JSON.parse(t.exercises_json || '[]'),
        createdAt: t.created_at,
      })),
      bodyMetrics: bodyMetrics.map(b => ({
        id: b.id,
        date: b.date,
        weightKg: b.weight_kg,
        bodyFatPercent: b.body_fat_percent,
        measurements: JSON.parse(b.measurements_json || '{}'),
        notes: b.notes,
        createdAt: b.created_at,
      })),
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="irontrack_user_${user.username}_backup_${Date.now()}.json"`);
    res.json(backupData);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: errorMsg || '导出用户数据失败' });
  }
});

// ---------------------------------------------------------------------------
// 3. Workouts Explorer
// ---------------------------------------------------------------------------
adminRouter.get('/workouts', (req: AuthenticatedRequest, res) => {
  try {
    const { userId = '', keyword = '', startDate = '', endDate = '', page = '1', pageSize = '20' } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(pageSize as string, 10) || 20));
    const offset = (pageNum - 1) * limit;

    let whereClause = 'w.is_deleted = 0';
    const params: unknown[] = [];

    if (userId) {
      whereClause += ' AND w.user_id = ?';
      params.push(userId);
    }
    if (keyword) {
      whereClause += ' AND (w.title LIKE ? OR w.exercises_json LIKE ? OR w.notes LIKE ?)';
      const kw = `%${(keyword as string).trim()}%`;
      params.push(kw, kw, kw);
    }
    if (startDate) {
      whereClause += ' AND w.date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      whereClause += ' AND w.date <= ?';
      params.push(endDate);
    }

    const countRow = db.prepare(`SELECT COUNT(*) as total FROM workouts w WHERE ${whereClause}`).get(...params) as TotalRow | undefined;
    const total = countRow?.total || 0;

    const query = `
      SELECT 
        w.id, 
        w.user_id, 
        u.username, 
        w.date, 
        w.title, 
        w.duration_minutes, 
        w.exercises_json, 
        w.notes, 
        w.created_at, 
        w.updated_at
      FROM workouts w
      LEFT JOIN users u ON w.user_id = u.id
      WHERE ${whereClause}
      ORDER BY w.date DESC, w.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const rows = db.prepare(query).all(...params, limit, offset) as Array<WorkoutDbRow & { username: string | null }>;

    const workouts = rows.map(r => {
      let exercises: ExerciseRecord[] = [];
      let totalVolume = 0;
      let totalSets = 0;

      try {
        exercises = JSON.parse(r.exercises_json || '[]');
        exercises.forEach((ex) => {
          (ex.sets || []).forEach((set) => {
            totalSets += 1;
            if (set.completed !== false && set.isCompleted !== false) {
              const weight = Number(set.weight) || 0;
              const reps = Number(set.reps) || 0;
              totalVolume += weight * reps;
            }
          });
        });
      } catch (err) {
        console.warn(`[admin/workouts] Failed parsing workout ${r.id} exercises:`, err);
      }

      return {
        id: r.id,
        userId: r.user_id,
        username: r.username || '匿名用户',
        date: r.date,
        title: r.title,
        durationMinutes: r.duration_minutes || 0,
        notes: r.notes || '',
        totalSets,
        volumeKg: Math.round(totalVolume),
        exercisesCount: exercises.length,
        exercises,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      };
    });

    res.json({
      success: true,
      data: workouts,
      pagination: {
        page: pageNum,
        pageSize: limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: errorMsg || '获取训练记录列表失败' });
  }
});

// ---------------------------------------------------------------------------
// 4. Body Metrics Explorer
// ---------------------------------------------------------------------------
adminRouter.get('/body-metrics', (req: AuthenticatedRequest, res) => {
  try {
    const { userId = '', page = '1', pageSize = '30' } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(pageSize as string, 10) || 30));
    const offset = (pageNum - 1) * limit;

    let whereClause = 'b.is_deleted = 0';
    const params: unknown[] = [];

    if (userId) {
      whereClause += ' AND b.user_id = ?';
      params.push(userId);
    }

    const countRow = db.prepare(`SELECT COUNT(*) as total FROM body_metrics b WHERE ${whereClause}`).get(...params) as TotalRow | undefined;
    const total = countRow?.total || 0;

    const query = `
      SELECT b.*, u.username 
      FROM body_metrics b
      LEFT JOIN users u ON b.user_id = u.id
      WHERE ${whereClause}
      ORDER BY b.date DESC, b.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const rows = db.prepare(query).all(...params, limit, offset) as Array<BodyMetricDbRow & { username: string | null }>;

    const data = rows.map(r => ({
      id: r.id,
      userId: r.user_id,
      username: r.username || '匿名用户',
      date: r.date,
      weightKg: r.weight_kg,
      bodyFatPercent: r.body_fat_percent,
      measurements: JSON.parse(r.measurements_json || '{}'),
      notes: r.notes,
      createdAt: r.created_at,
    }));

    res.json({
      success: true,
      data,
      pagination: { page: pageNum, pageSize: limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: errorMsg || '获取体测数据失败' });
  }
});

// ---------------------------------------------------------------------------
// 5. System Maintenance & SQLite Operations
// ---------------------------------------------------------------------------
adminRouter.post('/system/vacuum', (req: AuthenticatedRequest, res) => {
  try {
    const start = Date.now();
    db.exec('VACUUM;');
    const durationMs = Date.now() - start;
    res.json({
      success: true,
      message: `SQLite VACUUM 磁盘整理已顺利完成，耗时 ${durationMs}ms`,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: errorMsg || 'VACUUM 执行失败' });
  }
});

adminRouter.get('/system/download-db', (req: AuthenticatedRequest, res) => {
  try {
    const dataDir = process.env.DATA_DIR || path.resolve(process.cwd(), 'data');
    const dbPath = process.env.DB_PATH || path.join(dataDir, 'irontrack.db');

    if (!fs.existsSync(dbPath)) {
      res.status(404).json({ error: '数据库文件不存在' });
      return;
    }

    // Force checkpoint to flush WAL before sending backup
    db.pragma('wal_checkpoint(TRUNCATE)');

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    res.download(dbPath, `irontrack_backup_${timestamp}.db`);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: errorMsg || '下载数据库快照失败' });
  }
});
