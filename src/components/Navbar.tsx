import React, { useState } from 'react';
import { Dumbbell, History, LineChart, BookOpen, User } from 'lucide-react';

export type TabType = 'logger' | 'history' | 'analytics' | 'exercises' | 'profile';

interface NavbarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  hasUpdate?: boolean;
}

interface NavItem {
  id: TabType;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'logger', label: '记训练', icon: Dumbbell },
  { id: 'history', label: '历史', icon: History },
  { id: 'analytics', label: '洞察', icon: LineChart },
  { id: 'exercises', label: '动作库', icon: BookOpen },
  { id: 'profile', label: '我的', icon: User },
];

export const Navbar: React.FC<NavbarProps> = ({ activeTab, onTabChange, hasUpdate = false }) => {
  const [clickedTab, setClickedTab] = useState<TabType | null>(null);
  const activeIndex = Math.max(0, NAV_ITEMS.findIndex((item) => item.id === activeTab));

  const handleTabClick = (tabId: TabType) => {
    setClickedTab(tabId);
    onTabChange(tabId);
    // Reset click animation trigger
    setTimeout(() => {
      setClickedTab(null);
    }, 450);
  };

  return (
    <div className="bottom-nav-wrapper">
      <nav className="bottom-nav" role="navigation" aria-label="底部导航">
        {/* Sliding Fluid Indicator Pill */}
        <div
          className="nav-sliding-pill"
          style={{
            transform: `translateX(${activeIndex * 100}%)`,
          }}
          aria-hidden="true"
        />

        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const isJustClicked = clickedTab === item.id;

          return (
            <button
              key={item.id}
              type="button"
              className={`nav-tab ${isActive ? 'active' : ''} ${isJustClicked ? 'just-clicked' : ''}`}
              onClick={() => handleTabClick(item.id)}
              aria-selected={isActive}
            >
              <div className="nav-icon-container">
                <Icon size={20} className="nav-icon" />
                {item.id === 'profile' && hasUpdate && (
                  <span className="nav-update-badge" title="有新版本更新">
                    <span className="nav-badge-ping" />
                    <span className="nav-badge-dot" />
                  </span>
                )}
              </div>
              <span className="nav-label">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};

