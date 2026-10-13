import type {
  AuthUser,
  OverviewData,
  AdminUser,
  AdminWorkout,
  AdminBodyMetric,
  Pagination,
  LeaderboardData,
  MemberProfileData,
} from './types';

const TOKEN_KEY = 'irontrack_admin_token';
const USER_KEY = 'irontrack_admin_user';

class AdminApiClient {
  private token: string | null = null;
  private user: AuthUser | null = null;

  constructor() {
    this.token = localStorage.getItem(TOKEN_KEY);
    const savedUser = localStorage.getItem(USER_KEY);
    if (savedUser) {
      try {
        this.user = JSON.parse(savedUser);
      } catch (err) {
        console.warn('Failed parsing saved admin user info:', err);
      }
    }
  }

  public getToken(): string | null {
    return this.token;
  }

  public getUser(): AuthUser | null {
    return this.user;
  }

  public isAuthenticated(): boolean {
    return Boolean(this.token && this.user && this.user.role === 'admin');
  }

  public logout(): void {
    this.token = null;
    this.user = null;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  public saveAuth(token: string, user: AuthUser): void {
    this.token = token;
    this.user = user;
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const res = await fetch(endpoint, {
      ...options,
      headers,
    });

    if (res.status === 401) {
      this.logout();
      window.dispatchEvent(new Event('admin_auth_expired'));
      throw new Error('登录凭证已过期，请重新登录');
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || `请求失败 (${res.status})`);
    }

    return data as T;
  }

  public async login(username: string, password: string): Promise<{ user: AuthUser; token: string }> {
    const data = await this.request<{ success: boolean; user: AuthUser; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });

    if (data.user.role !== 'admin') {
      throw new Error('此账号非系统管理员，无权登录 PC 管理后台');
    }

    this.saveAuth(data.token, data.user);
    return data;
  }

  public async getMe(): Promise<AuthUser> {
    const data = await this.request<{ success: boolean; user: AuthUser }>('/api/auth/me');
    if (data.user) {
      this.user = data.user;
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    }
    return data.user;
  }

  public async getOverview(): Promise<OverviewData> {
    return this.request<OverviewData>('/api/admin/overview');
  }

  public async getUsers(params: {
    keyword?: string;
    role?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ data: AdminUser[]; pagination: Pagination }> {
    const query = new URLSearchParams();
    if (params.keyword) query.set('keyword', params.keyword);
    if (params.role) query.set('role', params.role);
    if (params.status) query.set('status', params.status);
    if (params.page) query.set('page', String(params.page));
    if (params.pageSize) query.set('pageSize', String(params.pageSize));

    return this.request<{ data: AdminUser[]; pagination: Pagination }>(`/api/admin/users?${query.toString()}`);
  }

  public async createUser(data: { username: string; password: string; role: 'admin' | 'user' }): Promise<{ user: AdminUser }> {
    return this.request<{ success: boolean; user: AdminUser }>('/api/admin/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public async updateUserRole(id: string, role: 'admin' | 'user'): Promise<void> {
    await this.request(`/api/admin/users/${id}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    });
  }

  public async updateUserStatus(id: string, status: 'active' | 'disabled'): Promise<void> {
    await this.request(`/api/admin/users/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  public async resetPassword(id: string, newPassword: string): Promise<void> {
    await this.request(`/api/admin/users/${id}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ newPassword }),
    });
  }

  public async deleteUser(id: string): Promise<void> {
    await this.request(`/api/admin/users/${id}`, {
      method: 'DELETE',
    });
  }

  public async getWorkouts(params: {
    userId?: string;
    keyword?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ data: AdminWorkout[]; pagination: Pagination }> {
    const query = new URLSearchParams();
    if (params.userId) query.set('userId', params.userId);
    if (params.keyword) query.set('keyword', params.keyword);
    if (params.startDate) query.set('startDate', params.startDate);
    if (params.endDate) query.set('endDate', params.endDate);
    if (params.page) query.set('page', String(params.page));
    if (params.pageSize) query.set('pageSize', String(params.pageSize));

    return this.request<{ data: AdminWorkout[]; pagination: Pagination }>(`/api/admin/workouts?${query.toString()}`);
  }

  public async getBodyMetrics(params: {
    userId?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ data: AdminBodyMetric[]; pagination: Pagination }> {
    const query = new URLSearchParams();
    if (params.userId) query.set('userId', params.userId);
    if (params.page) query.set('page', String(params.page));
    if (params.pageSize) query.set('pageSize', String(params.pageSize));

    return this.request<{ data: AdminBodyMetric[]; pagination: Pagination }>(`/api/admin/body-metrics?${query.toString()}`);
  }

  public async vacuumDb(): Promise<{ message: string }> {
    return this.request<{ success: boolean; message: string }>('/api/admin/system/vacuum', {
      method: 'POST',
    });
  }

  public getExportUserUrl(id: string): string {
    return `/api/admin/users/${id}/export`;
  }

  public getDownloadDbUrl(): string {
    return `/api/admin/system/download-db`;
  }

  public async getLeaderboard(): Promise<LeaderboardData> {
    return this.request<LeaderboardData>('/api/admin/members/leaderboard');
  }

  public async getUserProfile(id: string): Promise<MemberProfileData> {
    const res = await this.request<{ success: boolean; profile: MemberProfileData }>(`/api/admin/users/${id}/profile`);
    return res.profile;
  }
}

export const api = new AdminApiClient();
