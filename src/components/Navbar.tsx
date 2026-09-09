import React from 'react';
import { Dumbbell, CalendarDays, History, LineChart, BookOpen } from 'lucide-react';

export type TabType = 'logger' | 'calendar' | 'history' | 'analytics' | 'exercises';

interface NavbarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, onTabChange }) => {
  return (
    <nav className="bottom-nav" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
      <button
        className={`nav-tab ${activeTab === 'logger' ? 'active' : ''}`}
        onClick={() => onTabChange('logger')}
      >
        <Dumbbell size={19} />
        <span>记训练</span>
      </button>

      <button
        className={`nav-tab ${activeTab === 'calendar' ? 'active' : ''}`}
        onClick={() => onTabChange('calendar')}
      >
        <CalendarDays size={19} />
        <span>日历</span>
      </button>

      <button
        className={`nav-tab ${activeTab === 'history' ? 'active' : ''}`}
        onClick={() => onTabChange('history')}
      >
        <History size={19} />
        <span>历史</span>
      </button>

      <button
        className={`nav-tab ${activeTab === 'analytics' ? 'active' : ''}`}
        onClick={() => onTabChange('analytics')}
      >
        <LineChart size={19} />
        <span>趋势</span>
      </button>

      <button
        className={`nav-tab ${activeTab === 'exercises' ? 'active' : ''}`}
        onClick={() => onTabChange('exercises')}
      >
        <BookOpen size={19} />
        <span>动作库</span>
      </button>
    </nav>
  );
};
