import React, { useState, useEffect } from 'react';
import {
  User,
  Cloud,
  Palette,
  Database,
  Smartphone,
  Monitor,
  Sparkles,
  FileCode2,
  Trophy,
  Dumbbell,
  Clock,
  TrendingUp,
  RefreshCw,
  ChevronRight,
  Scale,
  CheckCircle2,
  AlertCircle,
  Shield,
  Layers,
} from 'lucide-react';
import type { WorkoutSession, WorkoutTemplate, BodyMetricEntry, Exercise } from '../types/workout';
import type { SyncStatusInfo } from '../types/cloud';
import type { ThemeState } from '../types/theme';
import type { UpdateCheckResult } from '../types/update';
import { storageService } from '../services/storage';
import { analyticsService } from '../services/analytics';
import { cloudSyncService } from '../services/cloudSyncService';

interface ProfileViewProps {
  workouts: WorkoutSession[];
  templates: WorkoutTemplate[];
  bodyMetrics: BodyMetricEntry[];
  customExercises: Exercise[];
  syncStatus: SyncStatusInfo;
  themeState: ThemeState;
  isWideMode: boolean;
  onToggleWideMode: () => void;
  onOpenBackupModal: () => void;
  onOpenCloudModal: () => void;
  onOpenThemeModal: () => void;
  onOpenTechDocsModal: () => void;
  onOpenUpdateModal: () => void;
  onOpenBodyMetricsModal: () => void;
  hasUpdate: boolean;
  updateData: UpdateCheckResult | null;
  onCheckUpdate: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  workouts,
  templates,
  bodyMetrics,
  customExercises,
  syncStatus,
  themeState,
  isWideMode,
  onToggleWideMode,
  onOpenBackupModal,
  onOpenCloudModal,
  onOpenThemeModal,
  onOpenTechDocsModal,
  onOpenUpdateModal,
  onOpenBodyMetricsModal,
  hasUpdate,
  updateData,
  onCheckUpdate,
}) => {
  const [isSyncingFast, setIsSyncingFast] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const mainEl = document.querySelector('.main-content');
    if (!mainEl) return;
    const handleScroll = () => {
      setScrollY(mainEl.scrollTop);
    };
    mainEl.addEventListener('scroll', handleScroll, { passive: true });
    return () => mainEl.removeEventListener('scroll', handleScroll);
  }, []);

  const isCompact = scrollY > 30;

  // User Profile
  const userProfile = storageService.getUserProfile();
  const latestMetric = bodyMetrics.length > 0 ? bodyMetrics[0] : null;
  const displayWeight = latestMetric?.weightKg || userProfile.bodyWeightKg || 70;

  // Lifetime Stats
  const totalWorkouts = workouts.length;
  const totalVolumeKg = workouts.reduce((sum, w) => {
    return (
      sum +
      w.exercises.reduce((exSum, ex) => {
        return (
          exSum +
          ex.sets.reduce((sSum, s) => {
            return s.isCompleted ? sSum + (s.weightKg || 0) * (s.reps || 0) : sSum;
          }, 0)
        );
      }, 0)
    );
  }, 0);
  const totalVolumeTons = (totalVolumeKg / 1000).toFixed(1);

  const totalMinutes = workouts.reduce((sum, w) => sum + (w.durationMinutes || 0), 0);
  const totalHours = (totalMinutes / 60).toFixed(1);

  const prRecords = React.useMemo(() => analyticsService.getPersonalRecords(workouts), [workouts]);

  const handleQuickSync = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSyncingFast) return;
    setIsSyncingFast(true);
    setSyncFeedback(null);
    try {
      const res = await cloudSyncService.sync();
      if (res.success) {
        setSyncFeedback('同步成功！');
      } else {
        setSyncFeedback(res.error || '同步未连通');
      }
    } catch {
      setSyncFeedback('同步出错');
    } finally {
      setIsSyncingFast(false);
      setTimeout(() => setSyncFeedback(null), 2500);
    }
  };

  return (
    <div className="profile-container animate-fade-in">
      {/* 1. User Hero Card (Collapsible Header on Scroll) */}
      <div className={`profile-hero-card ${isCompact ? 'compact' : ''}`}>
        <div className="profile-avatar-row">
          <div className="profile-avatar">
            <User size={isCompact ? 20 : 28} color="var(--accent-primary)" />
          </div>
          <div className="profile-user-info">
            <div className="profile-user-title-row">
              <h2 className="profile-nickname">硬核铁友</h2>
              <span className="profile-badge">PRO 会员</span>
            </div>
            <div className="profile-subtext">
              {userProfile.gender === 'female' ? '女士 ♀' : '男士 ♂'} · 体重{' '}
              <strong>{displayWeight} kg</strong>
            </div>
          </div>
          <button
            type="button"
            className="profile-edit-metric-btn"
            onClick={onOpenBodyMetricsModal}
            title="更新体重与围度数据"
          >
            <Scale size={14} />
            <span>体测打卡</span>
          </button>
        </div>

        {/* Stats Grid */}
        <div className="profile-stats-grid">
          <div className="profile-stat-item">
            <div className="profile-stat-icon" style={{ color: 'var(--accent-primary)' }}>
              <Dumbbell size={15} />
            </div>
            <div className="profile-stat-val">{totalWorkouts}</div>
            <div className="profile-stat-label">训练天数</div>
          </div>

          <div className="profile-stat-item">
            <div className="profile-stat-icon" style={{ color: '#10b981' }}>
              <TrendingUp size={15} />
            </div>
            <div className="profile-stat-val">{totalVolumeTons}t</div>
            <div className="profile-stat-label">累计总吨位</div>
          </div>

          <div className="profile-stat-item">
            <div className="profile-stat-icon" style={{ color: '#38bdf8' }}>
              <Clock size={15} />
            </div>
            <div className="profile-stat-val">{totalHours}h</div>
            <div className="profile-stat-label">训练时长</div>
          </div>

          <div className="profile-stat-item">
            <div className="profile-stat-icon" style={{ color: '#f59e0b' }}>
              <Trophy size={15} />
            </div>
            <div className="profile-stat-val">{prRecords.length}</div>
            <div className="profile-stat-label">历史 PR</div>
          </div>
        </div>
      </div>

      {/* 2. System Settings Group: Cloud Sync & Health Data */}
      <div className="profile-animated-section">
        <div className="profile-section-title">训练数据与双端同步</div>
        <div className="profile-card-group">
        {/* Private Cloud */}
        <div className="profile-menu-row" onClick={onOpenCloudModal}>
          <div className="profile-menu-left">
            <div
              className="profile-menu-icon"
              style={{
                backgroundColor:
                  syncStatus.state === 'online'
                    ? 'rgba(16, 185, 129, 0.15)'
                    : syncStatus.state === 'offline_pending'
                    ? 'rgba(245, 158, 11, 0.15)'
                    : 'rgba(59, 130, 246, 0.12)',
                color:
                  syncStatus.state === 'online'
                    ? '#10b981'
                    : syncStatus.state === 'offline_pending'
                    ? '#f59e0b'
                    : 'var(--accent-primary)',
              }}
            >
              <Cloud size={18} />
            </div>
            <div className="profile-menu-info">
              <div className="profile-menu-title">小主机私有云同步</div>
              <div className="profile-menu-desc">
                {syncStatus.state === 'online' ? (
                  <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle2 size={12} />
                    已连接 · 延迟 {syncStatus.pingMs || 15}ms
                  </span>
                ) : syncStatus.state === 'syncing' ? (
                  <span style={{ color: 'var(--accent-cyan)' }}>同步中...</span>
                ) : syncStatus.state === 'offline_pending' ? (
                  <span style={{ color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <AlertCircle size={12} />
                    离线暂存模式 (待连接重试)
                  </span>
                ) : (
                  <span>仅本地 IndexedDB 存储 · 点击配置云端</span>
                )}
              </div>
            </div>
          </div>

          <div className="profile-menu-right">
            {syncFeedback ? (
              <span style={{ fontSize: '0.74rem', color: '#10b981', fontWeight: 600 }}>
                {syncFeedback}
              </span>
            ) : syncStatus.state === 'online' ? (
              <button
                type="button"
                className="profile-quick-action-btn"
                onClick={handleQuickSync}
                title="立即发起增量同步"
              >
                <RefreshCw size={13} className={isSyncingFast ? 'animate-spin' : ''} />
                <span>立即同步</span>
              </button>
            ) : null}
            <ChevronRight size={18} color="var(--text-muted)" />
          </div>
        </div>

        {/* Local Data Backup */}
        <div className="profile-menu-row" onClick={onOpenBackupModal}>
          <div className="profile-menu-left">
            <div
              className="profile-menu-icon"
              style={{ backgroundColor: 'rgba(139, 92, 246, 0.12)', color: '#8b5cf6' }}
            >
              <Database size={18} />
            </div>
            <div className="profile-menu-info">
              <div className="profile-menu-title">数据备份与导出恢复</div>
              <div className="profile-menu-desc">
                本地存储 {workouts.length} 条记录 · {templates.length} 套模版 · JSON 导入导出
              </div>
            </div>
          </div>
          <div className="profile-menu-right">
            <ChevronRight size={18} color="var(--text-muted)" />
          </div>
        </div>
      </div>
      </div>

      {/* 3. Appearance & Personalization */}
      <div className="profile-animated-section">
        <div className="profile-section-title">外观与界面个性化</div>
        <div className="profile-card-group">
          {/* Theme & Skins */}
          <div className="profile-menu-row" onClick={onOpenThemeModal}>
            <div className="profile-menu-left">
              <div
                className="profile-menu-icon"
                style={{ backgroundColor: 'rgba(236, 72, 153, 0.12)', color: '#ec4899' }}
              >
                <Palette size={18} />
              </div>
              <div className="profile-menu-info">
                <div className="profile-menu-title">主题皮肤方案</div>
                <div className="profile-menu-desc">
                  当前：<strong>{themeState.activeTheme.name}</strong>
                  {themeState.mode === 'auto' ? ' (跟随系统)' : ''}
                </div>
              </div>
            </div>
            <div className="profile-menu-right">
              <div
                style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  background: themeState.activeTheme.colors?.accent || 'var(--accent-primary)',
                  border: '2px solid rgba(255, 255, 255, 0.2)',
                  boxShadow: '0 0 6px rgba(0,0,0,0.2)',
                }}
              />
              <ChevronRight size={18} color="var(--text-muted)" />
            </div>
          </div>

          {/* Wide Screen / Mobile View Toggle */}
          <div className="profile-menu-row" onClick={onToggleWideMode}>
            <div className="profile-menu-left">
              <div
                className="profile-menu-icon"
                style={{ backgroundColor: 'rgba(20, 184, 166, 0.12)', color: '#14b8a6' }}
              >
                {isWideMode ? <Smartphone size={18} /> : <Monitor size={18} />}
              </div>
              <div className="profile-menu-info">
                <div className="profile-menu-title">视图布局切换</div>
                <div className="profile-menu-desc">
                  当前为{isWideMode ? '「宽屏电脑布局」' : '「手机尺寸容器」'}
                </div>
              </div>
            </div>
            <div className="profile-menu-right">
              <span
                style={{
                  fontSize: '0.74rem',
                  padding: '3px 8px',
                  borderRadius: '12px',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-secondary)',
                }}
              >
                切换为{isWideMode ? '手机屏' : '宽屏'}
              </span>
              <ChevronRight size={18} color="var(--text-muted)" />
            </div>
          </div>
        </div>
      </div>

      {/* 4. Training Libraries & Assets */}
      <div className="profile-animated-section">
        <div className="profile-section-title">健身资产与模版</div>
        <div className="profile-card-group">
          <div className="profile-menu-row" onClick={onOpenBodyMetricsModal}>
            <div className="profile-menu-left">
              <div
                className="profile-menu-icon"
                style={{ backgroundColor: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}
              >
                <Scale size={18} />
              </div>
              <div className="profile-menu-info">
                <div className="profile-menu-title">身材围度与体测历史</div>
                <div className="profile-menu-desc">
                  已记录 {bodyMetrics.length} 次体测 · 追踪手臂、胸围、腰围趋势
                </div>
              </div>
            </div>
            <div className="profile-menu-right">
              <ChevronRight size={18} color="var(--text-muted)" />
            </div>
          </div>

          <div className="profile-menu-row" style={{ cursor: 'default' }}>
            <div className="profile-menu-left">
              <div
                className="profile-menu-icon"
                style={{ backgroundColor: 'rgba(59, 130, 246, 0.12)', color: 'var(--accent-primary)' }}
              >
                <Layers size={18} />
              </div>
              <div className="profile-menu-info">
                <div className="profile-menu-title">训练模版与动作库统计</div>
                <div className="profile-menu-desc">
                  {templates.length} 套分化模版 · {customExercises.length} 个自定义动作
                </div>
              </div>
            </div>
            <div className="profile-menu-right">
              <Shield size={16} color="var(--text-muted)" />
            </div>
          </div>
        </div>
      </div>

      {/* 5. System, Update & Tech Docs */}
      <div className="profile-animated-section">
        <div className="profile-section-title">关于与技术架构</div>
        <div className="profile-card-group">
          {/* Check Update */}
          <div
            className="profile-menu-row"
            onClick={() => {
              onOpenUpdateModal();
              onCheckUpdate();
            }}
          >
            <div className="profile-menu-left">
              <div
                className="profile-menu-icon"
                style={{
                  backgroundColor: hasUpdate ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.12)',
                  color: hasUpdate ? '#ef4444' : '#10b981',
                }}
              >
                <Sparkles size={18} />
              </div>
              <div className="profile-menu-info">
                <div className="profile-menu-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>检查应用更新</span>
                  {hasUpdate && (
                    <span
                      style={{
                        fontSize: '0.65rem',
                        background: '#ef4444',
                        color: '#fff',
                        padding: '1px 6px',
                        borderRadius: '10px',
                        fontWeight: 700,
                      }}
                    >
                      新版本 {updateData?.latestVersion}
                    </span>
                  )}
                </div>
                <div className="profile-menu-desc">
                  当前版本 v1.0.1 · {hasUpdate ? '发现可用升级，点击查看' : '已是最新版本'}
                </div>
              </div>
            </div>
            <div className="profile-menu-right">
              <ChevronRight size={18} color="var(--text-muted)" />
            </div>
          </div>

          {/* Tech Docs */}
          <div className="profile-menu-row" onClick={onOpenTechDocsModal}>
            <div className="profile-menu-left">
              <div
                className="profile-menu-icon"
                style={{ backgroundColor: 'rgba(56, 189, 248, 0.12)', color: '#38bdf8' }}
              >
                <FileCode2 size={18} />
              </div>
              <div className="profile-menu-info">
                <div className="profile-menu-title">离线优先与全栈架构方案</div>
                <div className="profile-menu-desc">查看 SQLite、IndexedDB、Capacitor 原生设计文档</div>
              </div>
            </div>
            <div className="profile-menu-right">
              <ChevronRight size={18} color="var(--text-muted)" />
            </div>
          </div>
        </div>
      </div>

      {/* Footer Branding */}
      <div style={{ textAlign: 'center', padding: '24px 0 10px', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
        <div>IronTrack 铁脉 · 专注力量与形体渐进超负荷</div>
        <div style={{ opacity: 0.6, marginTop: '4px' }}>Local-First · Dual-Storage · Zero Dependency on Third-Party Cloud</div>
      </div>
    </div>
  );
};
