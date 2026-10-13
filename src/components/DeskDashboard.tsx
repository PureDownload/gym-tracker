import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Droplets,
  Zap,
  Pill,
  Sparkles,
  Flame,
  Check,
  RefreshCw,
  Plus,
  Minus,
  RotateCcw,
  Cloud,
  Calendar,
  User,
  LogIn,
  ExternalLink,
  ShieldCheck,
  Moon,
  Shield,
} from 'lucide-react';
import type { DailyHabitEntry, HabitItemConfig, HabitRecordItem, WorkoutSession } from '../types/workout';
import { storageService } from '../services/storage';
import { cloudSyncService } from '../services/cloudSyncService';
import { cloudAuthService } from '../services/cloudAuthService';
import type { SyncStatusInfo } from '../types/cloud';
import { TrainingCalendar } from './TrainingCalendar';
import '../styles/desk.css';

interface DeskDashboardProps {
  workouts: WorkoutSession[];
  syncStatus: SyncStatusInfo;
  onTriggerSync: () => void;
  onOpenCloudModal: () => void;
}

export const DeskDashboard: React.FC<DeskDashboardProps> = ({
  workouts,
  syncStatus,
  onTriggerSync,
  onOpenCloudModal,
}) => {
  const [cloudConfig, setCloudConfig] = useState(() => cloudAuthService.getConfig());

  useEffect(() => {
    const unsub = cloudAuthService.subscribe((cfg) => setCloudConfig(cfg));
    return unsub;
  }, []);

  const serverUrl = useMemo(() => {
    if (cloudConfig.serverUrl) return cloudConfig.serverUrl;
    if (typeof window !== 'undefined') {
      return `${window.location.protocol}//${window.location.hostname}:3001`;
    }
    return 'http://localhost:3001';
  }, [cloudConfig.serverUrl]);
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [habitConfigs] = useState<HabitItemConfig[]>(() =>
    storageService.getHabitConfigs()
  );
  const [currentEntry, setCurrentEntry] = useState<DailyHabitEntry>({
    id: `habit_${todayStr}`,
    date: todayStr,
    records: {},
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  const [historyHabits, setHistoryHabits] = useState<DailyHabitEntry[]>([]);
  const [waterAnimation, setWaterAnimation] = useState<boolean>(false);

  // 加载当日打卡数据及历史
  const loadHabitData = useCallback(async () => {
    try {
      const list = await storageService.getDailyHabits();
      setHistoryHabits(list || []);
      const todayData = list.find((h) => h.date === todayStr && !h.isDeleted);
      if (todayData) {
        setCurrentEntry({
          ...todayData,
          records: todayData.records || {},
        });
      } else {
        setCurrentEntry({
          id: `habit_${todayStr}`,
          date: todayStr,
          records: {},
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }
    } catch (e) {
      console.warn('Failed to load habit data in DeskDashboard:', e);
    }
  }, [todayStr]);

  useEffect(() => {
    loadHabitData();
    const unsub = cloudSyncService.onRemoteDataChanged(() => {
      loadHabitData();
    });
    return unsub;
  }, [loadHabitData]);

  // 水分打卡配置与数值
  const waterConfig = useMemo(() => {
    return habitConfigs.find((c) => c.id === 'water') || {
      id: 'water',
      name: '日常饮水',
      type: 'counter' as const,
      targetValue: 2500,
      unit: 'ml',
      stepPresets: [200, 300, 500],
      icon: 'Droplets',
      color: '#06b6d4',
      sortOrder: 1,
      isEnabled: true,
    };
  }, [habitConfigs]);

  const recordsSafe = currentEntry?.records || {};
  const currentWaterVal = recordsSafe['water']?.value || 0;
  const waterProgress = Math.min(100, Math.round((currentWaterVal / waterConfig.targetValue) * 100));

  // 保存当日变更并静默同步
  const persistEntry = useCallback(
    async (updatedRecords: Record<string, HabitRecordItem>) => {
      const newEntry: DailyHabitEntry = {
        ...currentEntry,
        records: updatedRecords || {},
        updatedAt: Date.now(),
      };
      setCurrentEntry(newEntry);
      await storageService.saveDailyHabit(newEntry);
      cloudSyncService.silentSyncOnSaveHabit(newEntry);
    },
    [currentEntry]
  );

  // 喝水累加处理
  const handleAddWater = useCallback(
    (delta: number) => {
      const currentRecs = currentEntry?.records || {};
      const newVal = Math.max(0, currentWaterVal + delta);
      const isCompleted = newVal >= waterConfig.targetValue;
      const updated: Record<string, HabitRecordItem> = {
        ...currentRecs,
        water: {
          value: newVal,
          completed: isCompleted,
          updatedAt: Date.now(),
        },
      };
      setWaterAnimation(true);
      setTimeout(() => setWaterAnimation(false), 400);
      persistEntry(updated);
    },
    [currentWaterVal, waterConfig.targetValue, currentEntry?.records, persistEntry]
  );

  // 重置今日饮水
  const handleResetWater = useCallback(() => {
    if (window.confirm('确定要清空今日饮水记录吗？')) {
      const currentRecs = currentEntry?.records || {};
      const updated: Record<string, HabitRecordItem> = {
        ...currentRecs,
        water: {
          value: 0,
          completed: false,
          updatedAt: Date.now(),
        },
      };
      persistEntry(updated);
    }
  }, [currentEntry?.records, persistEntry]);

  // 补剂开关打卡
  const handleToggleHabit = useCallback(
    (config: HabitItemConfig) => {
      const currentRecs = currentEntry?.records || {};
      const existing = currentRecs[config.id];
      const nextCompleted = !existing?.completed;
      const updated: Record<string, HabitRecordItem> = {
        ...currentRecs,
        [config.id]: {
          value: nextCompleted ? config.targetValue : 0,
          completed: nextCompleted,
          updatedAt: Date.now(),
        },
      };
      persistEntry(updated);
    },
    [currentEntry?.records, persistEntry]
  );

  // 监听工位键盘数字快捷键 (1 -> +200ml, 2 -> +300ml, 3 -> +500ml)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 避免输入框冲突
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      if (e.key === '1') {
        handleAddWater(200);
      } else if (e.key === '2') {
        handleAddWater(300);
      } else if (e.key === '3') {
        handleAddWater(500);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleAddWater]);

  // 计算本周 7 天连续情况
  const weekStats = useMemo(() => {
    const now = new Date();
    const currentDay = now.getDay() || 7; // 1-7 (周一为1)
    const monday = new Date(now);
    monday.setDate(now.getDate() - currentDay + 1);

    const days = [];
    const dayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    let completedDaysCount = 0;

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dStr = d.toISOString().split('T')[0];
      const entry = historyHabits.find((h) => h.date === dStr && !h.isDeleted);
      const isToday = dStr === todayStr;

      // 达成判定：喝水达到 80% 或已打卡任一补剂
      const waterAmt = entry?.records?.['water']?.value || (isToday ? currentWaterVal : 0);
      const creatineDone = entry?.records?.['creatine']?.completed || (isToday ? currentEntry?.records?.['creatine']?.completed : false);
      const isAchieved = waterAmt >= 2000 || creatineDone;

      if (isAchieved) {
        completedDaysCount++;
      }

      days.push({
        name: dayNames[i],
        dateNum: d.getDate(),
        dateStr: dStr,
        isToday,
        isAchieved,
      });
    }

    return { days, completedDaysCount };
  }, [historyHabits, todayStr, currentWaterVal, currentEntry.records]);

  // 图标渲染辅助
  const renderIcon = (iconName: string) => {
    switch (iconName) {
      case 'Droplets':
        return <Droplets size={20} />;
      case 'Zap':
        return <Zap size={20} />;
      case 'Pill':
        return <Pill size={20} />;
      case 'Sparkles':
        return <Sparkles size={20} />;
      case 'Flame':
        return <Flame size={20} />;
      case 'Moon':
        return <Moon size={20} />;
      case 'Shield':
        return <Shield size={20} />;
      default:
        return <Check size={20} />;
    }
  };

  // 星期展示
  const formattedToday = useMemo(() => {
    const date = new Date();
    const options: Intl.DateTimeFormatOptions = {
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    };
    return date.toLocaleDateString('zh-CN', options);
  }, []);

  return (
    <div className="desk-layout">
      {/* 顶部栏 */}
      <header className="desk-header">
        <div className="desk-brand">
          <div className="desk-logo-badge">
            <Droplets size={20} />
          </div>
          <div className="desk-title-group">
            <h1>
              IronDesk · 工位健康工作台
              <span className="desk-mode-tag">Desk Mode</span>
            </h1>
            <div className="desk-subtitle">{formattedToday} · 专注于日常饮水与体魄补剂保持</div>
          </div>
        </div>

        <div className="desk-controls">
          {/* 私有云账号状态与登录 */}
          {cloudAuthService.isCloudModeActive() ? (
            <button
              type="button"
              className="desk-btn-ghost"
              onClick={onOpenCloudModal}
              title="查看私有云账号与状态"
            >
              <User size={14} color="var(--accent-primary)" />
              <span>{cloudConfig.user?.username || '已登录'}</span>
              <span style={{ fontSize: '0.72rem', opacity: 0.75 }}>
                ({cloudConfig.user?.role === 'admin' ? '管理员' : '用户'})
              </span>
            </button>
          ) : (
            <button
              type="button"
              className="desk-btn-ghost desk-btn-login-highlight"
              onClick={onOpenCloudModal}
              title="登录或连接 J1900 私有云"
            >
              <LogIn size={14} />
              <span>登录私有云</span>
            </button>
          )}

          {/* PC 管理后台入口 */}
          <a
            href={`${serverUrl}/admin`}
            target="_blank"
            rel="noreferrer"
            className="desk-btn-ghost desk-btn-admin"
            title="新窗口打开 J1900 PC 管理后台 (/admin)"
          >
            <ShieldCheck size={14} color="var(--accent-cyan)" />
            <span>管理后台</span>
            <ExternalLink size={12} style={{ opacity: 0.7 }} />
          </a>

          {/* 数据同步状态 */}
          <button
            type="button"
            className="desk-btn-ghost desk-btn-sync"
            onClick={onTriggerSync}
            title="点击同步数据到 J1900 私有云"
          >
            {syncStatus.state === 'connecting' ? (
              <RefreshCw size={14} className="spin" />
            ) : (
              <Cloud size={14} />
            )}
            <span>
              {syncStatus.state === 'online'
                ? '已同步'
                : syncStatus.state === 'offline_pending'
                ? `待上传 (${syncStatus.pendingCount})`
                : '离线模式'}
            </span>
          </button>
        </div>
      </header>

      {/* 主工作区 */}
      <main className="desk-grid">
        {/* 1. 喝水快捷岛 */}
        <section className="desk-card">
          <div className="desk-card-header">
            <div className="desk-card-title">
              <Droplets size={20} color="#06b6d4" />
              <span>工位日常饮水 (Hydration)</span>
            </div>
            <div className="desk-card-action" onClick={handleResetWater} title="重置今日饮水">
              <RotateCcw size={14} />
              <span>清零</span>
            </div>
          </div>

          <div className="water-hero">
            <div className={`water-ring-container ${waterAnimation ? 'pulse' : ''}`}>
              <svg className="water-ring-svg" viewBox="0 0 160 160">
                <circle
                  className="water-ring-bg"
                  cx="80"
                  cy="80"
                  r="68"
                  strokeWidth="10"
                  fill="transparent"
                />
                <circle
                  className="water-ring-fill"
                  cx="80"
                  cy="80"
                  r="68"
                  strokeWidth="10"
                  fill="transparent"
                  strokeDasharray={427}
                  strokeDashoffset={427 - (427 * waterProgress) / 100}
                />
              </svg>

              <div className="water-ring-center">
                <span className="water-amount-val">{currentWaterVal}</span>
                <span className="water-amount-unit">/ {waterConfig.targetValue} ml</span>
                <span className="water-target-hint">已完成 {waterProgress}%</span>
              </div>
            </div>

            {/* 快捷加水胶囊 */}
            <div className="water-pills-row">
              <button
                type="button"
                className="water-btn-pill"
                onClick={() => handleAddWater(200)}
                title="按键盘 1 键快捷加水"
              >
                <span className="pill-amount">+200ml</span>
                <span className="pill-shortcut">水杯 · 键 [1]</span>
              </button>

              <button
                type="button"
                className="water-btn-pill"
                onClick={() => handleAddWater(300)}
                title="按键盘 2 键快捷加水"
              >
                <span className="pill-amount">+300ml</span>
                <span className="pill-shortcut">咖啡杯 · 键 [2]</span>
              </button>

              <button
                type="button"
                className="water-btn-pill"
                onClick={() => handleAddWater(500)}
                title="按键盘 3 键快捷加水"
              >
                <span className="pill-amount">+500ml</span>
                <span className="pill-shortcut">运动壶 · 键 [3]</span>
              </button>
            </div>

            {/* 微调步进 */}
            <div className="water-actions-row">
              <button
                type="button"
                className="water-btn-mini"
                onClick={() => handleAddWater(-50)}
              >
                <Minus size={12} style={{ display: 'inline', marginRight: 4 }} /> 50ml
              </button>
              <button
                type="button"
                className="water-btn-mini"
                onClick={() => handleAddWater(50)}
              >
                <Plus size={12} style={{ display: 'inline', marginRight: 4 }} /> 50ml
              </button>
              <button
                type="button"
                className="water-btn-mini"
                onClick={() => handleAddWater(100)}
              >
                <Plus size={12} style={{ display: 'inline', marginRight: 4 }} /> 100ml
              </button>
            </div>
          </div>
        </section>

        {/* 2. 补剂打卡清单 */}
        <section className="desk-card">
          <div className="desk-card-header">
            <div className="desk-card-title">
              <Zap size={20} color="#22c55e" />
              <span>今日补剂与健康习惯</span>
            </div>
            <div className="desk-card-action">
              <span>点击直接打卡</span>
            </div>
          </div>

          <div className="habits-list">
            {habitConfigs
              .filter((c) => c.id !== 'water' && c.isEnabled)
              .map((cfg) => {
                const isChecked = Boolean(currentEntry?.records?.[cfg.id]?.completed);
                return (
                  <div
                    key={cfg.id}
                    className={`habit-row-item ${isChecked ? 'checked' : ''}`}
                    onClick={() => handleToggleHabit(cfg)}
                  >
                    <div className="habit-info">
                      <div className="habit-icon-box">{renderIcon(cfg.icon)}</div>
                      <div>
                        <div className="habit-name">{cfg.name}</div>
                        <div className="habit-tag">
                          {isChecked ? '已达成 · 今日状态良好' : `目标: ${cfg.targetValue} ${cfg.unit}`}
                        </div>
                      </div>
                    </div>

                    <div className="habit-checkbox">
                      {isChecked && <Check size={16} strokeWidth={3} />}
                    </div>
                  </div>
                );
              })}
          </div>
        </section>

        {/* 3. 连续打卡与周历横幅 */}
        <section className="desk-card streak-card">
          <div className="streak-metrics-row">
            <div className="streak-metric">
              <div className="streak-flame-icon">
                <Flame size={24} />
              </div>
              <div>
                <div className="streak-value">本周连续 {weekStats.completedDaysCount} 天达标</div>
                <div className="streak-label">规律补水与肌酸维持是力量与恢复的基础</div>
              </div>
            </div>

            <div className="desk-card-action">
              <Calendar size={16} />
              <span>本周打卡追踪</span>
            </div>
          </div>

          <div className="week-pills-grid">
            {weekStats.days.map((d) => (
              <div
                key={d.dateStr}
                className={`day-pill ${d.isToday ? 'today' : ''} ${d.isAchieved ? 'completed' : ''}`}
              >
                <span className="day-name">{d.name}</span>
                <span className="day-date">{d.dateNum}日</span>
                <div className="day-status-dot" />
              </div>
            ))}
          </div>
        </section>

        {/* 4. 训练与打卡全景日历 */}
        <section className="desk-card calendar-card" style={{ gridColumn: '1 / -1' }}>
          <div className="desk-card-header">
            <div className="desk-card-title">
              <Calendar size={20} color="var(--accent-primary)" />
              <span>力量训练与打卡全景日历 (Training & Habit Calendar)</span>
            </div>
            <div className="desk-card-action">
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                🟢 力量训练 · 🔵 习惯/补剂打卡
              </span>
            </div>
          </div>

          <TrainingCalendar
            workouts={workouts}
            dailyHabits={historyHabits}
          />
        </section>
      </main>

      {/* 底部键盘提示 */}
      <footer className="desk-footer-hint">
        <span>💡 工位快捷键支持：</span>
        <span>
          按 <span className="kbd-badge">1</span> +200ml
        </span>
        <span>
          按 <span className="kbd-badge">2</span> +300ml
        </span>
        <span>
          按 <span className="kbd-badge">3</span> +500ml
        </span>
        <span>数据自动本地缓存并增量同步至私有云</span>
      </footer>
    </div>
  );
};
