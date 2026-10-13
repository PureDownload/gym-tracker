import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar, type TabKey } from './components/Sidebar';
import { Header } from './components/Header';
import { OverviewView } from './components/OverviewView';
import { UsersView } from './components/UsersView';
import { WorkoutsView } from './components/WorkoutsView';
import { BodyMetricsView } from './components/BodyMetricsView';
import { SystemView } from './components/SystemView';
import { LoginModal } from './components/LoginModal';
import { api } from './api';
import type { AuthUser, OverviewData, AdminUser, AdminWorkout, AdminBodyMetric, Pagination } from './types';

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(api.getUser());
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(api.isAuthenticated());
  const [currentTab, setCurrentTab] = useState<TabKey>('overview');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Tab Data States
  const [overviewData, setOverviewData] = useState<OverviewData | null>(null);
  
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersPagination, setUsersPagination] = useState<Pagination>({ page: 1, pageSize: 20, total: 0, totalPages: 1 });
  const [usersFilter, setUsersFilter] = useState({ keyword: '', role: '', status: '' });

  const [workouts, setWorkouts] = useState<AdminWorkout[]>([]);
  const [workoutsPagination, setWorkoutsPagination] = useState<Pagination>({ page: 1, pageSize: 20, total: 0, totalPages: 1 });
  const [workoutsFilter, setWorkoutsFilter] = useState({ userId: '', keyword: '', startDate: '', endDate: '' });

  const [metrics, setMetrics] = useState<AdminBodyMetric[]>([]);
  const [metricsPagination, setMetricsPagination] = useState<Pagination>({ page: 1, pageSize: 30, total: 0, totalPages: 1 });
  const [selectedMetricUserId, setSelectedMetricUserId] = useState<string>('');

  // Handle Token Expiry
  useEffect(() => {
    const handleAuthExpired = () => {
      setIsAuthenticated(false);
      setCurrentUser(null);
    };
    window.addEventListener('admin_auth_expired', handleAuthExpired);
    return () => window.removeEventListener('admin_auth_expired', handleAuthExpired);
  }, []);

  // Fetch Overview Data
  const fetchOverview = useCallback(async () => {
    try {
      const data = await api.getOverview();
      setOverviewData(data);
    } catch (e) {
      console.error('Failed fetching overview:', e);
    }
  }, []);

  // Fetch Users
  const fetchUsers = useCallback(async (page = 1, keyword = '', role = '', status = '') => {
    try {
      const res = await api.getUsers({ page, keyword, role, status });
      setUsers(res.data);
      setUsersPagination(res.pagination);
    } catch (e) {
      console.error('Failed fetching users:', e);
    }
  }, []);

  // Fetch Workouts
  const fetchWorkouts = useCallback(async (page = 1, userId = '', keyword = '', startDate = '', endDate = '') => {
    try {
      const res = await api.getWorkouts({ page, userId, keyword, startDate, endDate });
      setWorkouts(res.data);
      setWorkoutsPagination(res.pagination);
    } catch (e) {
      console.error('Failed fetching workouts:', e);
    }
  }, []);

  // Fetch Body Metrics
  const fetchMetrics = useCallback(async (page = 1, userId = '') => {
    try {
      const res = await api.getBodyMetrics({ page, userId });
      setMetrics(res.data);
      setMetricsPagination(res.pagination);
    } catch (e) {
      console.error('Failed fetching metrics:', e);
    }
  }, []);

  // Load data for the active tab
  const reloadActiveTab = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsRefreshing(true);
    try {
      if (currentTab === 'overview' || currentTab === 'system') {
        await fetchOverview();
      } else if (currentTab === 'users') {
        await fetchUsers(usersPagination.page, usersFilter.keyword, usersFilter.role, usersFilter.status);
      } else if (currentTab === 'workouts') {
        await fetchWorkouts(workoutsPagination.page, workoutsFilter.userId, workoutsFilter.keyword, workoutsFilter.startDate, workoutsFilter.endDate);
        if (users.length === 0) fetchUsers(1);
      } else if (currentTab === 'metrics') {
        await fetchMetrics(metricsPagination.page, selectedMetricUserId);
        if (users.length === 0) fetchUsers(1);
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [
    isAuthenticated,
    currentTab,
    fetchOverview,
    fetchUsers,
    usersPagination.page,
    usersFilter,
    fetchWorkouts,
    workoutsPagination.page,
    workoutsFilter,
    users.length,
    fetchMetrics,
    metricsPagination.page,
    selectedMetricUserId,
  ]);

  useEffect(() => {
    if (isAuthenticated) {
      reloadActiveTab();
    }
  }, [isAuthenticated, currentTab]);

  const handleLoginSuccess = (user: AuthUser) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    if (window.confirm('确定要退出管理后台控制台吗？')) {
      api.logout();
      setIsAuthenticated(false);
      setCurrentUser(null);
    }
  };

  if (!isAuthenticated) {
    return <LoginModal onLoginSuccess={handleLoginSuccess} />;
  }

  const tabTitles: Record<TabKey, { title: string; subtitle: string }> = {
    overview: { title: '数据大盘 · 全景洞察', subtitle: '全站举铁负荷、三大项力量英雄榜与打卡活跃走势' },
    users: { title: '账号与权限管理', subtitle: '管理健身用户与系统管理员账号、状态及数据导出' },
    workouts: { title: '全员训练流水透视', subtitle: '查看全员每次力量与有氧训练日志、动作组数与 1RM 极限' },
    metrics: { title: '体测与健康档案', subtitle: '监控全员的体重、体脂率与身体围度演进记录' },
    system: { title: 'J1900 系统运维与存储', subtitle: '查看 SQLite 数据库状态、整理 VACUUM 碎片与下载快照' },
  };

  const currentMeta = tabTitles[currentTab];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-main)' }}>
      {/* Fixed Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onTabChange={(tab) => setCurrentTab(tab)}
      />

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Header
          title={currentMeta.title}
          subtitle={currentMeta.subtitle}
          user={currentUser}
          onRefresh={reloadActiveTab}
          onLogout={handleLogout}
          isRefreshing={isRefreshing}
        />

        <main style={{ flex: 1, padding: '28px 32px 40px', maxWidth: '1440px', width: '100%', margin: '0 auto' }}>
          {currentTab === 'overview' && (
            <OverviewView
              data={overviewData}
              loading={isRefreshing}
              onNavigateToUsers={() => setCurrentTab('users')}
              onNavigateToWorkouts={() => setCurrentTab('workouts')}
            />
          )}

          {currentTab === 'users' && (
            <UsersView
              users={users}
              pagination={usersPagination}
              currentUser={currentUser}
              onRefresh={reloadActiveTab}
              onPageChange={(page) => {
                setUsersPagination((prev) => ({ ...prev, page }));
                fetchUsers(page, usersFilter.keyword, usersFilter.role, usersFilter.status);
              }}
              onSearch={(keyword, role, status) => {
                setUsersFilter({ keyword, role, status });
                setUsersPagination((prev) => ({ ...prev, page: 1 }));
                fetchUsers(1, keyword, role, status);
              }}
              onNavigateToUserWorkouts={(userId) => {
                setWorkoutsFilter((prev) => ({ ...prev, userId }));
                setCurrentTab('workouts');
                fetchWorkouts(1, userId, '', '', '');
              }}
            />
          )}

          {currentTab === 'workouts' && (
            <WorkoutsView
              workouts={workouts}
              users={users}
              pagination={workoutsPagination}
              onRefresh={reloadActiveTab}
              onPageChange={(page) => {
                setWorkoutsPagination((prev) => ({ ...prev, page }));
                fetchWorkouts(page, workoutsFilter.userId, workoutsFilter.keyword, workoutsFilter.startDate, workoutsFilter.endDate);
              }}
              onSearch={(userId, keyword, startDate, endDate) => {
                setWorkoutsFilter({ userId, keyword, startDate, endDate });
                setWorkoutsPagination((prev) => ({ ...prev, page: 1 }));
                fetchWorkouts(1, userId, keyword, startDate, endDate);
              }}
            />
          )}

          {currentTab === 'metrics' && (
            <BodyMetricsView
              metrics={metrics}
              users={users}
              pagination={metricsPagination}
              onRefresh={reloadActiveTab}
              onPageChange={(page) => {
                setMetricsPagination((prev) => ({ ...prev, page }));
                fetchMetrics(page, selectedMetricUserId);
              }}
              onSelectUser={(userId) => {
                setSelectedMetricUserId(userId);
                setMetricsPagination((prev) => ({ ...prev, page: 1 }));
                fetchMetrics(1, userId);
              }}
            />
          )}

          {currentTab === 'system' && (
            <SystemView
              systemInfo={overviewData?.systemInfo || null}
              onRefresh={fetchOverview}
            />
          )}
        </main>
      </div>
    </div>
  );
};
