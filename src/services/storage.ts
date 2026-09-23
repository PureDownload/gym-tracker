import type { WorkoutSession, Exercise, WorkoutTemplate, BodyMetricEntry } from '../types/workout';
import { PRESET_TEMPLATES } from '../data/presetTemplates';

const DB_NAME = 'IronTrackDB';
const DB_VERSION = 2;
const WORKOUTS_STORE = 'workouts';
const CUSTOM_EXERCISES_STORE = 'custom_exercises';
const TEMPLATES_STORE = 'templates';
const BODY_METRICS_STORE = 'body_metrics';

const LS_WORKOUTS_KEY = 'irontrack_workouts_backup';
const LS_CUSTOM_EX_KEY = 'irontrack_custom_exercises';
const LS_PINNED_EX_KEY = 'irontrack_pinned_exercises';
const LS_TEMPLATES_KEY = 'irontrack_templates';
const LS_BODY_METRICS_KEY = 'irontrack_body_metrics';
const LS_USER_PROFILE_KEY = 'irontrack_user_profile';
const LS_PENDING_QUEUE_KEY = 'irontrack_pending_sync_queue';

export interface PendingSyncItem {
  type:
    | 'upsert_workout'
    | 'delete_workout'
    | 'upsert_template'
    | 'delete_template'
    | 'upsert_body_metric'
    | 'delete_body_metric';
  payload: any;
  timestamp: number;
}

