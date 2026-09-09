import React, { useState } from 'react';
import { Trash2, ChevronDown, ChevronUp, Dumbbell, Activity, Copy, Check, Flame } from 'lucide-react';
import type { WorkoutSession } from '../types/workout';
import { analyticsService } from '../services/analytics';
import { MUSCLE_GROUP_LABELS } from '../data/presetExercises';

interface WorkoutHistoryProps {
  workouts: WorkoutSession[];
  onDeleteWorkout: (id: string) => void;
  onCopyWorkoutToLogger: (session: WorkoutSession) => void;
}

interface DateGroupedWorkouts {
  date: string;
  sessions: WorkoutSession[];
  totalVolume: number;
  totalSets: number;
  exercisesCount: number;
  totalCardioMinutes: number;
  totalCardioDistance: number;
}

export const WorkoutHistory: React.FC<WorkoutHistoryProps> = ({
  workouts,
  onDeleteWorkout,
  onCopyWorkoutToLogger,
}) => {
  const [expandedDateSet, setExpandedDateSet] = useState<Record<string, boolean>>({});
  const [copiedSessionId, setCopiedSessionId] = useState<string | null>(null);

  const toggleExpand = (date: string) => {
    setExpandedDateSet((prev) => ({
      ...prev,
      [date]: !prev[date],
    }));
  };

  // Group workouts by date (YYYY-MM-DD)
  const groupedByDate: DateGroupedWorkouts[] = React.useMemo(() => {
    const groups: Record<string, WorkoutSession[]> = {};
    for (const w of workouts) {
      const d = w.date;
      if (!groups[d]) {
        groups[d] = [];
      }
      groups[d].push(w);
    }

    const sortedDates = Object.keys(groups).sort((a, b) => b.localeCompare(a));

    return sortedDates.map((date) => {
      const sessions = groups[date];
      let totalVolume = 0;
      let totalSets = 0;
      let exercisesCount = 0;
      let totalCardioMinutes = 0;
      let totalCardioDistance = 0;

      for (const s of sessions) {
        exercisesCount += s.exercises.length;
        for (const ex of s.exercises) {
          totalSets += ex.sets.length;
          const isCardio = ex.category === 'cardio' || ex.isCardio;
          if (isCardio) {
            totalCardioMinutes += analyticsService.calculateCardioDuration(ex.sets);
            totalCardioDistance += analyticsService.calculateCardioDistance(ex.sets);
          } else {
            totalVolume += analyticsService.calculateTotalVolume(ex.sets);
          }
        }
      }

      return {
        date,
        sessions,
        totalVolume,
        totalSets,
        exercisesCount,
        totalCardioMinutes,
        totalCardioDistance: Math.round(totalCardioDistance * 10) / 10,
      };
    });
  }, [workouts]);

  const totalVolumeAll = workouts.reduce((total, w) => {
    return (
      total +
      w.exercises.reduce((exTotal, ex) => {
        const isCardio = ex.category === 'cardio' || ex.isCardio;
        return isCardio ? exTotal : exTotal + analyticsService.calculateTotalVolume(ex.sets);
      }, 0)
    );
  }, 0);

  const totalSetsAll = workouts.reduce((total, w) => {
    return total + w.exercises.reduce((exSets, ex) => exSets + ex.sets.length, 0);
  }, 0);

  const handleCopy = (e: React.MouseEvent, session: WorkoutSession) => {
    e.stopPropagation();
    onCopyWorkoutToLogger(session);
    setCopiedSessionId(session.id);
    setTimeout(() => setCopiedSessionId(null), 2000);
  };

  const getDayOfWeek = (dateStr: string) => {
    try {
      const day = new Date(dateStr).getDay();
      const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
      return days[day] || '';
    } catch {
      return '';
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Top Stats Overview */}
      <div
        className="card"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          textAlign: 'center',
          gap: '8px',
          padding: '14px 10px',
        }}
      >
        <div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>训练天数</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
            {groupedByDate.length} <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>天</span>
          </div>
        </div>

        <div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>累计做组/段</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-cyan)', marginTop: '2px' }}>
            {totalSetsAll} <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>组</span>
          </div>
        </div>

        <div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>推拉总负荷</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-primary)', marginTop: '2px' }}>
            {(totalVolumeAll / 1000).toFixed(1)} <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>吨</span>
          </div>
        </div>
      </div>

      {/* Date List */}
      {groupedByDate.length === 0 ? (
        <div
          className="card"
          style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}
        >
          <Dumbbell size={40} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
          <p>暂无训练历史，快去记录开启第一练吧！</p>
        </div>
      ) : (
        groupedByDate.map((dateGroup) => {
          const isExpanded = !!expandedDateSet[dateGroup.date];
          const dayOfWeek = getDayOfWeek(dateGroup.date);

          return (
            <div key={dateGroup.date} className="history-session-card">
              {/* Date Header Row */}
              <div
                className="history-session-header"
                onClick={() => toggleExpand(dateGroup.date)}
                style={{ padding: '12px 14px' }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '1.02rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                      {dateGroup.date}
                    </span>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        padding: '1px 6px',
                        borderRadius: '4px',
                        backgroundColor: 'var(--bg-input)',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {dayOfWeek}
                    </span>
                    {dateGroup.sessions.map((s) => (
                      <span
                        key={s.id}
                        style={{
                          fontSize: '0.72rem',
                          padding: '1px 7px',
                          borderRadius: '4px',
                          backgroundColor: 'rgba(16, 185, 129, 0.12)',
                          color: 'var(--accent-primary)',
                          fontWeight: 600,
                        }}
                      >
                        {s.title}
                      </span>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                    {dateGroup.totalVolume > 0 && (
                      <span className="session-stat-pill">
                        <Activity size={12} color="var(--accent-primary)" />
                        力量容量: {dateGroup.totalVolume.toLocaleString()} kg
                      </span>
                    )}
                    {dateGroup.totalCardioMinutes > 0 && (
                      <span className="session-stat-pill" style={{ color: 'var(--muscle-cardio)' }}>
                        <Flame size={12} />
                        有氧: {dateGroup.totalCardioMinutes}分钟 {dateGroup.totalCardioDistance > 0 ? `· ${dateGroup.totalCardioDistance}km` : ''}
                      </span>
                    )}
                    <span className="session-stat-pill">
                      {dateGroup.exercisesCount} 个动作 · {dateGroup.totalSets} 组
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {dateGroup.sessions.length > 0 && (
                    <button
                      className="pill-btn"
                      style={{
                        padding: '5px 9px',
                        fontSize: '0.72rem',
                        color: 'var(--accent-cyan)',
                        borderColor: 'rgba(6, 182, 212, 0.4)',
                        backgroundColor: 'rgba(6, 182, 212, 0.08)',
                      }}
                      onClick={(e) => handleCopy(e, dateGroup.sessions[0])}
                      title="一键将该日训练参数复制到记录界面"
                    >
                      {copiedSessionId === dateGroup.sessions[0].id ? (
                        <>
                          <Check size={12} color="var(--accent-primary)" />
                          <span>已复制</span>
                        </>
                      ) : (
                        <>
                          <Copy size={12} />
                          <span>一键复用</span>
                        </>
                      )}
                    </button>
                  )}

                  <div style={{ color: 'var(--text-muted)', marginLeft: '4px' }}>
                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div style={{ padding: '0 14px 14px', borderTop: '1px solid var(--border-subtle)' }}>
                  {dateGroup.sessions.map((session) => (
                    <div
                      key={session.id}
                      style={{
                        marginTop: '12px',
                        background: 'var(--bg-surface)',
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
                          marginBottom: '10px',
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '0.98rem', color: 'var(--text-primary)' }}>
                            {session.title}
                          </div>
                          {session.notes && (
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                              💬 {session.notes}
                            </div>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            className="step-chip"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              color: 'var(--accent-cyan)',
                              borderColor: 'var(--accent-cyan)',
                            }}
                            onClick={(e) => handleCopy(e, session)}
                            title="把此条训练参数复制到录入页开练"
                          >
                            <Copy size={12} />
                            复制到今天
                          </button>

                          <button
                            className="icon-btn"
                            style={{ width: '28px', height: '28px', color: 'var(--accent-danger)' }}
                            onClick={() => {
                              if (window.confirm(`确定删除 ${session.title} 的记录吗？`)) {
                                onDeleteWorkout(session.id);
                              }
                            }}
                            title="删除该条记录"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      {/* Exercises in Session */}
                      {session.exercises.map((ex) => {
                        const catInfo = MUSCLE_GROUP_LABELS[ex.category] || { label: '其他', icon: '⚡' };
                        const isCardio = ex.category === 'cardio' || ex.isCardio;
                        const exVolume = analyticsService.calculateTotalVolume(ex.sets);
                        const exDuration = analyticsService.calculateCardioDuration(ex.sets);
                        const exDist = analyticsService.calculateCardioDistance(ex.sets);

                        return (
                          <div
                            key={ex.id}
                            style={{
                              marginTop: '8px',
                              background: 'var(--bg-input)',
                              borderRadius: '8px',
                              padding: '8px 10px',
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                marginBottom: '6px',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span>{catInfo.icon}</span>
                                <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>
                                  {ex.exerciseName}
                                </span>
                              </div>
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                {isCardio ? `累计 ${exDuration}分钟${exDist > 0 ? ` · ${exDist}km` : ''}` : `容量: ${exVolume} kg`}
                              </span>
                            </div>

                            {/* Sets Badges */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                              {ex.sets.map((set, idx) => {
                                if (isCardio) {
                                  return (
                                    <div
                                      key={set.id || idx}
                                      style={{
                                        background: 'var(--bg-card)',
                                        border: '1px solid rgba(249, 115, 22, 0.3)',
                                        borderRadius: '6px',
                                        padding: '4px 8px',
                                        fontSize: '0.74rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '5px',
                                      }}
                                    >
                                      <span style={{ color: 'var(--muscle-cardio)', fontWeight: 700 }}>
                                        #{set.setNumber || idx + 1}
                                      </span>
                                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                                        {set.durationMinutes || 0} 分钟
                                      </span>
                                      {set.distanceKm ? (
                                        <span style={{ color: 'var(--text-secondary)' }}>
                                          · {set.distanceKm} km
                                        </span>
                                      ) : null}
                                      {set.caloriesKcal ? (
                                        <span style={{ color: 'var(--accent-warning)', fontSize: '0.68rem' }}>
                                          · {set.caloriesKcal} kcal
                                        </span>
                                      ) : null}
                                    </div>
                                  );
                                } else {
                                  const rm = analyticsService.calculate1RM(set.weightKg, set.reps);
                                  return (
                                    <div
                                      key={set.id || idx}
                                      style={{
                                        background: 'var(--bg-card)',
                                        border: '1px solid var(--border-subtle)',
                                        borderRadius: '6px',
                                        padding: '3px 7px',
                                        fontSize: '0.74rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                      }}
                                    >
                                      <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>
                                        #{set.setNumber || idx + 1}
                                      </span>
                                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                                        {set.weightKg}kg × {set.reps}次
                                      </span>
                                      <span style={{ fontSize: '0.65rem', color: 'var(--accent-cyan)' }}>
                                        (1RM {rm}k)
                                      </span>
                                    </div>
                                  );
                                }
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
};
