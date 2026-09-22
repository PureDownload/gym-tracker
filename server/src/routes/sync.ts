import { Router } from 'express';
import { requireAuth, type AuthenticatedRequest } from '../auth.js';
import { db } from '../db.js';

export const syncRouter = Router();

// Protect all sync routes with JWT authentication
syncRouter.use(requireAuth);

interface SyncPushBody {
  workouts?: Array<{
    id: string;
    date: string;
    title: string;
    durationMinutes?: number;
    exercises: any[];
    notes?: string;
    createdAt?: number;
    updatedAt?: number;
    isDeleted?: boolean;
  }>;
  customExercises?: Array<{
    id: string;
    data: any;
    updatedAt?: number;
    isDeleted?: boolean;
  }>;
}

// 1. Pull incremental updates since lastSyncTime
syncRouter.post('/pull', (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const lastSyncTime = Number(req.body?.lastSyncTime) || 0;
  const now = Date.now();

  try {
    // Fetch updated workouts
    const workoutRows = db.prepare(`
      SELECT id, date, title, duration_minutes, exercises_json, notes, created_at, updated_at, is_deleted
      FROM workouts
      WHERE user_id = ? AND updated_at > ?
      ORDER BY updated_at ASC
    `).all(userId, lastSyncTime) as any[];

    const workouts = workoutRows.map(row => ({
      id: row.id,
      date: row.date,
      title: row.title,
      durationMinutes: row.duration_minutes,
      exercises: JSON.parse(row.exercises_json || '[]'),
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      isDeleted: Boolean(row.is_deleted),
    }));

    // Fetch updated custom exercises
    const exRows = db.prepare(`
      SELECT id, data_json, updated_at, is_deleted
      FROM custom_exercises
      WHERE user_id = ? AND updated_at > ?
      ORDER BY updated_at ASC
    `).all(userId, lastSyncTime) as any[];

    const customExercises = exRows.map(row => ({
      id: row.id,
      ...JSON.parse(row.data_json || '{}'),
      updatedAt: row.updated_at,
      isDeleted: Boolean(row.is_deleted),
    }));

    res.json({
      success: true,
      serverTime: now,
      workouts,
      customExercises,
    });
  } catch (err: any) {
    console.error('Error in /api/sync/pull:', err);
    res.status(500).json({ error: '拉取云端数据失败: ' + err.message });
  }
});

// 2. Push client updates to server (upsert with Last-Write-Wins conflict resolution)
syncRouter.post('/push', (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const { workouts = [], customExercises = [] } = req.body as SyncPushBody;
  const now = Date.now();

  try {
    const upsertWorkoutStmt = db.prepare(`
      INSERT INTO workouts (id, user_id, date, title, duration_minutes, exercises_json, notes, created_at, updated_at, is_deleted)
      VALUES (@id, @userId, @date, @title, @durationMinutes, @exercisesJson, @notes, @createdAt, @updatedAt, @isDeleted)
      ON CONFLICT(id) DO UPDATE SET
        date = excluded.date,
        title = excluded.title,
        duration_minutes = excluded.duration_minutes,
        exercises_json = excluded.exercises_json,
        notes = excluded.notes,
        created_at = excluded.created_at,
        updated_at = excluded.updated_at,
        is_deleted = excluded.is_deleted
      WHERE excluded.updated_at >= workouts.updated_at
    `);

    const upsertCustomExStmt = db.prepare(`
      INSERT INTO custom_exercises (id, user_id, data_json, created_at, updated_at, is_deleted)
      VALUES (@id, @userId, @dataJson, @createdAt, @updatedAt, @isDeleted)
      ON CONFLICT(id) DO UPDATE SET
        data_json = excluded.data_json,
        updated_at = excluded.updated_at,
        is_deleted = excluded.is_deleted
      WHERE excluded.updated_at >= custom_exercises.updated_at
    `);

    // Execute in a single fast transaction
    const pushTransaction = db.transaction(() => {
      let workoutsPushed = 0;
      let exercisesPushed = 0;

      for (const w of workouts) {
        if (!w.id) continue;
        const updatedAt = w.updatedAt || now;
        const createdAt = w.createdAt || now;
        upsertWorkoutStmt.run({
          id: w.id,
          userId,
          date: w.date || new Date(createdAt).toISOString().split('T')[0],
          title: w.title || '训练记录',
          durationMinutes: w.durationMinutes || 0,
          exercisesJson: JSON.stringify(w.exercises || []),
          notes: w.notes || '',
          createdAt,
          updatedAt,
          isDeleted: w.isDeleted ? 1 : 0,
        });
        workoutsPushed++;
      }

      for (const ex of customExercises) {
        if (!ex.id) continue;
        const updatedAt = ex.updatedAt || now;
        const createdAt = now;
        upsertCustomExStmt.run({
          id: ex.id,
          userId,
          dataJson: JSON.stringify(ex.data || ex),
          createdAt,
          updatedAt,
          isDeleted: ex.isDeleted ? 1 : 0,
        });
        exercisesPushed++;
      }

      return { workoutsPushed, exercisesPushed };
    });

    const result = pushTransaction();

    res.json({
      success: true,
      serverTime: now,
      ...result,
    });
  } catch (err: any) {
    console.error('Error in /api/sync/push:', err);
    res.status(500).json({ error: '推送数据到小主机失败: ' + err.message });
  }
});