class StorageService {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private initDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB not supported'));
        return;
      }

      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(WORKOUTS_STORE)) {
          db.createObjectStore(WORKOUTS_STORE, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(CUSTOM_EXERCISES_STORE)) {
          db.createObjectStore(CUSTOM_EXERCISES_STORE, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(TEMPLATES_STORE)) {
          db.createObjectStore(TEMPLATES_STORE, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(BODY_METRICS_STORE)) {
          db.createObjectStore(BODY_METRICS_STORE, { keyPath: 'id' });
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        console.warn('IndexedDB failed to open, falling back to LocalStorage', request.error);
        reject(request.error);
      };
    });

    return this.dbPromise;
  }

  // Workouts CRUD
  async getWorkouts(): Promise<WorkoutSession[]> {
    try {
      const db = await this.initDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(WORKOUTS_STORE, 'readonly');
        const store = tx.objectStore(WORKOUTS_STORE);
        const req = store.getAll();
        req.onsuccess = () => {
          let list = (req.result || []) as WorkoutSession[];
          // Sort by date/timestamp descending
          list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
          if (list.length === 0) {
            // Check localStorage
            const localData = this.getFromLocalStorage<WorkoutSession[]>(LS_WORKOUTS_KEY);
            if (localData && localData.length > 0) {
              list = localData;
            }
          }
          this.saveToLocalStorage(LS_WORKOUTS_KEY, list);
          resolve(list);
        };
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn('Fallback to LocalStorage for getWorkouts', e);
      const localData = this.getFromLocalStorage<WorkoutSession[]>(LS_WORKOUTS_KEY) || [];
      return localData.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    }
  }

  async saveWorkout(session: WorkoutSession): Promise<void> {
    try {
      const db = await this.initDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(WORKOUTS_STORE, 'readwrite');
        const store = tx.objectStore(WORKOUTS_STORE);
        const req = store.put(session);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn('Failed saving to IndexedDB, fallback to LS', e);
    }
    // Always mirror to localStorage as safety
    const current = this.getFromLocalStorage<WorkoutSession[]>(LS_WORKOUTS_KEY) || [];
    const index = current.findIndex(w => w.id === session.id);
    if (index >= 0) {
      current[index] = session;
    } else {
      current.unshift(session);
    }
    this.saveToLocalStorage(LS_WORKOUTS_KEY, current);
  }

  async deleteWorkout(id: string): Promise<void> {
    try {
      const db = await this.initDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(WORKOUTS_STORE, 'readwrite');
        const store = tx.objectStore(WORKOUTS_STORE);
        const req = store.delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn('Failed deleting from IndexedDB', e);
    }
    const current = this.getFromLocalStorage<WorkoutSession[]>(LS_WORKOUTS_KEY) || [];
    const filtered = current.filter(w => w.id !== id);
    this.saveToLocalStorage(LS_WORKOUTS_KEY, filtered);
  }

  public async saveWorkoutsBulk(list: WorkoutSession[]): Promise<void> {
    try {
      const db = await this.initDB();
      const tx = db.transaction(WORKOUTS_STORE, 'readwrite');
      const store = tx.objectStore(WORKOUTS_STORE);
      list.forEach(w => store.put(w));
    } catch (e) {
      console.warn('Bulk save to IndexedDB failed', e);
    }
    this.saveToLocalStorage(LS_WORKOUTS_KEY, list);
  }

  public async upsertWorkoutsFromRemote(incoming: WorkoutSession[]): Promise<void> {
    if (incoming.length === 0) return;
    const current = await this.getWorkouts();
    const map = new Map<string, WorkoutSession>();
    current.forEach(w => map.set(w.id, w));
    incoming.forEach(w => map.set(w.id, w));
    const merged = Array.from(map.values()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    await this.saveWorkoutsBulk(merged);
  }

  public async upsertCustomExercisesFromRemote(incoming: Exercise[]): Promise<void> {
    if (incoming.length === 0) return;
    const current = await this.getCustomExercises();
    const map = new Map<string, Exercise>();
    current.forEach(e => map.set(e.id, e));
    incoming.forEach(e => map.set(e.id, e));
    const merged = Array.from(map.values());
    try {
      const db = await this.initDB();
      const tx = db.transaction(CUSTOM_EXERCISES_STORE, 'readwrite');
      const store = tx.objectStore(CUSTOM_EXERCISES_STORE);
      merged.forEach(e => store.put(e));
    } catch (e) {
      console.warn('Bulk save custom exercises to IndexedDB failed', e);
    }
    this.saveToLocalStorage(LS_CUSTOM_EX_KEY, merged);
  }

  // Custom exercises CRUD
  async getCustomExercises(): Promise<Exercise[]> {
    try {
      const db = await this.initDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(CUSTOM_EXERCISES_STORE, 'readonly');
        const store = tx.objectStore(CUSTOM_EXERCISES_STORE);
        const req = store.getAll();
        req.onsuccess = () => {
          const list = (req.result || []) as Exercise[];
          this.saveToLocalStorage(LS_CUSTOM_EX_KEY, list);
          resolve(list);
        };
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      return this.getFromLocalStorage<Exercise[]>(LS_CUSTOM_EX_KEY) || [];
    }
  }

  async saveCustomExercise(exercise: Exercise): Promise<void> {
    try {
      const db = await this.initDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(CUSTOM_EXERCISES_STORE, 'readwrite');
        const store = tx.objectStore(CUSTOM_EXERCISES_STORE);
        const req = store.put(exercise);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn('Failed to save custom exercise in IDB', e);
    }
    const current = this.getFromLocalStorage<Exercise[]>(LS_CUSTOM_EX_KEY) || [];
    const index = current.findIndex(e => e.id === exercise.id);
    if (index >= 0) {
      current[index] = exercise;
    } else {
      current.push(exercise);
    }
    this.saveToLocalStorage(LS_CUSTOM_EX_KEY, current);
  }

  async deleteCustomExercise(id: string): Promise<void> {
    try {
      const db = await this.initDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(CUSTOM_EXERCISES_STORE, 'readwrite');
        const store = tx.objectStore(CUSTOM_EXERCISES_STORE);
        const req = store.delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn('Failed to delete custom exercise from IDB', e);
    }
    const current = this.getFromLocalStorage<Exercise[]>(LS_CUSTOM_EX_KEY) || [];
    const filtered = current.filter(e => e.id !== id);
    this.saveToLocalStorage(LS_CUSTOM_EX_KEY, filtered);
  }

  // Pinned Exercises
  getPinnedExerciseIds(): string[] {
    const list = this.getFromLocalStorage<string[]>(LS_PINNED_EX_KEY);
    if (!list) {
      // Default pinned classics: Flat bench, Deadlift, Squat, OHP
      const defaultPinned = ['chest_bb_flat_bench', 'back_deadlift', 'legs_bb_squat'];
      this.saveToLocalStorage(LS_PINNED_EX_KEY, defaultPinned);
      return defaultPinned;
    }
    return list;
  }

  togglePinnedExercise(exerciseId: string): string[] {
    const current = this.getPinnedExerciseIds();
    let updated: string[];
    if (current.includes(exerciseId)) {
      updated = current.filter(id => id !== exerciseId);
    } else {
      updated = [exerciseId, ...current];
    }
    this.saveToLocalStorage(LS_PINNED_EX_KEY, updated);
    return updated;
  }

  // -------------------------------------------------------------
  // Workout Templates CRUD
  // -------------------------------------------------------------
  async getTemplates(): Promise<WorkoutTemplate[]> {
    try {
      const db = await this.initDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(TEMPLATES_STORE, 'readonly');
        const store = tx.objectStore(TEMPLATES_STORE);
        const req = store.getAll();
        req.onsuccess = () => {
          let list = (req.result || []) as WorkoutTemplate[];
          if (list.length === 0) {
            const local = this.getFromLocalStorage<WorkoutTemplate[]>(LS_TEMPLATES_KEY);
            if (local && local.length > 0) {
              list = local;
            } else {
              // Initialize with preset templates
              list = [...PRESET_TEMPLATES];
            }
          }
          this.saveToLocalStorage(LS_TEMPLATES_KEY, list);
          resolve(list);
        };
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      const local = this.getFromLocalStorage<WorkoutTemplate[]>(LS_TEMPLATES_KEY);
      return local && local.length > 0 ? local : [...PRESET_TEMPLATES];
    }
  }

  async saveTemplate(template: WorkoutTemplate): Promise<void> {
    try {
      const db = await this.initDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(TEMPLATES_STORE, 'readwrite');
        const store = tx.objectStore(TEMPLATES_STORE);
        const req = store.put(template);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn('Failed saving template to IDB', e);
    }
    const current = await this.getTemplates();
    const idx = current.findIndex((t) => t.id === template.id);
    if (idx >= 0) {
      current[idx] = template;
    } else {
      current.unshift(template);
    }
    this.saveToLocalStorage(LS_TEMPLATES_KEY, current);
  }

  async deleteTemplate(id: string): Promise<void> {
    try {
      const db = await this.initDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(TEMPLATES_STORE, 'readwrite');
        const store = tx.objectStore(TEMPLATES_STORE);
        const req = store.delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn('Failed deleting template from IDB', e);
    }
    const current = await this.getTemplates();
    const filtered = current.filter((t) => t.id !== id);
    this.saveToLocalStorage(LS_TEMPLATES_KEY, filtered);
  }

  public async upsertTemplatesFromRemote(incoming: WorkoutTemplate[]): Promise<void> {
    if (incoming.length === 0) return;
    const current = await this.getTemplates();
    const map = new Map<string, WorkoutTemplate>();
    current.forEach((t) => map.set(t.id, t));
    incoming.forEach((t) => map.set(t.id, t));
    const merged = Array.from(map.values()).sort(
      (a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)
    );
    try {
      const db = await this.initDB();
      const tx = db.transaction(TEMPLATES_STORE, 'readwrite');
      const store = tx.objectStore(TEMPLATES_STORE);
      merged.forEach((t) => store.put(t));
    } catch (e) {
      console.warn('Bulk save templates to IDB failed', e);
    }
    this.saveToLocalStorage(LS_TEMPLATES_KEY, merged);
  }

  // -------------------------------------------------------------
  // Body Metrics Tracking CRUD
  // -------------------------------------------------------------
  async getBodyMetrics(): Promise<BodyMetricEntry[]> {
    try {
      const db = await this.initDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(BODY_METRICS_STORE, 'readonly');
        const store = tx.objectStore(BODY_METRICS_STORE);
        const req = store.getAll();
        req.onsuccess = () => {
          let list = (req.result || []) as BodyMetricEntry[];
          list.sort((a, b) => b.date.localeCompare(a.date));
          if (list.length === 0) {
            const local = this.getFromLocalStorage<BodyMetricEntry[]>(LS_BODY_METRICS_KEY);
            if (local && local.length > 0) list = local;
          }
          this.saveToLocalStorage(LS_BODY_METRICS_KEY, list);
          resolve(list);
        };
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      const local = this.getFromLocalStorage<BodyMetricEntry[]>(LS_BODY_METRICS_KEY) || [];
      return local.sort((a, b) => b.date.localeCompare(a.date));
    }
  }

  async saveBodyMetric(entry: BodyMetricEntry): Promise<void> {
    try {
      const db = await this.initDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(BODY_METRICS_STORE, 'readwrite');
        const store = tx.objectStore(BODY_METRICS_STORE);
        const req = store.put(entry);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn('Failed saving body metric to IDB', e);
    }
    const current = await this.getBodyMetrics();
    const idx = current.findIndex((m) => m.id === entry.id || m.date === entry.date);
    if (idx >= 0) {
      current[idx] = entry;
    } else {
      current.push(entry);
    }
    current.sort((a, b) => b.date.localeCompare(a.date));
    this.saveToLocalStorage(LS_BODY_METRICS_KEY, current);
  }

  async deleteBodyMetric(id: string): Promise<void> {
    try {
      const db = await this.initDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(BODY_METRICS_STORE, 'readwrite');
        const store = tx.objectStore(BODY_METRICS_STORE);
        const req = store.delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn('Failed deleting body metric from IDB', e);
    }
    const current = await this.getBodyMetrics();
    const filtered = current.filter((m) => m.id !== id);
    this.saveToLocalStorage(LS_BODY_METRICS_KEY, filtered);
  }

  public async upsertBodyMetricsFromRemote(incoming: BodyMetricEntry[]): Promise<void> {
    if (incoming.length === 0) return;
    const current = await this.getBodyMetrics();
    const map = new Map<string, BodyMetricEntry>();
    current.forEach((m) => map.set(m.id, m));
    incoming.forEach((m) => map.set(m.id, m));
    const merged = Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
    try {
      const db = await this.initDB();
      const tx = db.transaction(BODY_METRICS_STORE, 'readwrite');
      const store = tx.objectStore(BODY_METRICS_STORE);
      merged.forEach((m) => store.put(m));
    } catch (e) {
      console.warn('Bulk save body metrics to IDB failed', e);
    }
    this.saveToLocalStorage(LS_BODY_METRICS_KEY, merged);
  }

  // User strength profile (Gender & Default Bodyweight)
  getUserProfile(): { gender: 'male' | 'female'; bodyWeightKg: number } {
    const saved = this.getFromLocalStorage<{
      gender: 'male' | 'female';
      bodyWeightKg: number;
    }>(LS_USER_PROFILE_KEY);
    return saved || { gender: 'male', bodyWeightKg: 70 };
  }

  saveUserProfile(profile: { gender: 'male' | 'female'; bodyWeightKg: number }): void {
    this.saveToLocalStorage(LS_USER_PROFILE_KEY, profile);
  }

  // Backup & Restore
  async exportJSON(): Promise<string> {
    const workouts = await this.getWorkouts();
    const customExercises = await this.getCustomExercises();
    const templates = await this.getTemplates();
    const bodyMetrics = await this.getBodyMetrics();
    const backupObj = {
      app: 'IronTrack',
      version: '1.1.0',
      exportedAt: new Date().toISOString(),
      data: {
        workouts,
        customExercises,
        templates,
        bodyMetrics,
      },
    };
    return JSON.stringify(backupObj, null, 2);
  }

  async importJSON(
    jsonStr: string
  ): Promise<{ success: boolean; count: number; error?: string }> {
    try {
      const parsed = JSON.parse(jsonStr);
      const workouts: WorkoutSession[] =
        parsed?.data?.workouts || (Array.isArray(parsed) ? parsed : []);
      const customExercises: Exercise[] = parsed?.data?.customExercises || [];
      const templates: WorkoutTemplate[] = parsed?.data?.templates || [];
      const bodyMetrics: BodyMetricEntry[] = parsed?.data?.bodyMetrics || [];

      if (!Array.isArray(workouts)) {
        throw new Error('导入文件格式不正确，缺少有效的训练记录数据');
      }

      await this.saveWorkoutsBulk(workouts);
      for (const ex of customExercises) {
        await this.saveCustomExercise(ex);
      }
      for (const t of templates) {
        await this.saveTemplate(t);
      }
      for (const bm of bodyMetrics) {
        await this.saveBodyMetric(bm);
      }

      return { success: true, count: workouts.length };
    } catch (err: any) {
      return { success: false, count: 0, error: err.message || '解析 JSON 失败' };
    }
  }

  async resetToSampleData(): Promise<void> {
    const samples = this.getSeedWorkouts();
    await this.saveWorkoutsBulk(samples);
  }

  async clearAllData(): Promise<void> {
    try {
      const db = await this.initDB();
      const tx = db.transaction([WORKOUTS_STORE, CUSTOM_EXERCISES_STORE], 'readwrite');
      tx.objectStore(WORKOUTS_STORE).clear();
      tx.objectStore(CUSTOM_EXERCISES_STORE).clear();
    } catch (e) {
      console.warn('Failed clearing IndexedDB', e);
    }
    localStorage.removeItem(LS_WORKOUTS_KEY);
    localStorage.removeItem(LS_CUSTOM_EX_KEY);
  }

  // Local storage helpers
  private getFromLocalStorage<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  private saveToLocalStorage(key: string, val: any): void {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) {
      console.warn('LocalStorage save error', e);
    }
  }

  // Seed sample data showcasing realistic progressive overload
  private getSeedWorkouts(): WorkoutSession[] {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    return [
      {
        id: 'session_demo_cardio_1',
        date: new Date(now - 2 * dayMs).toISOString().split('T')[0],
        title: '有氧减脂与心肺恢复日',
        durationMinutes: 45,
        createdAt: now - 2 * dayMs,
        notes: '坡度快走维持 Zone 2 心率，排酸效果非常好。',
        exercises: [
          {
            id: 'demo_ex_c_1',
            exerciseId: 'cardio_treadmill',
            exerciseName: '跑步机坡度快走 / 慢跑',
            category: 'cardio',
            isCardio: true,
            sets: [
              { id: 'cs1', setNumber: 1, weightKg: 0, reps: 0, durationMinutes: 30, distanceKm: 4.5, caloriesKcal: 290, heartRateBpm: 136, isCompleted: true, type: 'normal' },
              { id: 'cs2', setNumber: 2, weightKg: 0, reps: 0, durationMinutes: 10, distanceKm: 1.2, caloriesKcal: 95, heartRateBpm: 145, isCompleted: true, type: 'normal' },
            ],
          },
          {
            id: 'demo_ex_c_2',
            exerciseId: 'cardio_rowing_machine',
            exerciseName: '划船机冲刺 / 耐力划',
            category: 'cardio',
            isCardio: true,
            sets: [
              { id: 'cs3', setNumber: 1, weightKg: 0, reps: 0, durationMinutes: 10, distanceKm: 2.0, caloriesKcal: 110, heartRateBpm: 152, isCompleted: true, type: 'normal' },
            ],
          },
        ],
      },
      {
        id: 'session_demo_4',
        date: new Date(now - 1 * dayMs).toISOString().split('T')[0],
        title: '胸与三头力量进阶日',
        durationMinutes: 65,
        createdAt: now - 1 * dayMs,
        notes: '推力状态极佳，卧推已突破70kg，下周准备冲击 72.5kg！',
        exercises: [
          {
            id: 'demo_ex_4_1',
            exerciseId: 'chest_bb_flat_bench',
            exerciseName: '杠铃平板卧推',
            category: 'chest',
            sets: [
              { id: 's1', setNumber: 1, weightKg: 50, reps: 12, isCompleted: true, type: 'warmup' },
              { id: 's2', setNumber: 2, weightKg: 65, reps: 8, isCompleted: true, type: 'normal' },
              { id: 's3', setNumber: 3, weightKg: 70, reps: 8, isCompleted: true, type: 'normal' },
              { id: 's4', setNumber: 4, weightKg: 70, reps: 7, isCompleted: true, type: 'normal' },
            ],
          },
          {
            id: 'demo_ex_4_2',
            exerciseId: 'chest_db_incline_bench',
            exerciseName: '上斜哑铃卧推',
            category: 'chest',
            sets: [
              { id: 's5', setNumber: 1, weightKg: 22, reps: 10, isCompleted: true, type: 'normal' },
              { id: 's6', setNumber: 2, weightKg: 24, reps: 9, isCompleted: true, type: 'normal' },
              { id: 's7', setNumber: 3, weightKg: 24, reps: 8, isCompleted: true, type: 'normal' },
            ],
          },
          {
            id: 'demo_ex_4_3',
            exerciseId: 'arms_cable_pushdown',
            exerciseName: '绳索三头肌下压',
            category: 'arms',
            sets: [
              { id: 's8', setNumber: 1, weightKg: 25, reps: 12, isCompleted: true, type: 'normal' },
              { id: 's9', setNumber: 2, weightKg: 30, reps: 10, isCompleted: true, type: 'normal' },
              { id: 's10', setNumber: 3, weightKg: 30, reps: 10, isCompleted: true, type: 'normal' },
            ],
          },
        ],
      },
      {
        id: 'session_demo_3',
        date: new Date(now - 4 * dayMs).toISOString().split('T')[0],
        title: '背部与二头轰炸日',
        durationMinutes: 70,
        createdAt: now - 4 * dayMs,
        notes: '引体向上负重良好，硬拉110kg做组轻松。',
        exercises: [
          {
            id: 'demo_ex_3_1',
            exerciseId: 'back_deadlift',
            exerciseName: '传统杠铃硬拉',
            category: 'back',
            sets: [
              { id: 's11', setNumber: 1, weightKg: 80, reps: 8, isCompleted: true, type: 'warmup' },
              { id: 's12', setNumber: 2, weightKg: 100, reps: 6, isCompleted: true, type: 'normal' },
              { id: 's13', setNumber: 3, weightKg: 110, reps: 5, isCompleted: true, type: 'normal' },
              { id: 's14', setNumber: 4, weightKg: 110, reps: 5, isCompleted: true, type: 'normal' },
            ],
          },
          {
            id: 'demo_ex_3_2',
            exerciseId: 'back_lat_pulldown',
            exerciseName: '高位下拉',
            category: 'back',
            sets: [
              { id: 's15', setNumber: 1, weightKg: 50, reps: 12, isCompleted: true, type: 'normal' },
              { id: 's16', setNumber: 2, weightKg: 55, reps: 10, isCompleted: true, type: 'normal' },
              { id: 's17', setNumber: 3, weightKg: 55, reps: 9, isCompleted: true, type: 'normal' },
            ],
          },
        ],
      },
      {
        id: 'session_demo_2',
        date: new Date(now - 8 * dayMs).toISOString().split('T')[0],
        title: '上肢推力胸肌日',
        durationMinutes: 60,
        createdAt: now - 8 * dayMs,
        notes: '卧推 67.5kg 8次，感觉很稳。',
        exercises: [
          {
            id: 'demo_ex_2_1',
            exerciseId: 'chest_bb_flat_bench',
            exerciseName: '杠铃平板卧推',
            category: 'chest',
            sets: [
              { id: 's18', setNumber: 1, weightKg: 50, reps: 10, isCompleted: true, type: 'warmup' },
              { id: 's19', setNumber: 2, weightKg: 65, reps: 8, isCompleted: true, type: 'normal' },
              { id: 's20', setNumber: 3, weightKg: 67.5, reps: 8, isCompleted: true, type: 'normal' },
              { id: 's21', setNumber: 4, weightKg: 67.5, reps: 7, isCompleted: true, type: 'normal' },
            ],
          },
        ],
      },
      {
        id: 'session_demo_1',
        date: new Date(now - 14 * dayMs).toISOString().split('T')[0],
        title: '胸肌基础周期',
        durationMinutes: 55,
        createdAt: now - 14 * dayMs,
        exercises: [
          {
            id: 'demo_ex_1_1',
            exerciseId: 'chest_bb_flat_bench',
            exerciseName: '杠铃平板卧推',
            category: 'chest',
            sets: [
              { id: 's22', setNumber: 1, weightKg: 45, reps: 12, isCompleted: true, type: 'warmup' },
              { id: 's23', setNumber: 2, weightKg: 60, reps: 10, isCompleted: true, type: 'normal' },
              { id: 's24', setNumber: 3, weightKg: 65, reps: 8, isCompleted: true, type: 'normal' },
              { id: 's25', setNumber: 4, weightKg: 65, reps: 6, isCompleted: true, type: 'normal' },
            ],
          },
        ],
      },
    ];
  }

  // ==========================================
  // Offline Sync Queue (离线待办同步队列)
  // ==========================================
  getPendingSyncQueue(): PendingSyncItem[] {
    return this.getFromLocalStorage<PendingSyncItem[]>(LS_PENDING_QUEUE_KEY) || [];
  }

  enqueuePendingSync(item: PendingSyncItem): void {
    const queue = this.getPendingSyncQueue();
    // Deduplicate if same workout ID already in queue
    const filtered = queue.filter(
      (q) => !(q.type === item.type && q.payload?.id === item.payload?.id)
    );
    filtered.push(item);
    this.saveToLocalStorage(LS_PENDING_QUEUE_KEY, filtered);
  }

  clearPendingSyncQueue(): void {
    this.saveToLocalStorage(LS_PENDING_QUEUE_KEY, []);
  }
}

export const storageService = new StorageService();

