import React from 'react';
import { Flame, Cloud, RefreshCw, User } from 'lucide-react';
import type { SyncStatusInfo } from '../types/cloud';

interface HeaderProps {
  syncStatus?: SyncStatusInfo;
  hasUpdate?: boolean;
  onNavigateToProfile?: () => void;
  onOpenCloudModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  syncStatus,
  hasUpdate = false,
  onNavigateToProfile,
  onOpenCloudModal,
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

      <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Subtle Cloud Sync Status Pill */}
        {syncStatus && (
          <button
            type="button"
            className="header-sync-pill"
            onClick={onOpenCloudModal || onNavigateToProfile}
            title={
              syncStatus.state === 'online'
                ? `私有云已连通 (${syncStatus.pingMs ? syncStatus.pingMs + 'ms' : '在线'})`
                : syncStatus.state === 'syncing'
                ? '正在与小主机增量同步...'
                : syncStatus.state === 'offline_pending'
                ? '小主机暂未连通 (离线暂存)'
                : '本地数据模式'
            }
          >
            {syncStatus.state === 'syncing' ? (
              <RefreshCw size={13} className="animate-spin" color="var(--accent-cyan)" />
            ) : (
              <Cloud
                size={14}
                color={
                  syncStatus.state === 'online'
                    ? '#10b981'
                    : syncStatus.state === 'offline_pending'
                    ? '#f59e0b'
                    : 'var(--text-muted)'
                }
              />
            )}
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 600,
                color:
                  syncStatus.state === 'online'
                    ? '#10b981'
                    : syncStatus.state === 'syncing'
                    ? 'var(--accent-cyan)'
                    : syncStatus.state === 'offline_pending'
                    ? '#f59e0b'
                    : 'var(--text-muted)',
              }}
            >
              {syncStatus.state === 'online'
                ? '已同步'
                : syncStatus.state === 'syncing'
                ? '同步中'
                : syncStatus.state === 'offline_pending'
                ? '待连通'
                : '本地'}
            </span>
          </button>
        )}

        {/* User Profile Avatar / Settings Shortcut */}
        {onNavigateToProfile && (
          <button
            type="button"
            className="header-profile-btn"
            onClick={onNavigateToProfile}
            title="进入「我的」个人中心与设置"
          >
            <User size={16} />
            {hasUpdate && <span className="header-update-dot" />}
          </button>
        )}
      </div>
    </header>
  );
};
