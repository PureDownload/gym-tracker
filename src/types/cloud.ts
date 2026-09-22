export type StorageMode = 'local_only' | 'cloud_sync';

export interface CloudUser {
  id: string;
  username: string;
}

export interface CloudConfig {
  mode: StorageMode;
  serverUrl: string;
  token: string | null;
  user: CloudUser | null;
  lastSyncTime: number;
  autoSyncOnSave: boolean;
}

export type SyncState = 'local' | 'connecting' | 'online' | 'syncing' | 'offline_pending' | 'error';

export interface SyncStatusInfo {
  state: SyncState;
  lastSyncTime: number;
  pingMs: number | null;
  pendingCount: number;
  errorMessage: string | null;
}
