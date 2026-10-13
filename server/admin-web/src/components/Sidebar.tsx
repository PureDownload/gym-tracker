import React from 'react';
import {
  LayoutDashboard,
  Users,
  Dumbbell,
  Activity,
  Server,
  Zap,
  ExternalLink,
} from 'lucide-react';

export type TabKey = 'overview' | 'users' | 'workouts' | 'metrics' | 'system';

interface SidebarProps {
  currentTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  serverVersion?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onTabChange, serverVersion = '1.1.4' }) => {
  const navItems: Array<{ key: TabKey; label: string; icon: React.ReactNode; desc: string }> = [
    { key: 'overview', label: '数据大盘', icon: <LayoutDashboard size={19} />, desc: '全站健身数据看板' },
    { key: 'users', label: '用户与权限', icon: <Users size={19} />, desc: '账号角色与数据管理' },
    { key: 'workouts', label: '全员训练透视', icon: <Dumbbell size={19} />, desc: '动作组数与容量流水' },
    { key: 'metrics', label: '体测健康', icon: <Activity size={19} />, desc: '体重体脂演进追踪' },
    { key: 'system', label: '系统运维', icon: <Server size={19} />, desc: 'J1900与SQLite运维' },
  ];

  return (
    <aside style={{
      width: '260px',
      background: 'var(--bg-surface)',
      borderRight: '1px solid var(--border-subtle)',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      position: 'sticky',
      top: 0,
      flexShrink: 0,
      zIndex: 50,
    }}>
      {/* Brand Header */}
      <div style={{
        padding: '24px 20px 20px',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}>
        <div style={{
          width: '38px',
          height: '38px',
          borderRadius: '10px',
          background: 'linear-gradient(135deg, #22c55e 0%, #06b6d4 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 16px rgba(34, 197, 94, 0.35)',
        }}>
          <Zap size={22} color="#052e16" strokeWidth={2.6} />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 800,
              fontSize: '18px',
              letterSpacing: '-0.3px',
              color: '#fff',
            }}>IronTrack</span>
            <span style={{
              background: 'rgba(34, 197, 94, 0.15)',
              color: '#22c55e',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              fontSize: '10px',
              padding: '1px 5px',
              borderRadius: '4px',
              fontWeight: 700,
            }}>ADMIN</span>
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--text-dim)' }}>
            铁脉健身控制台 · J1900
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav style={{ padding: '16px 12px', flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {navItems.map((item) => {
          const isActive = currentTab === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onTabChange(item.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                width: '100%',
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                background: isActive ? 'rgba(34, 197, 94, 0.12)' : 'transparent',
                color: isActive ? '#4ade80' : 'var(--text-muted)',
                border: isActive ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid transparent',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.18s ease',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                  e.currentTarget.style.color = '#fff';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--text-muted)';
                }
              }}
            >
              <div style={{
                color: isActive ? '#22c55e' : 'var(--text-dim)',
                display: 'flex',
                alignItems: 'center',
              }}>
                {item.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', fontWeight: isActive ? 700 : 500 }}>
                  {item.label}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '1px' }}>
                  {item.desc}
                </div>
              </div>
            </button>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div style={{
        padding: '16px 16px 20px',
        borderTop: '1px solid var(--border-subtle)',
        background: 'rgba(0,0,0,0.2)',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '10px',
        }}>
          <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>服务状态</span>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '11px',
            color: '#22c55e',
            fontWeight: 600,
          }}>
            <span style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: '#22c55e',
              boxShadow: '0 0 8px #22c55e',
            }} />
            J1900 在线 (v{serverVersion})
          </span>
        </div>
        <a
          href="/api/health"
          target="_blank"
          rel="noreferrer"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            width: '100%',
            padding: '7px 0',
            fontSize: '11.5px',
            color: 'var(--text-muted)',
            textDecoration: 'none',
            borderRadius: '6px',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid var(--border-subtle)',
            transition: 'all 0.18s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#fff';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.18)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--text-muted)';
            e.currentTarget.style.borderColor = 'var(--border-subtle)';
          }}
        >
          查看心跳健康状态 <ExternalLink size={12} />
        </a>
      </div>
    </aside>
  );
};
