import React from 'react';
import { RotateCw, LogOut, ShieldCheck, User } from 'lucide-react';
import type { AuthUser } from '../types';

interface HeaderProps {
  title: string;
  subtitle: string;
  user: AuthUser | null;
  onRefresh: () => void;
  onLogout: () => void;
  isRefreshing?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  user,
  onRefresh,
  onLogout,
  isRefreshing = false,
}) => {
  return (
    <header style={{
      height: '70px',
      borderBottom: '1px solid var(--border-subtle)',
      background: 'rgba(16, 20, 29, 0.75)',
      backdropFilter: 'blur(16px)',
      position: 'sticky',
      top: 0,
      zIndex: 40,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 32px',
    }}>
      {/* Title area */}
      <div>
        <h1 style={{
          fontSize: '20px',
          fontWeight: 800,
          fontFamily: 'var(--font-display)',
          color: '#fff',
          letterSpacing: '-0.3px',
        }}>
          {title}
        </h1>
        <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '2px' }}>
          {subtitle}
        </p>
      </div>

      {/* Action and User Profile area */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {/* Refresh button */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="btn btn-secondary"
          style={{ padding: '7px 12px', fontSize: '13px' }}
          title="刷新数据"
        >
          <RotateCw
            size={15}
            style={{
              animation: isRefreshing ? 'spin 1s linear infinite' : 'none',
            }}
          />
          <span>{isRefreshing ? '正在同步...' : '刷新'}</span>
        </button>

        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>

        {/* Admin User Card */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '6px 12px 6px 8px',
          background: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #a855f7, #6366f1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
          }}>
            <User size={16} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#fff' }}>
                {user?.username || '管理员'}
              </span>
              <span className="badge badge-admin" style={{ fontSize: '10px', padding: '1px 6px' }}>
                <ShieldCheck size={11} /> ADMIN
              </span>
            </div>
            <div style={{ fontSize: '10.5px', color: 'var(--text-dim)' }}>
              可同时登录健身 App
            </div>
          </div>
        </div>

        {/* Logout button */}
        <button
          onClick={onLogout}
          className="btn btn-secondary btn-icon"
          title="退出管理后台"
          style={{ color: 'var(--text-muted)' }}
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
};
