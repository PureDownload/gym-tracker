import type { CloudConfig, CloudUser } from '../types/cloud';

const LS_CLOUD_CONFIG_KEY = 'irontrack_cloud_config';

const DEFAULT_CONFIG: CloudConfig = {
  mode: 'local_only',
  serverUrl: '',
  token: null,
  user: null,
  lastSyncTime: 0,
  autoSyncOnSave: true,
};

class CloudAuthService {
  private config: CloudConfig;

  constructor() {
    this.config = this.loadConfig();
  }

  private loadConfig(): CloudConfig {
    try {
      const raw = localStorage.getItem(LS_CLOUD_CONFIG_KEY);
      if (raw) {
        return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
      }
    } catch (e) {
      console.warn('Failed reading cloud config from localStorage', e);
    }
    return { ...DEFAULT_CONFIG };
  }

  public getConfig(): CloudConfig {
    return { ...this.config };
  }

  public saveConfig(updates: Partial<CloudConfig>): CloudConfig {
    this.config = { ...this.config, ...updates };
    try {
      localStorage.setItem(LS_CLOUD_CONFIG_KEY, JSON.stringify(this.config));
    } catch (e) {
      console.warn('Failed saving cloud config to localStorage', e);
    }
    return this.getConfig();
  }

  public isCloudModeActive(): boolean {
    return this.config.mode === 'cloud_sync' && Boolean(this.config.token) && Boolean(this.config.serverUrl);
  }

  // Format and normalize server url (removes trailing slash, ensures http/https)
  public normalizeUrl(url: string): string {
    let clean = url.trim();
    if (!clean) return '';
    if (!/^https?:\/\//i.test(clean)) {
      clean = 'http://' + clean;
    }
    return clean.replace(/\/+$/, '');
  }

  // Ping server health to detect latency and reachability via Tailscale
  public async pingServer(serverUrl?: string): Promise<{ success: boolean; latencyMs: number; error?: string }> {
    const targetUrl = this.normalizeUrl(serverUrl || this.config.serverUrl);
    if (!targetUrl) {
      return { success: false, latencyMs: 0, error: '未设置服务器地址' };
    }

    const start = performance.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4500); // 4.5s timeout

      const res = await fetch(`${targetUrl}/api/health`, {
        method: 'GET',
        signal: controller.signal,
        headers: { 'Accept': 'application/json' },
      });
      clearTimeout(timeoutId);

      const latencyMs = Math.round(performance.now() - start);
      if (res.ok) {
        return { success: true, latencyMs };
      }
      return { success: false, latencyMs, error: `服务器返回状态码: ${res.status}` };
    } catch (err: any) {
      const latencyMs = Math.round(performance.now() - start);
      let msg = err.message || '连接失败';
      if (err.name === 'AbortError') {
        msg = '连接超时（请检查手机是否已开启 Tailscale 且小主机已上线）';
      } else if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
        msg = '无法访问服务器（请确认小主机 IP 及端口无误，或检查 Tailscale 组网）';
      }
      return { success: false, latencyMs, error: msg };
    }
  }

  // User registration on J1900 backend
  public async register(serverUrl: string, username: string, password: string): Promise<{ user: CloudUser; token: string }> {
    const targetUrl = this.normalizeUrl(serverUrl);
    if (!targetUrl) throw new Error('请输入小主机服务器地址');

    const res = await fetch(`${targetUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || '注册失败');
    }

    // Save auth config
    this.saveConfig({
      mode: 'cloud_sync',
      serverUrl: targetUrl,
      token: data.token,
      user: data.user,
    });

    return { user: data.user, token: data.token };
  }

  // User login on J1900 backend
  public async login(serverUrl: string, username: string, password: string): Promise<{ user: CloudUser; token: string }> {
    const targetUrl = this.normalizeUrl(serverUrl);
    if (!targetUrl) throw new Error('请输入小主机服务器地址');

    const res = await fetch(`${targetUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || '登录失败');
    }

    // Save auth config
    this.saveConfig({
      mode: 'cloud_sync',
      serverUrl: targetUrl,
      token: data.token,
      user: data.user,
    });

    return { user: data.user, token: data.token };
  }

  // Logout / Switch back to local mode
  public logout(): void {
    this.saveConfig({
      mode: 'local_only',
      token: null,
      user: null,
      lastSyncTime: 0,
    });
  }

  // Switch to local mode without forgetting token (offline toggle)
  public setStorageMode(mode: 'local_only' | 'cloud_sync'): void {
    this.saveConfig({ mode });
  }
}

export const cloudAuthService = new CloudAuthService();
