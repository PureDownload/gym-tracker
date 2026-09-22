import type { WorkoutSession, Exercise } from '../types/workout';
import type { SyncStatusInfo, SyncState } from '../types/cloud';
import { cloudAuthService } from './cloudAuthService';
import { storageService } from './storage';

type SyncListener = (info: SyncStatusInfo) => void;
type DataChangeCallback = () => void;

class CloudSyncService {
  private listeners = new Set<SyncListener>();
  private onDataChangedCallbacks = new Set<DataChangeCallback>();
  private currentStatus: SyncStatusInfo = {
    state: 'local',
    lastSyncTime: 0,
    pingMs: null,
    pendingCount: 0,
    errorMessage: null,
  };
  private isSyncing = false;

  constructor() {
    this.refreshInitialStatus();
  }

  private refreshInitialStatus() {
    const config = cloudAuthService.getConfig();
    this.currentStatus = {
      state: config.mode === 'cloud_sync' && config.token ? 'offline_pending' : 'local',
      lastSyncTime: config.lastSyncTime || 0,
      pingMs: null,
      pendingCount: 0,
      errorMessage: null,
    };
  }

  public getStatus(): SyncStatusInfo {
    return { ...this.currentStatus };
  }

  public subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    listener(this.getStatus());
    return () => this.listeners.delete(listener);
  }

  public onRemoteDataChanged(cb: DataChangeCallback): () => void {
    this.onDataChangedCallbacks.add(cb);
    return () => this.onDataChangedCallbacks.delete(cb);
  }

  private setStatus(updates: Partial<SyncStatusInfo>) {
    this.currentStatus = { ...this.currentStatus, ...updates };
    this.listeners.forEach((listener) => listener(this.getStatus()));
  }

  // Check connection status to J1900
  public async checkConnection(): Promise<boolean> {
    const config = cloudAuthService.getConfig();
    if (config.mode !== 'cloud_sync' || !config.serverUrl || !config.token) {
      this.setStatus({ state: 'local', pingMs: null, errorMessage: null });
      return false;
    }

    this.setStatus({ state: 'connecting' });
    const pingRes = await cloudAuthService.pingServer();
    if (pingRes.success) {
      this.setStatus({
        state: 'online',
        pingMs: pingRes.latencyMs,
        errorMessage: null,
      });
      return true;
    } else {
      this.setStatus({
        state: 'offline_pending',
        pingMs: null,
        errorMessage: pingRes.error || '无法连接到小主机',
      });
      return false;
    }
  }

  // Full two-way incremental sync
  public async sync(): Promise<{ success: boolean; pulledWorkouts: number; pushedWorkouts: number; error?: string }> {
    if (this.isSyncing) {
      return { success: false, pulledWorkouts: 0, pushedWorkouts: 0, error: '正在同步中，请勿重复操作' };
    }

    const config = cloudAuthService.getConfig();
    if (config.mode !== 'cloud_sync' || !config.serverUrl || !config.token) {
      this.setStatus({ state: 'local', errorMessage: null });
      return { success: false, pulledWorkouts: 0, pushedWorkouts: 0, error: '当前为本地单机模式，请先连接并登录小主机' };
    }

    this.isSyncing = true;
    this.setStatus({ state: 'syncing', errorMessage: null });

    try {
      const serverUrl = cloudAuthService.normalizeUrl(config.serverUrl);
      const token = config.token;

      // 1. Pull updates from server
      const pullRes = await fetch(`${serverUrl}/api/sync/pull`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ lastSyncTime: config.lastSyncTime || 0 }),
      });

      if (!pullRes.ok) {
        if (pullRes.status === 401) {
          cloudAuthService.logout();
          this.setStatus({ state: 'local', errorMessage: '登录凭证已过期，请重新登录小主机' });
          throw new Error('登录凭证已过期，请重新登录');
        }
        const errJson = await pullRes.json().catch(() => ({}));
        throw new Error(errJson.error || `服务端返回错误 (${pullRes.status})`);
      }

      const pullData = await pullRes.json();
      const remoteWorkouts: any[] = pullData.workouts || [];
      const remoteCustomExercises: any[] = pullData.customExercises || [];

      let hasLocalChanges = false;

      // Apply pulled workouts
      if (remoteWorkouts.length > 0) {
        const toUpsert: WorkoutSession[] = [];
        for (const rw of remoteWorkouts) {
          if (rw.isDeleted) {
            await storageService.deleteWorkout(rw.id);
            hasLocalChanges = true;
          } else {
            toUpsert.push({
              id: rw.id,
              date: rw.date,
              title: rw.title,
              durationMinutes: rw.durationMinutes,
              exercises: rw.exercises || [],
              notes: rw.notes,
              createdAt: rw.createdAt,
            });
            hasLocalChanges = true;
          }
        }
        if (toUpsert.length > 0) {
          await storageService.upsertWorkoutsFromRemote(toUpsert);
        }
      }

      // Apply pulled custom exercises
      if (remoteCustomExercises.length > 0) {
        const toUpsertEx: Exercise[] = [];
        for (const rex of remoteCustomExercises) {
          if (rex.isDeleted) {
            await storageService.deleteCustomExercise(rex.id);
            hasLocalChanges = true;
          } else {
            toUpsertEx.push(rex);
            hasLocalChanges = true;
          }
        }
        if (toUpsertEx.length > 0) {
          await storageService.upsertCustomExercisesFromRemote(toUpsertEx);
        }
      }

      // 2. Push local items to server
      const localWorkouts = await storageService.getWorkouts();
      const localCustomExercises = await storageService.getCustomExercises();

      const pushRes = await fetch(`${serverUrl}/api/sync/push`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          workouts: localWorkouts.map(w => ({
            ...w,
            updatedAt: w.createdAt || Date.now(),
          })),
          customExercises: localCustomExercises.map(e => ({
            id: e.id,
            data: e,
            updatedAt: Date.now(),
          })),
        }),
      });

      if (!pushRes.ok) {
        throw new Error('向小主机同步本地变更失败');
      }

      const pushData = await pushRes.json();
      const newSyncTime = pushData.serverTime || pullData.serverTime || Date.now();

      cloudAuthService.saveConfig({ lastSyncTime: newSyncTime });

      this.setStatus({
        state: 'online',
        lastSyncTime: newSyncTime,
        pendingCount: 0,
        errorMessage: null,
      });

      if (hasLocalChanges) {
        this.onDataChangedCallbacks.forEach((cb) => cb());
      }

      return {
        success: true,
        pulledWorkouts: remoteWorkouts.length,
        pushedWorkouts: localWorkouts.length,
      };
    } catch (err: any) {
      console.warn('Sync failed:', err);
      const isNetworkError = err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError') || err.name === 'AbortError';
      const state: SyncState = isNetworkError ? 'offline_pending' : 'error';
      this.setStatus({
        state,
        errorMessage: isNetworkError ? '小主机连接暂时中断，数据已在本地妥善保存' : err.message,
      });
      return {
        success: false,
        pulledWorkouts: 0,
        pushedWorkouts: 0,
        error: err.message || '同步遇到异常',
      };
    } finally {
      this.isSyncing = false;
    }
  }

  // Silent sync after user saves a workout
  public async silentSyncOnSave(session: WorkoutSession): Promise<void> {
    const config = cloudAuthService.getConfig();
    if (config.mode !== 'cloud_sync' || !config.serverUrl || !config.token || !config.autoSyncOnSave) {
      return;
    }

    try {
      const serverUrl = cloudAuthService.normalizeUrl(config.serverUrl);
      const res = await fetch(`${serverUrl}/api/sync/push`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.token}`,
        },
        body: JSON.stringify({
          workouts: [{
            ...session,
            updatedAt: Date.now(),
          }],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        cloudAuthService.saveConfig({ lastSyncTime: data.serverTime || Date.now() });
        this.setStatus({ state: 'online', lastSyncTime: Date.now(), pendingCount: 0 });
      } else {
        this.setStatus({ state: 'offline_pending', pendingCount: this.currentStatus.pendingCount + 1 });
      }
    } catch (e) {
      // Offline fallback: don't disturb the user
      this.setStatus({ state: 'offline_pending', pendingCount: this.currentStatus.pendingCount + 1 });
    }
  }

  // Silent sync after user deletes a workout
  public async silentSyncOnDelete(id: string): Promise<void> {
    const config = cloudAuthService.getConfig();
    if (config.mode !== 'cloud_sync' || !config.serverUrl || !config.token) {
      return;
    }

    try {
      const serverUrl = cloudAuthService.normalizeUrl(config.serverUrl);
      await fetch(`${serverUrl}/api/sync/push`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.token}`,
        },
        body: JSON.stringify({
          workouts: [{
            id,
            updatedAt: Date.now(),
            isDeleted: true,
          }],
        }),
      });
    } catch (e) {
      this.setStatus({ state: 'offline_pending' });
    }
  }

  // Migrate all local IndexedDB data to J1900
  public async migrateLocalToServer(): Promise<{ success: boolean; count: number; error?: string }> {
    const config = cloudAuthService.getConfig();
    if (!config.serverUrl || !config.token) {
      return { success: false, count: 0, error: '请先登录小主机' };
    }

    try {
      const serverUrl = cloudAuthService.normalizeUrl(config.serverUrl);
      const workouts = await storageService.getWorkouts();
      const customExercises = await storageService.getCustomExercises();

      const res = await fetch(`${serverUrl}/api/sync/migrate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.token}`,
        },
        body: JSON.stringify({ workouts, customExercises }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || '迁移失败');
      }

      cloudAuthService.saveConfig({ lastSyncTime: data.serverTime || Date.now() });
      this.setStatus({ state: 'online', lastSyncTime: data.serverTime || Date.now(), pendingCount: 0 });

      return { success: true, count: data.workoutsMigrated || workouts.length };
    } catch (err: any) {
      return { success: false, count: 0, error: err.message || '上传数据失败' };
    }
  }
}

export const cloudSyncService = new CloudSyncService();
