import { Router } from 'express';
import { requireAuth, type AuthenticatedRequest } from '../auth.js';
import { db } from '../db.js';

export const syncRouter = Router();

// Protect all sync routes with JWT authentication
syncRouter.use(requireAuth);

interface SyncWorkoutPayload {
  id: string;
  date?: string;
  title?: string;
  durationMinutes?: number;
  exercises?: unknown[];
  notes?: string;
  createdAt?: number;
  updatedAt?: number;
  isDeleted?: boolean;
}

interface SyncCustomExPayload {
  id: string;
  data?: unknown;
  createdAt?: number;
  updatedAt?: number;
  isDeleted?: boolean;
}

interface SyncTemplatePayload {
  id: string;
  name?: string;
  category?: string;
  description?: string;
  exercises?: unknown[];
  createdAt?: number;
  updatedAt?: number;
  isDeleted?: boolean;
}

interface SyncBodyMetricPayload {
  id: string;
  date?: string;
  weightKg?: number | null;
  bodyFatPercent?: number | null;
  measurements?: Record<string, unknown>;
  notes?: string;
  createdAt?: number;
  updatedAt?: number;
  isDeleted?: boolean;
}

interface SyncPushBody {
  workouts?: SyncWorkoutPayload[];
  customExercises?: SyncCustomExPayload[];
  templates?: SyncTemplatePayload[];
  bodyMetrics?: SyncBodyMetricPayload[];
}

interface DbWorkoutRow {
  id: string;
  date: string;
  title: string;
  duration_minutes: number | null;
  exercises_json: string | null;
  notes: string | null;
  created_at: number;
  updated_at: number;
  is_deleted?: number;
}

interface DbCustomExRow {
  id: string;
  data_json: string | null;
  created_at?: number;
  updated_at: number;
  is_deleted?: number;
}

interface DbTemplateRow {
  id: string;
  name: string;
  category: string;
  description: string | null;
  exercises_json: string | null;
  created_at: number;
  updated_at: number;
  is_deleted?: number;
}

interface DbBodyMetricRow {
  id: string;
  date: string;
  weight_kg: number | null;
  body_fat_percent: number | null;
  measurements_json: string | null;
  notes: string | null;
  created_at: number;
  updated_at: number;
  is_deleted?: number;
}

interface DbSummaryStatsRow {
  total_workouts: number;
  total_duration_minutes: number;
  first_date: string | null;
  latest_date: string | null;
}

interface ExerciseSetItem {
  isCompleted?: boolean;
  weightKg?: number;
  reps?: number;
}

interface ExerciseGroupItem {
  sets?: ExerciseSetItem[];
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
    `).all(userId, lastSyncTime) as DbWorkoutRow[];

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
    `).all(userId, lastSyncTime) as DbCustomExRow[];

    const customExercises = exRows.map(row => ({
      id: row.id,
      ...JSON.parse(row.data_json || '{}'),
      updatedAt: row.updated_at,
      isDeleted: Boolean(row.is_deleted),
    }));

    // Fetch updated templates
    const templateRows = db.prepare(`
      SELECT id, name, category, description, exercises_json, created_at, updated_at, is_deleted
      FROM templates
      WHERE user_id = ? AND updated_at > ?
      ORDER BY updated_at ASC
    `).all(userId, lastSyncTime) as DbTemplateRow[];

    const templates = templateRows.map(row => ({
      id: row.id,
      name: row.name,
      category: row.category,
      description: row.description || '',
      exercises: JSON.parse(row.exercises_json || '[]'),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      isDeleted: Boolean(row.is_deleted),
    }));

    // Fetch updated body metrics
    const metricRows = db.prepare(`
      SELECT id, date, weight_kg, body_fat_percent, measurements_json, notes, created_at, updated_at, is_deleted
      FROM body_metrics
      WHERE user_id = ? AND updated_at > ?
      ORDER BY updated_at ASC
    `).all(userId, lastSyncTime) as DbBodyMetricRow[];

    const bodyMetrics = metricRows.map(row => ({
      id: row.id,
      date: row.date,
      weightKg: row.weight_kg != null ? Number(row.weight_kg) : undefined,
      bodyFatPercent: row.body_fat_percent != null ? Number(row.body_fat_percent) : undefined,
      measurements: JSON.parse(row.measurements_json || '{}'),
      notes: row.notes || '',
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      isDeleted: Boolean(row.is_deleted),
    }));

    res.json({
      success: true,
      serverTime: now,
      workouts,
      customExercises,
      templates,
      bodyMetrics,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('Error in /api/sync/pull:', err);
    res.status(500).json({ error: '拉取云端数据失败: ' + errorMsg });
  }
});

