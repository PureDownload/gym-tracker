import React from 'react';
import { Database, Monitor, Smartphone, Flame, FileCode2, Sparkles } from 'lucide-react';

interface HeaderProps {
  isWideMode: boolean;
  onToggleWideMode: () => void;
  onOpenBackupModal: () => void;
  onOpenTechDocsModal: () => void;
  onOpenUpdateModal: () => void;
  hasUpdate?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  isWideMode,
  onToggleWideMode,
  onOpenBackupModal,
  onOpenTechDocsModal,
  onOpenUpdateModal,
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
