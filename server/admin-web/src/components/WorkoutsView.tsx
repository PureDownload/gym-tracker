import React, { useState } from 'react';
import {
  Search,
  Dumbbell,
  Clock,
  ChevronDown,
  ChevronUp,
  Check,
  Calendar,
  Layers,
  FileText,
} from 'lucide-react';
import type { AdminWorkout, Pagination, AdminUser } from '../types';

interface WorkoutsViewProps {
  workouts: AdminWorkout[];
  users: AdminUser[];
  pagination: Pagination;
  onRefresh: () => void;
  onPageChange: (page: number) => void;
  onSearch: (userId: string, keyword: string, startDate: string, endDate: string) => void;
}

export const WorkoutsView: React.FC<WorkoutsViewProps> = ({
  workouts,
  users,
  pagination,
  onRefresh,
  onPageChange,
  onSearch,
}) => {
  const [selectedUserId, setSelectedUserId] = useState('');
  const [keyword, setKeyword] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [expandedWorkoutIds, setExpandedWorkoutIds] = useState<Set<string>>(new Set());

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(selectedUserId, keyword, startDate, endDate);
  };

  const toggleExpand = (id: string) => {
    setExpandedWorkoutIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const calculate1RM = (weight: number, reps: number) => {
    if (reps <= 0 || weight <= 0) return 0;
    if (reps === 1) return weight;
    return Math.round(weight * (1 + reps / 30) * 10) / 10;
  };

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Filter Bar */}
      <div className="card-elevated" style={{ padding: '18px 24px' }}>
        <form onSubmit={handleFilterSubmit} style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* User selector */}
          <select
            value={selectedUserId}
            onChange={(e) => {
              setSelectedUserId(e.target.value);
              onSearch(e.target.value, keyword, startDate, endDate);
            }}
            className="select-custom"
            style={{ minWidth: '160px' }}
          >
            <option value="">全部健身用户</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.username} ({u.workoutCount} 次)
              </option>
            ))}
          </select>

          {/* Keyword Search */}
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="搜训练标题 / 动作名 / 备注..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="input-text"
              style={{ paddingLeft: '34px', width: '240px' }}
            />
            <Search size={15} style={{ position: 'absolute', left: '11px', top: '12px', color: 'var(--text-dim)' }} />
          </div>

          {/* Date range */}
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="input-text"
            title="开始日期"
          />
          <span style={{ color: 'var(--text-dim)', fontSize: '13px' }}>至</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="input-text"
            title="结束日期"
          />

          <button type="submit" className="btn btn-secondary">
            检索
          </button>
          <button type="button" onClick={onRefresh} className="btn btn-secondary" title="刷新列表">
            刷新
          </button>
        </form>
      </div>

      {/* Workouts Feed & Expansion Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {workouts.length === 0 ? (
          <div className="card-elevated" style={{ padding: '50px', textAlign: 'center', color: 'var(--text-dim)' }}>
            没有找到符合条件的训练记录
          </div>
        ) : (
          workouts.map((w) => {
            const isExpanded = expandedWorkoutIds.has(w.id);
            return (
              <div
                key={w.id}
                className="card-elevated"
                style={{
                  padding: '20px 24px',
                  border: isExpanded ? '1px solid var(--border-active)' : '1px solid var(--border-subtle)',
                }}
              >
                {/* Header row */}
                <div
                  onClick={() => toggleExpand(w.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
                      background: 'rgba(34, 197, 94, 0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#22c55e',
                    }}>
                      <Dumbbell size={20} />
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#fff' }}>
                          {w.title || '力量训练日志'}
                        </h3>
                        <span style={{
                          fontSize: '11px',
                          padding: '1px 8px',
                          borderRadius: '4px',
                          background: 'rgba(255,255,255,0.06)',
                          color: '#e2e8f0',
                          fontWeight: 600,
                        }}>
                          👤 {w.username}
                        </span>
                      </div>

                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '14px',
                        fontSize: '12px',
                        color: 'var(--text-dim)',
                        marginTop: '4px',
                      }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Calendar size={13} /> {w.date}
                        </span>
                        {w.durationMinutes > 0 && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Clock size={13} /> 耗时 {w.durationMinutes} 分钟
                          </span>
                        )}
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Layers size={13} /> {w.exercisesCount} 个动作 · {w.totalSets} 组
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>本次总容量</div>
                      <div style={{
                        fontSize: '18px',
                        fontWeight: 800,
                        color: '#4ade80',
                        fontFamily: 'var(--font-display)',
                      }}>
                        {w.volumeKg.toLocaleString()} kg
                      </div>
                    </div>

                    <button
                      type="button"
                      className="btn btn-secondary btn-icon"
                      style={{ border: 'none', background: 'transparent' }}
                    >
                      {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                  </div>
                </div>

                {/* Notes (if any) */}
                {w.notes && (
                  <div style={{
                    marginTop: '12px',
                    fontSize: '12.5px',
                    color: 'var(--text-muted)',
                    background: 'rgba(255, 255, 255, 0.03)',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}>
                    <FileText size={13} color="var(--text-dim)" />
                    <span>备注: {w.notes}</span>
                  </div>
                )}

                {/* Expanded Exercises Detail View */}
                {isExpanded && (
                  <div style={{
                    marginTop: '18px',
                    paddingTop: '18px',
                    borderTop: '1px solid var(--border-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                  }}>
                    {w.exercises.length === 0 ? (
                      <div style={{ fontSize: '12.5px', color: 'var(--text-dim)' }}>无详细动作数据</div>
                    ) : (
                      w.exercises.map((ex, exIdx) => {
                        const exName = ex.name || ex.exerciseName || `动作 #${exIdx + 1}`;
                        const muscle = ex.muscle || ex.targetMuscle || '综合';
                        return (
                          <div
                            key={exIdx}
                            style={{
                              background: 'var(--bg-surface)',
                              borderRadius: 'var(--radius-md)',
                              padding: '14px 16px',
                              border: '1px solid rgba(255, 255, 255, 0.05)',
                            }}
                          >
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              marginBottom: '10px',
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{
                                  width: '20px',
                                  height: '20px',
                                  borderRadius: '4px',
                                  background: 'rgba(34, 197, 94, 0.15)',
                                  color: '#22c55e',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}>
                                  {exIdx + 1}
                                </span>
                                <span style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>
                                  {exName}
                                </span>
                                <span style={{
                                  fontSize: '10.5px',
                                  padding: '1px 6px',
                                  borderRadius: '3px',
                                  background: 'rgba(6, 182, 212, 0.12)',
                                  color: '#22d3ee',
                                }}>
                                  {muscle}
                                </span>
                              </div>
                              <span style={{ fontSize: '11.5px', color: 'var(--text-dim)' }}>
                                共 {(ex.sets || []).length} 组
                              </span>
                            </div>

                            {/* Sets Table */}
                            <div style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                              gap: '8px',
                            }}>
                              {(ex.sets || []).map((s, setIdx) => {
                                const weight = Number(s.weight) || 0;
                                const reps = Number(s.reps) || 0;
                                const set1RM = calculate1RM(weight, reps);
                                const isDone = s.completed !== false;
                                return (
                                  <div
                                    key={setIdx}
                                    style={{
                                      background: 'rgba(255, 255, 255, 0.03)',
                                      padding: '8px 10px',
                                      borderRadius: '6px',
                                      border: isDone ? '1px solid rgba(34, 197, 94, 0.2)' : '1px solid rgba(255, 255, 255, 0.05)',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: '2px',
                                    }}
                                  >
                                    <div style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      fontSize: '11px',
                                      color: 'var(--text-dim)',
                                    }}>
                                      <span>第 {setIdx + 1} 组</span>
                                      {isDone && <Check size={11} color="#22c55e" />}
                                    </div>
                                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>
                                      {weight} kg × {reps} 次
                                    </div>
                                    <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>
                                      1RM: ~{set1RM}kg
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          background: 'var(--bg-surface)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
          fontSize: '13px',
          color: 'var(--text-dim)',
        }}>
          <div>
            共 {pagination.total} 场训练，第 {pagination.page} / {pagination.totalPages} 页
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="btn btn-secondary"
              style={{ padding: '6px 14px' }}
            >
              上一页
            </button>
            <button
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="btn btn-secondary"
              style={{ padding: '6px 14px' }}
            >
              下一页
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