// 3. Migrate all local data to cloud (One-click initial upload)
syncRouter.post('/migrate', (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const { workouts = [], customExercises = [] } = req.body;
  const now = Date.now();

  try {
    const insertWorkout = db.prepare(`
      INSERT INTO workouts (id, user_id, date, title, duration_minutes, exercises_json, notes, created_at, updated_at, is_deleted)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
      ON CONFLICT(id) DO UPDATE SET
        date = excluded.date,
        title = excluded.title,
        duration_minutes = excluded.duration_minutes,
        exercises_json = excluded.exercises_json,
        notes = excluded.notes,
        updated_at = excluded.updated_at,
        is_deleted = 0
    `);

    const insertEx = db.prepare(`
      INSERT INTO custom_exercises (id, user_id, data_json, created_at, updated_at, is_deleted)
      VALUES (?, ?, ?, ?, ?, 0)
      ON CONFLICT(id) DO UPDATE SET
        data_json = excluded.data_json,
        updated_at = excluded.updated_at,
        is_deleted = 0
    `);

    const migrateTx = db.transaction(() => {
      let wCount = 0;
      let eCount = 0;

      for (const w of workouts) {
        if (!w.id) continue;
        const createdAt = w.createdAt || now;
        insertWorkout.run(
          w.id,
          userId,
          w.date || new Date().toISOString().split('T')[0],
          w.title || '训练记录',
          w.durationMinutes || 0,
          JSON.stringify(w.exercises || []),
          w.notes || '',
          createdAt,
          now
        );
        wCount++;
      }

      for (const ex of customExercises) {
        if (!ex.id) continue;
        insertEx.run(
          ex.id,
          userId,
          JSON.stringify(ex),
          now,
          now
        );
        eCount++;
      }

      return { workoutsMigrated: wCount, exercisesMigrated: eCount };
    });

    const result = migrateTx();

    res.json({
      success: true,
      message: `成功迁移 ${result.workoutsMigrated} 条训练记录与 ${result.exercisesMigrated} 个自定义动作`,
      serverTime: now,
      ...result,
    });
  } catch (err: any) {
    console.error('Error in /api/sync/migrate:', err);
    res.status(500).json({ error: '迁移本地数据失败: ' + err.message });
  }
});

// 4. Get full cloud backup snapshot (all active data for current user)
syncRouter.get('/backup', (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  try {
    const workouts = (db.prepare(`
      SELECT id, date, title, duration_minutes, exercises_json, notes, created_at, updated_at
      FROM workouts
      WHERE user_id = ? AND is_deleted = 0
      ORDER BY date DESC, created_at DESC
    `).all(userId) as any[]).map(row => ({
      id: row.id,
      date: row.date,
      title: row.title,
      durationMinutes: row.duration_minutes,
      exercises: JSON.parse(row.exercises_json || '[]'),
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    const customExercises = (db.prepare(`
      SELECT id, data_json, updated_at
      FROM custom_exercises
      WHERE user_id = ? AND is_deleted = 0
    `).all(userId) as any[]).map(row => ({
      id: row.id,
      ...JSON.parse(row.data_json || '{}'),
      updatedAt: row.updated_at,
    }));

    res.json({
      app: 'IronTrack',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      source: 'J1900-Cloud',
      data: {
        workouts,
        customExercises,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: '导出云端备份失败: ' + err.message });
  }
});
