import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Flame, Calendar, Activity, Copy, Check, X, Dumbbell } from 'lucide-react';
import type { WorkoutSession } from '../types/workout';
import { analyticsService } from '../services/analytics';
import { MUSCLE_GROUP_LABELS } from '../data/presetExercises';

interface TrainingCalendarProps {
  workouts: WorkoutSession[];
  onCopyWorkoutToLogger: (session: WorkoutSession) => void;
}

interface MonthGroup {
  monthKey: string; // YYYY-MM
  year: number;
  month: number; // 1-12
  isCurrentMonth: boolean;
  workouts: WorkoutSession[];
  trainedDaysCount: number;
  totalVolume: number;
  totalSets: number;
}

export const TrainingCalendar: React.FC<TrainingCalendarProps> = ({
  workouts,
  onCopyWorkoutToLogger,
}) => {
  const today = new Date();
  const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const todayStr = today.toISOString().split('T')[0];

  // Month collapse state: current month is expanded by default, others collapsed by default!
  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({
    [currentMonthKey]: true,
  });

  // Selected date to view detailed modal
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Group workouts by Month (YYYY-MM)
  const monthGroups: MonthGroup[] = React.useMemo(() => {
    const map: Record<string, WorkoutSession[]> = {};

    // Ensure current month is always present even if empty
    map[currentMonthKey] = [];

    for (const w of workouts) {
      const monthKey = w.date.slice(0, 7); // 'YYYY-MM'
      if (!map[monthKey]) {
        map[monthKey] = [];
      }
      map[monthKey].push(w);
    }

    // Sort months descending (e.g. 2026-09, 2026-08, ...)
    const sortedKeys = Object.keys(map).sort((a, b) => b.localeCompare(a));

    return sortedKeys.map((mKey) => {
      const [yStr, mStr] = mKey.split('-');
      const year = parseInt(yStr, 10);
      const month = parseInt(mStr, 10);
      const list = map[mKey];

      // Unique trained days
      const uniqueDays = new Set(list.map((w) => w.date));
      let totalVolume = 0;
      let totalSets = 0;

      for (const s of list) {
        for (const ex of s.exercises) {
          totalSets += ex.sets.length;
          totalVolume += analyticsService.calculateTotalVolume(ex.sets);
        }
      }

      return {
        monthKey: mKey,
        year,
        month,
        isCurrentMonth: mKey === currentMonthKey,
        workouts: list,
        trainedDaysCount: uniqueDays.size,
        totalVolume,
        totalSets,
      };
    });
  }, [workouts, currentMonthKey]);

  const toggleMonth = (monthKey: string) => {
    setExpandedMonths((prev) => ({
      ...prev,
      [monthKey]: !prev[monthKey],
    }));
  };

  // Helper to generate calendar matrix for a given year & month (1-12)
  const getCalendarMatrix = (year: number, month: number) => {
    const firstDayIndex = new Date(year, month - 1, 1).getDay(); // 0 is Sunday
    const daysInMonth = new Date(year, month, 0).getDate();

    const matrix: (number | null)[] = [];
    // Leading blanks
    for (let i = 0; i < firstDayIndex; i++) {
      matrix.push(null);
    }
    // Days
    for (let d = 1; d <= daysInMonth; d++) {
      matrix.push(d);
    }
    return matrix;
  };

  // Workouts on selected date
  const selectedDateWorkouts = selectedDate
    ? workouts.filter((w) => w.date === selectedDate)
    : [];

  const handleCopy = (session: WorkoutSession) => {
    onCopyWorkoutToLogger(session);
    setCopiedId(session.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="animate-fade-in">
      {/* Month Sections List */}
      {monthGroups.map((mg) => {
        const isExpanded = !!expandedMonths[mg.monthKey];
        const matrix = getCalendarMatrix(mg.year, mg.month);
        const daysInMonth = new Date(mg.year, mg.month, 0).getDate();
        const restDays = Math.max(0, daysInMonth - mg.trainedDaysCount);

        // Map for fast date lookup in this month: dateStr -> WorkoutSession[]
        const dayWorkoutsMap: Record<string, WorkoutSession[]> = {};
        for (const w of mg.workouts) {
          if (!dayWorkoutsMap[w.date]) {
            dayWorkoutsMap[w.date] = [];
          }
          dayWorkoutsMap[w.date].push(w);
        }

        return (
          <div key={mg.monthKey} className="card" style={{ padding: '0', overflow: 'hidden', marginBottom: '14px' }}>
            {/* Month Header Banner */}
            <div
              onClick={() => toggleMonth(mg.monthKey)}
              style={{
                padding: '14px 16px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: mg.isCurrentMonth
                  ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(6, 182, 212, 0.12))'
                  : 'var(--bg-card)',
                borderBottom: isExpanded ? '1px solid var(--border-subtle)' : 'none',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {mg.year}年 {mg.month}月
                  </span>
                  {mg.isCurrentMonth && (
                    <span
                      style={{
                        fontSize: '0.68rem',
                        padding: '1px 6px',
                        borderRadius: '4px',
                        backgroundColor: 'var(--accent-primary)',
                        color: '#090d16',
                        fontWeight: 800,
                      }}
                    >
                      本月 (默认展开)
                    </span>
                  )}
                </div>

                {/* Summary Pill row */}
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                  <span className="session-stat-pill" style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>
                    <Flame size={12} />
                    训练 {mg.trainedDaysCount} 天
                  </span>
                  <span className="session-stat-pill">
                    休息 {restDays} 天
                  </span>
                  <span className="session-stat-pill">
                    <Activity size={12} color="var(--accent-cyan)" />
                    {(mg.totalVolume / 1000).toFixed(1)} 吨
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}>
                {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </div>
            </div>

            {/* Expanded Calendar Grid */}
            {isExpanded && (
              <div style={{ padding: '14px' }}>
                {/* Weekday Labels */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(7, 1fr)',
                    textAlign: 'center',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                    marginBottom: '8px',
                  }}
                >
                  <span style={{ color: 'var(--accent-danger)' }}>日</span>
                  <span>一</span>
                  <span>二</span>
                  <span>三</span>
                  <span>四</span>
                  <span>五</span>
                  <span style={{ color: 'var(--accent-primary)' }}>六</span>
                </div>

                {/* Days Grid */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(7, 1fr)',
                    gap: '6px',
                  }}
                >
                  {matrix.map((dayNum, idx) => {
                    if (dayNum === null) {
                      return <div key={`empty_${idx}`} style={{ height: '44px' }} />;
                    }

                    const dateStr = `${mg.year}-${String(mg.month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                    const hasTrained = !!dayWorkoutsMap[dateStr];
                    const isToday = dateStr === todayStr;
                    const daySessions = dayWorkoutsMap[dateStr] || [];

                    return (
                      <div
                        key={dateStr}
                        onClick={() => setSelectedDate(dateStr)}
                        style={{
                          height: '46px',
                          borderRadius: '8px',
                          background: hasTrained
                            ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.25), rgba(6, 182, 212, 0.15))'
                            : 'var(--bg-input)',
                          border: isToday
                            ? '2px solid var(--accent-cyan)'
                            : hasTrained
                            ? '1px solid var(--accent-primary)'
                            : '1px solid var(--border-subtle)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          position: 'relative',
                          transition: 'all 0.15s ease',
                          boxShadow: hasTrained ? '0 0 8px rgba(16, 185, 129, 0.15)' : 'none',
                        }}
                      >
                        <span
                          style={{
                            fontSize: '0.82rem',
                            fontWeight: isToday || hasTrained ? 800 : 500,
                            color: isToday
                              ? 'var(--accent-cyan)'
                              : hasTrained
                              ? '#ffffff'
                              : 'var(--text-secondary)',
                          }}
                        >
                          {dayNum}
                        </span>

                        {hasTrained && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '2px', marginTop: '1px' }}>
                            <div
                              style={{
                                width: '5px',
                                height: '5px',
                                borderRadius: '50%',
                                backgroundColor: 'var(--accent-primary)',
                              }}
                            />
                            {daySessions.length > 1 && (
                              <span style={{ fontSize: '0.58rem', color: 'var(--accent-primary)' }}>
                                {daySessions.length}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: '12px',
                    paddingTop: '10px',
                    borderTop: '1px solid var(--border-subtle)',
                    fontSize: '0.72rem',
                    color: 'var(--text-muted)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: 'var(--accent-primary)' }} />
                      训练日
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: 'var(--bg-input)' }} />
                      休息日
                    </span>
                  </div>
                  <span>点击任意日期查看训练详情</span>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Date Inspection Modal */}
      {selectedDate && (
        <div className="modal-overlay" onClick={() => setSelectedDate(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={18} color="var(--accent-primary)" />
                <h3 className="modal-title">{selectedDate} 训练详情</h3>
              </div>
              <button
                className="icon-btn"
                style={{ width: '30px', height: '30px' }}
                onClick={() => setSelectedDate(null)}
              >
                <X size={16} />
              </button>
            </div>

            <div className="modal-body">
              {selectedDateWorkouts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-secondary)' }}>
                  <Dumbbell size={36} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
                  <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>该日为休息日 (Rest Day)</div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    适当休息能让肌纤维超量恢复与生长。如需补录，可在“记训练”中将日期切换为此日并保存。
                  </p>
                </div>
              ) : (
                selectedDateWorkouts.map((session) => {
                  const sVol = session.exercises.reduce(
                    (acc, ex) => acc + analyticsService.calculateTotalVolume(ex.sets),
                    0
                  );
                  return (
                    <div
                      key={session.id}
                      style={{
                        marginBottom: '12px',
                        background: 'var(--bg-card)',
                        borderRadius: '10px',
                        padding: '12px',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '8px',
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>
                            {session.title}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            单次总容量: {sVol.toLocaleString()} kg
                          </div>
                        </div>

                        <button
                          className="btn-secondary"
                          style={{
                            width: 'auto',
                            padding: '6px 10px',
                            fontSize: '0.74rem',
                            color: 'var(--accent-cyan)',
                          }}
                          onClick={() => handleCopy(session)}
                          title="一键把该日参数复制到记录界面"
                        >
                          {copiedId === session.id ? (
                            <>
                              <Check size={13} color="var(--accent-primary)" />
                              <span>已复制到记录</span>
                            </>
                          ) : (
                            <>
                              <Copy size={13} />
                              <span>复制到今天练</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Exercises in Session */}
                      {session.exercises.map((ex) => {
                        const catInfo = MUSCLE_GROUP_LABELS[ex.category] || { label: '其他', icon: '⚡' };
                        return (
                          <div
                            key={ex.id}
                            style={{
                              marginTop: '8px',
                              background: 'var(--bg-surface)',
                              padding: '8px 10px',
                              borderRadius: '8px',
                            }}
                          >
                            <div style={{ fontSize: '0.86rem', fontWeight: 700, marginBottom: '4px' }}>
                              <span>{catInfo.icon} </span>
                              {ex.exerciseName}
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                              {ex.sets.map((s, idx) => {
                                const isCardio = ex.category === 'cardio' || ex.isCardio;
                                return (
                                  <span
                                    key={s.id || idx}
                                    style={{
                                      fontSize: '0.72rem',
                                      background: 'var(--bg-input)',
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                      color: isCardio ? 'var(--muscle-cardio)' : 'var(--text-secondary)',
                                    }}
                                  >
                                    #{s.setNumber}: {isCardio ? `${s.durationMinutes || 0}分 ${s.distanceKm ? s.distanceKm + 'km' : ''} ${s.caloriesKcal ? s.caloriesKcal + 'kcal' : ''}` : `${s.weightKg}kg×${s.reps}`}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
