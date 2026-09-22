import React from 'react';
import { Database, Monitor, Smartphone, Flame, FileCode2, Sparkles, Cloud, RefreshCw } from 'lucide-react';
import type { SyncStatusInfo } from '../types/cloud';

interface HeaderProps {
  isWideMode: boolean;
  onToggleWideMode: () => void;
  onOpenBackupModal: () => void;
  onOpenTechDocsModal: () => void;
  onOpenUpdateModal: () => void;
  onOpenCloudModal: () => void;
  syncStatus?: SyncStatusInfo;
  hasUpdate?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  isWideMode,
  onToggleWideMode,
  onOpenBackupModal,
  onOpenTechDocsModal,
  onOpenUpdateModal,
  onOpenCloudModal,
  syncStatus,
  hasUpdate = false,
}) => {
  return (
    <header className="app-header">
      <div className="brand-wrapper">
        <div className="brand-icon">
          <Flame size={20} />
        </div>
        <div>
          <h1 className="brand-title">IronTrack</h1>
          <div className="brand-subtitle">铁脉 · 健身渐进超负荷</div>
        </div>
      </div>

      <div className="header-actions">
        {/* Version Check & Update button */}
        <button
          className="icon-btn"
          onClick={onOpenUpdateModal}
          title={hasUpdate ? '发现新版本，点击查看更新' : '检查应用版本与更新'}
          style={{ position: 'relative', color: hasUpdate ? 'var(--accent-primary)' : 'inherit' }}
        >
          <Sparkles size={18} />
          {hasUpdate && (
            <span
              style={{
                position: 'absolute',
                top: '5px',
                right: '5px',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: 'var(--accent-primary)',
                boxShadow: '0 0 8px var(--accent-primary)',
              }}
            />
          )}
        </button>

        {/* Technical Architecture Document in-app reader */}
        <button
          className="icon-btn"
          onClick={onOpenTechDocsModal}
          title="查看项目技术架构方案文档"
          style={{ color: 'var(--accent-cyan)' }}
        >
          <FileCode2 size={18} />
        </button>

        {/* Toggle between mobile frame & full-width preview on desktop browsers */}
        <button
          className={`icon-btn ${isWideMode ? 'active' : ''}`}
          onClick={onToggleWideMode}
          title={isWideMode ? '切换为手机尺寸视图' : '切换为宽屏视图'}
        >
          {isWideMode ? <Smartphone size={18} /> : <Monitor size={18} />}
        </button>

        {/* Private Cloud / Dual-Mode Sync Button */}
        <button
          className="icon-btn"
          onClick={onOpenCloudModal}
          title={
            syncStatus?.state === 'online'
              ? `已连接小主机 (${syncStatus.pingMs ? syncStatus.pingMs + 'ms' : '在线'})`
              : syncStatus?.state === 'syncing'
              ? '正在与小主机同步中...'
              : syncStatus?.state === 'offline_pending'
              ? '小主机暂未连通 (离线暂存模式)'
              : '私有云与双模存储设置'
          }
          style={{
            position: 'relative',
            color:
              syncStatus?.state === 'online'
                ? 'var(--accent-primary)'
                : syncStatus?.state === 'syncing'
                ? 'var(--accent-cyan)'
                : syncStatus?.state === 'offline_pending'
                ? 'var(--accent-warning)'
                : 'var(--text-muted)',
          }}
        >
          {syncStatus?.state === 'syncing' ? (
            <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} />
          ) : (
            <Cloud size={18} />
          )}

          {/* Status dot indicator */}
          {syncStatus?.state && syncStatus.state !== 'local' && (
            <span
              style={{
                position: 'absolute',
                top: '5px',
                right: '5px',
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                backgroundColor:
                  syncStatus.state === 'online'
                    ? 'var(--accent-primary)'
                    : syncStatus.state === 'syncing'
                    ? 'var(--accent-cyan)'
                    : 'var(--accent-warning)',
                boxShadow: `0 0 6px ${
                  syncStatus.state === 'online'
                    ? 'var(--accent-primary)'
                    : 'var(--accent-warning)'
                }`,
              }}
            />
          )}
        </button>

        {/* Data Persistence & Backup modal trigger */}
        <button
          className="icon-btn"
          onClick={onOpenBackupModal}
          title="数据备份与持久化管理"
        >
          <Database size={18} />
        </button>
      </div>
    </header>
  );
};
