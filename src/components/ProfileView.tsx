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
  ChevronLeft,
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
import { updateService } from '../services/updateService';
import { VersionNotesView } from './VersionNotesView';
import { CloudSyncModal } from './CloudSyncModal';
import { DataBackupModal } from './DataBackupModal';
import { ThemeModal } from './ThemeModal';
import { BodyMetricsModal } from './BodyMetricsModal';
import { TechDocsModal } from './TechDocsModal';

export type ProfileSubPage = 'version' | 'cloud' | 'backup' | 'theme' | 'metrics' | 'tech';

interface ProfileViewProps {
  workouts: WorkoutSession[];
  templates: WorkoutTemplate[];
  bodyMetrics: BodyMetricEntry[];
  customExercises: Exercise[];
  syncStatus: SyncStatusInfo;
  themeState: ThemeState;
  isWideMode: boolean;
  onToggleWideMode: () => void;
  onDataChanged: () => void;
  onSaveBodyMetric: (entry: BodyMetricEntry) => void;
  onDeleteBodyMetric: (id: string) => void;
  hasUpdate: boolean;
  updateData: UpdateCheckResult | null;
  isCheckingUpdate: boolean;
  onCheckUpdate: () => void;
  initialSubPage?: ProfileSubPage | null;
  onSubPageChange?: (page: ProfileSubPage | null) => void;
  // Optional legacy modal handlers (for backward compatibility)
  onOpenBackupModal?: () => void;
  onOpenCloudModal?: () => void;
  onOpenThemeModal?: () => void;
  onOpenTechDocsModal?: () => void;
  onOpenUpdateModal?: () => void;
  onOpenBodyMetricsModal?: () => void;
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
  onDataChanged,
  onSaveBodyMetric,
  onDeleteBodyMetric,
  hasUpdate,
  updateData,
  isCheckingUpdate,
  onCheckUpdate,
  initialSubPage = null,
  onSubPageChange,
}) => {
  const [activeSubPage, setActiveSubPage] = useState<ProfileSubPage | null>(initialSubPage);
  const [isSyncingFast, setIsSyncingFast] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [scrollY, setScrollY] = useState(0);

  // Sync prop changes from outside
  useEffect(() => {
    if (initialSubPage !== undefined) {
      setActiveSubPage(initialSubPage);
    }
  }, [initialSubPage]);

  const handleSetSubPage = (page: ProfileSubPage | null) => {
    setActiveSubPage(page);
    if (onSubPageChange) {
      onSubPageChange(page);
    }
    // Smooth scroll main container to top when entering/leaving sub-page
    const mainEl = document.querySelector('.main-content');
    if (mainEl) {
      mainEl.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

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

  const currentVersion = updateService.getCurrentVersion();

  const handleQuickSync = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSyncingFast) return;
    setIsSyncingFast(true);
    setSyncFeedback(null);
    try {
      const res = await cloudSyncService.sync();
      if (res.success) {
        setSyncFeedback('同步成功！');
        onDataChanged();
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

  // Helper titles for sub-pages
  const getSubPageTitle = (page: ProfileSubPage) => {
    switch (page) {
      case 'version':
        return '版本说明与更新日志';
      case 'cloud':
        return '小主机私有云同步';
      case 'backup':
        return '本地数据与备份导出恢复';
      case 'theme':
        return '主题皮肤与界面外观';
      case 'metrics':
        return '身材围度与体测历史';
      case 'tech':
        return '技术方案与架构设计';
      default:
        return '设置中心';
    }
  };

  /* =========================================================================
     SUB-PAGE RENDERING MODE (二级页面视图)
     ========================================================================= */
  if (activeSubPage) {
    return (
      <div className="subpage-viewport animate-slide-in-right">
        {/* Sticky Sub-page Top Navigation Bar */}
        <div className="subpage-nav-header">
          <button
            type="button"
            className="subpage-nav-back-btn"
            onClick={() => handleSetSubPage(null)}
            title="返回上一级"
          >
            <ChevronLeft size={20} />
            <span>返回我的</span>
          </button>

          <h2 className="subpage-nav-title">{getSubPageTitle(activeSubPage)}</h2>

          <div className="subpage-nav-actions">
            {activeSubPage === 'cloud' && syncStatus.state === 'online' && (
              <button
                type="button"
                className="subpage-header-action-btn"
                onClick={handleQuickSync}
                title="立即发起增量同步"
              >
                <RefreshCw size={13} className={isSyncingFast ? 'animate-spin' : ''} />
                <span>立即同步</span>
              </button>
            )}
            {activeSubPage === 'version' && (
              <button
                type="button"
                className="subpage-header-action-btn"
                onClick={onCheckUpdate}
                disabled={isCheckingUpdate}
                title="检查最新更新"
              >
                <RefreshCw size={13} className={isCheckingUpdate ? 'animate-spin' : ''} />
                <span>{isCheckingUpdate ? '检测中' : '检查更新'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Sub-page Body Content */}
        <div className="subpage-content-wrapper">
          {activeSubPage === 'version' && (
            <VersionNotesView
              currentVersion={currentVersion}
              updateData={updateData}
              isChecking={isCheckingUpdate}
              onCheckUpdate={onCheckUpdate}
              onNavigateToTechDocs={() => handleSetSubPage('tech')}
            />
          )}

          {activeSubPage === 'cloud' && (
            <CloudSyncModal
              isSubPage={true}
              onDataChanged={onDataChanged}
            />
          )}

          {activeSubPage === 'backup' && (
            <DataBackupModal
              isSubPage={true}
              onDataChanged={onDataChanged}
            />
          )}

          {activeSubPage === 'theme' && (
            <ThemeModal
              isSubPage={true}
            />
          )}

          {activeSubPage === 'metrics' && (
            <BodyMetricsModal
              isSubPage={true}
              bodyMetrics={bodyMetrics}
              onSaveMetric={onSaveBodyMetric}
              onDeleteMetric={onDeleteBodyMetric}
            />
          )}

          {activeSubPage === 'tech' && (
            <TechDocsModal
              isSubPage={true}
            />
          )}
        </div>
      </div>
    );
  }

  /* =========================================================================
     MAIN PROFILE VIEW (一级页面列表视图)
     ========================================================================= */
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
            onClick={() => handleSetSubPage('metrics')}
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

      {/* 2. Highlight Version Entry: Version 1.1.0 & Changelog */}
      <div className="profile-animated-section">
        <div className="profile-section-title">版本发布与更新日志</div>
        <div className="profile-card-group">
          <div
            className="profile-menu-row profile-menu-row-highlight"
            onClick={() => handleSetSubPage('version')}
          >
            <div className="profile-menu-left">
              <div
                className="profile-menu-icon"
                style={{
                  backgroundColor: hasUpdate ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                  color: hasUpdate ? '#ef4444' : 'var(--accent-primary)',
                }}
              >
                <Sparkles size={18} />
              </div>
              <div className="profile-menu-info">
                <div className="profile-menu-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>版本说明与更新日志</span>
                  <span
                    style={{
                      fontSize: '0.68rem',
                      background: hasUpdate ? '#ef4444' : 'var(--brand-icon-gradient)',
                      color: '#fff',
                      padding: '2px 7px',
                      borderRadius: '10px',
                      fontWeight: 700,
                      letterSpacing: '0.3px',
                    }}
                  >
                    {hasUpdate ? `新版 ${updateData?.latestVersion}` : `v${currentVersion} 重大升级`}
                  </span>
                </div>
                <div className="profile-menu-desc">
                  查看 J1900 私有云同步、HUD 仪表盘、多款皮肤与进阶工具
                </div>
              </div>
            </div>
            <div className="profile-menu-right">
              <span className="profile-menu-tip-tag">二级页面</span>
              <ChevronRight size={18} color="var(--text-muted)" />
            </div>
          </div>
        </div>
      </div>

      {/* 3. System Settings Group: Cloud Sync & Health Data */}
      <div className="profile-animated-section">
        <div className="profile-section-title">训练数据与双端同步</div>
        <div className="profile-card-group">
          {/* Private Cloud */}
          <div className="profile-menu-row" onClick={() => handleSetSubPage('cloud')}>
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
                    <span>仅本地存储 · 点击进入配置小主机私有云</span>
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
          <div className="profile-menu-row" onClick={() => handleSetSubPage('backup')}>
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
                  本地已存 {workouts.length} 条记录 · {templates.length} 套模版 · JSON 导入导出
                </div>
              </div>
            </div>
            <div className="profile-menu-right">
              <ChevronRight size={18} color="var(--text-muted)" />
            </div>
          </div>
        </div>
      </div>

      {/* 4. Appearance & Personalization */}
      <div className="profile-animated-section">
        <div className="profile-section-title">外观与界面个性化</div>
        <div className="profile-card-group">
          {/* Theme & Skins */}
          <div className="profile-menu-row" onClick={() => handleSetSubPage('theme')}>
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

      {/* 5. Training Libraries & Assets */}
      <div className="profile-animated-section">
        <div className="profile-section-title">健身资产与模版</div>
        <div className="profile-card-group">
          <div className="profile-menu-row" onClick={() => handleSetSubPage('metrics')}>
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

      {/* 6. System & Tech Docs */}
      <div className="profile-animated-section">
        <div className="profile-section-title">技术架构与系统说明</div>
        <div className="profile-card-group">
          {/* Tech Docs */}
          <div className="profile-menu-row" onClick={() => handleSetSubPage('tech')}>
            <div className="profile-menu-left">
              <div
                className="profile-menu-icon"
                style={{ backgroundColor: 'rgba(56, 189, 248, 0.12)', color: '#38bdf8' }}
              >
                <FileCode2 size={18} />
              </div>
              <div className="profile-menu-info">
                <div className="profile-menu-title">离线优先与全栈架构方案</div>
                <div className="profile-menu-desc">查看 SQLite、IndexedDB、Capacitor 原生设计白皮书</div>
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
        <div style={{ opacity: 0.6, marginTop: '4px' }}>
          Local-First · Dual-Storage · Zero Dependency on Third-Party Cloud
        </div>
      </div>
    </div>
  );
};