// 2. Push client updates to server (upsert with Last-Write-Wins conflict resolution)
syncRouter.post('/push', (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const { workouts = [], customExercises = [], templates = [], bodyMetrics = [] } = (req.body || {}) as SyncPushBody;
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

    const upsertTemplateStmt = db.prepare(`
      INSERT INTO templates (id, user_id, name, category, description, exercises_json, created_at, updated_at, is_deleted)
      VALUES (@id, @userId, @name, @category, @description, @exercisesJson, @createdAt, @updatedAt, @isDeleted)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        category = excluded.category,
        description = excluded.description,
        exercises_json = excluded.exercises_json,
        created_at = excluded.created_at,
        updated_at = excluded.updated_at,
        is_deleted = excluded.is_deleted
      WHERE excluded.updated_at >= templates.updated_at
    `);

    const upsertBodyMetricStmt = db.prepare(`
      INSERT INTO body_metrics (id, user_id, date, weight_kg, body_fat_percent, measurements_json, notes, created_at, updated_at, is_deleted)
      VALUES (@id, @userId, @date, @weightKg, @bodyFatPercent, @measurementsJson, @notes, @createdAt, @updatedAt, @isDeleted)
      ON CONFLICT(id) DO UPDATE SET
        date = excluded.date,
        weight_kg = excluded.weight_kg,
        body_fat_percent = excluded.body_fat_percent,
        measurements_json = excluded.measurements_json,
        notes = excluded.notes,
        created_at = excluded.created_at,
        updated_at = excluded.updated_at,
        is_deleted = excluded.is_deleted
      WHERE excluded.updated_at >= body_metrics.updated_at
    `);

    // Execute in a single fast transaction
    const pushTransaction = db.transaction(() => {
      let workoutsPushed = 0;
      let exercisesPushed = 0;
      let templatesPushed = 0;
      let bodyMetricsPushed = 0;

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
        const createdAt = ex.createdAt || now;
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

      for (const t of templates) {
        if (!t.id) continue;
        const updatedAt = t.updatedAt || now;
        const createdAt = t.createdAt || now;
        upsertTemplateStmt.run({
          id: t.id,
          userId,
          name: t.name || '未命名模版',
          category: t.category || 'custom',
          description: t.description || '',
          exercisesJson: JSON.stringify(t.exercises || []),
          createdAt,
          updatedAt,
          isDeleted: t.isDeleted ? 1 : 0,
        });
        templatesPushed++;
      }

      for (const bm of bodyMetrics) {
        if (!bm.id) continue;
        const updatedAt = bm.updatedAt || now;
        const createdAt = bm.createdAt || now;
        upsertBodyMetricStmt.run({
          id: bm.id,
          userId,
          date: bm.date || new Date(createdAt).toISOString().split('T')[0],
          weightKg: bm.weightKg != null ? bm.weightKg : null,
          bodyFatPercent: bm.bodyFatPercent != null ? bm.bodyFatPercent : null,
          measurementsJson: JSON.stringify(bm.measurements || {}),
          notes: bm.notes || '',
          createdAt,
          updatedAt,
          isDeleted: bm.isDeleted ? 1 : 0,
        });
        bodyMetricsPushed++;
      }

      return { workoutsPushed, exercisesPushed, templatesPushed, bodyMetricsPushed };
    });

    const result = pushTransaction();

    res.json({
      success: true,
      serverTime: now,
      ...result,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('Error in /api/sync/push:', err);
    res.status(500).json({ error: '推送数据到小主机失败: ' + errorMsg });
  }
});

// 3. Migrate all local data to cloud (One-click initial upload)
syncRouter.post('/migrate', (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const { workouts = [], customExercises = [], templates = [], bodyMetrics = [] } = (req.body || {}) as SyncPushBody;
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

    const insertTemplate = db.prepare(`
      INSERT INTO templates (id, user_id, name, category, description, exercises_json, created_at, updated_at, is_deleted)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        category = excluded.category,
        description = excluded.description,
        exercises_json = excluded.exercises_json,
        updated_at = excluded.updated_at,
        is_deleted = 0
    `);

    const insertBodyMetric = db.prepare(`
      INSERT INTO body_metrics (id, user_id, date, weight_kg, body_fat_percent, measurements_json, notes, created_at, updated_at, is_deleted)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
      ON CONFLICT(id) DO UPDATE SET
        date = excluded.date,
        weight_kg = excluded.weight_kg,
        body_fat_percent = excluded.body_fat_percent,
        measurements_json = excluded.measurements_json,
        notes = excluded.notes,
        updated_at = excluded.updated_at,
        is_deleted = 0
    `);

    const migrateTx = db.transaction(() => {
      let wCount = 0;
      let eCount = 0;
      let tCount = 0;
      let bCount = 0;

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
          JSON.stringify(ex.data || ex),
          now,
          now
        );
        eCount++;
      }

      for (const t of templates) {
        if (!t.id) continue;
        insertTemplate.run(
          t.id,
          userId,
          t.name || '模版',
          t.category || 'custom',
          t.description || '',
          JSON.stringify(t.exercises || []),
          t.createdAt || now,
          now
        );
        tCount++;
      }

      for (const bm of bodyMetrics) {
        if (!bm.id) continue;
        insertBodyMetric.run(
          bm.id,
          userId,
          bm.date || new Date().toISOString().split('T')[0],
          bm.weightKg != null ? bm.weightKg : null,
          bm.bodyFatPercent != null ? bm.bodyFatPercent : null,
          JSON.stringify(bm.measurements || {}),
          bm.notes || '',
          bm.createdAt || now,
          now
        );
        bCount++;
      }

      return { workoutsMigrated: wCount, exercisesMigrated: eCount, templatesMigrated: tCount, bodyMetricsMigrated: bCount };
    });

    const result = migrateTx();

    res.json({
      success: true,
      message: `成功迁移 ${result.workoutsMigrated} 条训练记录、${result.exercisesMigrated} 个动作、${result.templatesMigrated} 个模版与 ${result.bodyMetricsMigrated} 条身材记录`,
      serverTime: now,
      ...result,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('Error in /api/sync/migrate:', err);
    res.status(500).json({ error: '迁移本地数据失败: ' + errorMsg });
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
    `).all(userId) as DbWorkoutRow[]).map(row => ({
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
    `).all(userId) as DbCustomExRow[]).map(row => ({
      id: row.id,
      ...JSON.parse(row.data_json || '{}'),
      updatedAt: row.updated_at,
    }));

    const templates = (db.prepare(`
      SELECT id, name, category, description, exercises_json, created_at, updated_at
      FROM templates
      WHERE user_id = ? AND is_deleted = 0
      ORDER BY updated_at DESC
    `).all(userId) as DbTemplateRow[]).map(row => ({
      id: row.id,
      name: row.name,
      category: row.category,
      description: row.description,
      exercises: JSON.parse(row.exercises_json || '[]'),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    const bodyMetrics = (db.prepare(`
      SELECT id, date, weight_kg, body_fat_percent, measurements_json, notes, created_at, updated_at
      FROM body_metrics
      WHERE user_id = ? AND is_deleted = 0
      ORDER BY date DESC
    `).all(userId) as DbBodyMetricRow[]).map(row => ({
      id: row.id,
      date: row.date,
      weightKg: row.weight_kg != null ? Number(row.weight_kg) : undefined,
      bodyFatPercent: row.body_fat_percent != null ? Number(row.body_fat_percent) : undefined,
      measurements: JSON.parse(row.measurements_json || '{}'),
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    res.json({
      app: 'IronTrack',
      version: '1.1.0',
      exportedAt: new Date().toISOString(),
      source: 'J1900-Cloud',
      data: {
        workouts,
        customExercises,
        templates,
        bodyMetrics,
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: '导出云端备份失败: ' + errorMsg });
  }
});

// 5. Get server-cached training stats summary (快速聚合云端缓存统计)
syncRouter.get('/summary', (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  try {
    const totalRow = db.prepare(`
      SELECT 
        COUNT(*) as total_workouts,
        COALESCE(SUM(duration_minutes), 0) as total_duration_minutes,
        MIN(date) as first_date,
        MAX(date) as latest_date
      FROM workouts
      WHERE user_id = ? AND is_deleted = 0
    `).get(userId) as DbSummaryStatsRow | undefined;

    const rows = db.prepare(`
      SELECT exercises_json
      FROM workouts
      WHERE user_id = ? AND is_deleted = 0
    `).all(userId) as Array<{ exercises_json: string | null }>;

    let totalVolumeKg = 0;
    let totalSets = 0;

    for (const r of rows) {
      try {
        const exList: ExerciseGroupItem[] = JSON.parse(r.exercises_json || '[]');
        for (const ex of exList) {
          for (const s of (ex.sets || [])) {
            if (s.isCompleted) {
              totalSets++;
              totalVolumeKg += (s.weightKg || 0) * (s.reps || 0);
            }
          }
        }
      } catch (err) {
        console.warn('[sync/summary] Failed parsing workout exercises JSON:', err);
      }
    }

    res.json({
      success: true,
      cachedAt: Date.now(),
      stats: {
        totalWorkouts: totalRow?.total_workouts || 0,
        totalDurationMinutes: totalRow?.total_duration_minutes || 0,
        totalVolumeKg,
        totalSets,
        firstWorkoutDate: totalRow?.first_date || null,
        latestWorkoutDate: totalRow?.latest_date || null,
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: '获取云端数据统计失败: ' + errorMsg });
  }
});
