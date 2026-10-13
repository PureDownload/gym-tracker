import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Droplets, Zap, Check, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import type { DailyHabitEntry, HabitItemConfig, HabitRecordItem } from '../types/workout';
import { storageService } from '../services/storage';
import { cloudSyncService } from '../services/cloudSyncService';

interface DailyHabitCardProps {
  onDataChanged?: () => void;
}

export const DailyHabitCard: React.FC<DailyHabitCardProps> = ({ onDataChanged }) => {
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
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    try {
      const list = await storageService.getDailyHabits();
      const todayData = list.find((h) => h.date === todayStr && !h.isDeleted);
      if (todayData) {
        setCurrentEntry({
          ...todayData,
          records: todayData.records || {},
        });
      }
    } catch (e) {
      console.warn('Failed to load daily habit data:', e);
    }
  }, [todayStr]);

  useEffect(() => {
    loadData();
    const unsub = cloudSyncService.onRemoteDataChanged(() => {
      loadData();
    });
    return unsub;
  }, [loadData]);

  const waterConfig = useMemo(() => {
    return habitConfigs.find((c) => c.id === 'water') || {
      id: 'water',
      name: '饮水',
      targetValue: 2500,
      unit: 'ml',
    };
  }, [habitConfigs]);

  const recordsSafe = currentEntry?.records || {};
  const currentWater = recordsSafe['water']?.value || 0;

  const persistEntry = useCallback(
    async (records: Record<string, HabitRecordItem>) => {
      const newEntry: DailyHabitEntry = {
        ...currentEntry,
        records: records || {},
        updatedAt: Date.now(),
      };
      setCurrentEntry(newEntry);
      await storageService.saveDailyHabit(newEntry);
      cloudSyncService.silentSyncOnSaveHabit(newEntry);
      onDataChanged?.();
    },
    [currentEntry, onDataChanged]
  );

  const handleQuickAddWater = useCallback(
    (e: React.MouseEvent, amount = 250) => {
      e.stopPropagation();
      const currentRecs = currentEntry?.records || {};
      const newVal = currentWater + amount;
      const records = {
        ...currentRecs,
        water: {
          value: newVal,
          completed: newVal >= waterConfig.targetValue,
          updatedAt: Date.now(),
        },
      };
      persistEntry(records);
    },
    [currentWater, waterConfig.targetValue, currentEntry?.records, persistEntry]
  );

  const handleToggleHabit = useCallback(
    (e: React.MouseEvent, cfg: HabitItemConfig) => {
      e.stopPropagation();
      const currentRecs = currentEntry?.records || {};
      const existing = currentRecs[cfg.id];
      const nextCompleted = !existing?.completed;
      const records = {
        ...currentRecs,
        [cfg.id]: {
          value: nextCompleted ? cfg.targetValue : 0,
          completed: nextCompleted,
          updatedAt: Date.now(),
        },
      };
      persistEntry(records);
    },
    [currentEntry?.records, persistEntry]
  );

  const supplementConfigs = useMemo(() => {
    return habitConfigs.filter((c) => c.id !== 'water' && c.isEnabled);
  }, [habitConfigs]);

  const completedSupplementsCount = useMemo(() => {
    const currentRecs = currentEntry?.records || {};
    return supplementConfigs.filter((c) => currentRecs[c.id]?.completed).length;
  }, [supplementConfigs, currentEntry?.records]);

  return (
    <div
      style={{
        margin: '0 0 16px',
        padding: '14px 16px',
        borderRadius: '14px',
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
      }}
    >
      {/* 紧凑顶行 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
        }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              background: 'rgba(6, 182, 212, 0.15)',
              color: '#06b6d4',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Droplets size={16} />
          </div>
          <div>
            <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#f1f5f9' }}>
              今日打卡 · 习惯与补剂
            </div>
            <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
              饮水 {currentWater}/{waterConfig.targetValue}ml · 补剂已打卡 {completedSupplementsCount}/
              {supplementConfigs.length}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* 快捷喝水小按钮 */}
          <button
            type="button"
            onClick={(e) => handleQuickAddWater(e, 250)}
            style={{
              background: 'rgba(6, 182, 212, 0.15)',
              border: '1px solid rgba(6, 182, 212, 0.3)',
              color: '#38bdf8',
              borderRadius: '8px',
              padding: '4px 10px',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '2px',
            }}
            title="快捷加水 250ml"
          >
            <Plus size={12} />
            250ml
          </button>

          <span style={{ color: '#64748b' }}>
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </span>
        </div>
      </div>

      {/* 展开的胶囊列表 */}
      {isExpanded && (
        <div
          style={{
            marginTop: '14px',
            paddingTop: '12px',
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          {supplementConfigs.map((cfg) => {
            const isChecked = Boolean(currentEntry?.records?.[cfg.id]?.completed);
            return (
              <button
                key={cfg.id}
                type="button"
                onClick={(e) => handleToggleHabit(e, cfg)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '10px',
                  border: isChecked
                    ? '1px solid rgba(34, 197, 94, 0.5)'
                    : '1px solid rgba(255, 255, 255, 0.1)',
                  background: isChecked ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                  color: isChecked ? '#4ade80' : '#cbd5e1',
                  fontSize: '0.78rem',
                  fontWeight: isChecked ? 600 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {isChecked ? <Check size={14} strokeWidth={2.5} /> : <Zap size={13} color="#94a3b8" />}
                <span>{cfg.name}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
