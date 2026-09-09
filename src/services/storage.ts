import type { WorkoutSession, Exercise } from '../types/workout';

const DB_NAME = 'IronTrackDB';
const DB_VERSION = 1;
const WORKOUTS_STORE = 'workouts';
const CUSTOM_EXERCISES_STORE = 'custom_exercises';
const LS_WORKOUTS_KEY = 'irontrack_workouts_backup';
const LS_CUSTOM_EX_KEY = 'irontrack_custom_exercises';
const LS_PINNED_EX_KEY = 'irontrack_pinned_exercises';

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

  private async saveWorkoutsBulk(list: WorkoutSession[]): Promise<void> {
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

  // Backup & Restore
  async exportJSON(): Promise<string> {
    const workouts = await this.getWorkouts();
    const customExercises = await this.getCustomExercises();
    const backupObj = {
      app: 'IronTrack',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      data: {
        workouts,
        customExercises,
      },
    };
    return JSON.stringify(backupObj, null, 2);
  }

  async importJSON(jsonStr: string): Promise<{ success: boolean; count: number; error?: string }> {
    try {
      const parsed = JSON.parse(jsonStr);
      const workouts: WorkoutSession[] = parsed?.data?.workouts || (Array.isArray(parsed) ? parsed : []);
      const customExercises: Exercise[] = parsed?.data?.customExercises || [];

      if (!Array.isArray(workouts)) {
        throw new Error('导入文件格式不正确，缺少有效的训练记录数据');
      }

      await this.saveWorkoutsBulk(workouts);
      for (const ex of customExercises) {
        await this.saveCustomExercise(ex);
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
}

export const storageService = new StorageService();
