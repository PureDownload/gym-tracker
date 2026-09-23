import React from 'react';
import { Dumbbell, History, LineChart, BookOpen, User } from 'lucide-react';

export type TabType = 'logger' | 'history' | 'analytics' | 'exercises' | 'profile';

interface NavbarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  hasUpdate?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, onTabChange, hasUpdate = false }) => {
  return (
    <nav className="bottom-nav" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
      <button
        type="button"
        className={`nav-tab ${activeTab === 'logger' ? 'active' : ''}`}
        onClick={() => onTabChange('logger')}
      >
        <Dumbbell size={19} />
        <span>记训练</span>
      </button>

      <button
        type="button"
        className={`nav-tab ${activeTab === 'history' ? 'active' : ''}`}
        onClick={() => onTabChange('history')}
      >
        <History size={19} />
        <span>历史</span>
      </button>

      <button
        type="button"
        className={`nav-tab ${activeTab === 'analytics' ? 'active' : ''}`}
        onClick={() => onTabChange('analytics')}
      >
        <LineChart size={19} />
        <span>洞察</span>
      </button>

      <button
        type="button"
        className={`nav-tab ${activeTab === 'exercises' ? 'active' : ''}`}
        onClick={() => onTabChange('exercises')}
      >
        <BookOpen size={19} />
        <span>动作库</span>
      </button>

      <button
        type="button"
        className={`nav-tab ${activeTab === 'profile' ? 'active' : ''}`}
        onClick={() => onTabChange('profile')}
        style={{ position: 'relative' }}
      >
        <User size={19} />
        <span>我的</span>
        {hasUpdate && (
          <span
            style={{
              position: 'absolute',
              top: '6px',
              right: 'calc(50% - 14px)',
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: '#ef4444',
            }}
          />
        )}
      </button>
    </nav>
  );
};
