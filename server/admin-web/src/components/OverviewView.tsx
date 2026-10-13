import React from 'react';
import {
  Weight,
  Users,
  CalendarCheck,
  Zap,
  Trophy,
  Flame,
  Dumbbell,
  TrendingUp,
} from 'lucide-react';
import { StatCard } from './StatCard';
import type { OverviewData } from '../types';

interface OverviewViewProps {
  data: OverviewData | null;
  loading: boolean;
  onNavigateToUsers: () => void;
  onNavigateToWorkouts: () => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  data,
  loading,
  onNavigateToUsers,
  onNavigateToWorkouts,
}) => {
  if (loading && !data) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: '18px', fontWeight: 600 }}>正在加载全站健身数据看板...</div>
      </div>
    );
  }

  if (!data) return null;

  const { kpis, trend30Days, muscleDistribution, recentWorkouts, strengthRecords } = data;

  // Compute max value for 30-day SVG chart
  const maxTrendCount = Math.max(...trend30Days.map(d => d.count), 1);
  const chartHeight = 160;
  const chartWidth = 720;
  const points = trend30Days.map((d, index) => {
    const x = (index / (trend30Days.length - 1)) * chartWidth;
    const y = chartHeight - (d.count / maxTrendCount) * (chartHeight - 30) - 15;
    return { x, y, ...d };
  });

  const svgPath = points.reduce((acc, curr, idx) => {
    return idx === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`;
  }, '');

  const areaPath = `${svgPath} L ${chartWidth} ${chartHeight} L 0 ${chartHeight} Z`;

  // Total muscle count for percentages
  const totalMuscleCount = muscleDistribution.reduce((acc, m) => acc + m.value, 0) || 1;

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* 1. Top KPI Stat Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '20px',
      }}>
        <StatCard
          title="全员累计举铁负荷"
          value={`${kpis.totalTonnage} 吨`}
          subValue={`约 ${(kpis.totalVolumeKg).toLocaleString()} kg`}
          trendText="硬核力量"
          icon={<Weight size={22} color="#22c55e" />}
          iconBg="rgba(34, 197, 94, 0.15)"
          glowColor="rgba(34, 197, 94, 0.25)"
        />

        <StatCard
          title="健身账号规模"
          value={`${kpis.totalUsers} 位`}
          subValue={`近7日活跃 ${kpis.activeUsers7d} 人`}
          trendText={kpis.totalUsers > 0 ? `${Math.round((kpis.activeUsers7d / kpis.totalUsers) * 100)}% 活跃率` : '暂无'}
          icon={<Users size={22} color="#06b6d4" />}
          iconBg="rgba(6, 182, 212, 0.15)"
          glowColor="rgba(6, 182, 212, 0.25)"
          onClick={onNavigateToUsers}
        />

        <StatCard
          title="总训练打卡场次"
          value={`${kpis.totalWorkouts} 场`}
          subValue={`包含自建 ${kpis.totalCustomExercises} 动作`}
          trendText="持续积累"
          icon={<CalendarCheck size={22} color="#a855f7" />}
          iconBg="rgba(168, 85, 247, 0.15)"
          glowColor="rgba(168, 85, 247, 0.25)"
          onClick={onNavigateToWorkouts}
        />

        <StatCard
          title="今日打卡完成"
          value={`${kpis.todayWorkoutsCount} 场`}
          subValue={`储备模板 ${kpis.totalTemplates} 个`}
          trendText={kpis.todayWorkoutsCount > 0 ? "🔥 积极开练" : "等待今日打卡"}
          trendPositive={kpis.todayWorkoutsCount > 0}
          icon={<Zap size={22} color="#f59e0b" />}
          iconBg="rgba(245, 158, 11, 0.15)"
          glowColor="rgba(245, 158, 11, 0.25)"
        />
      </div>

      {/* 2. Strength Hall of Fame (三大项全站极限 1RM 纪录榜) */}
      <div className="card-elevated" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(245, 158, 11, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Trophy size={18} color="#f59e0b" />
            </div>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#fff' }}>
                三大项极限力量英雄榜 (Strength Hall of Fame)
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                基于 Epley 公式科学折算全站最高的单次极限 1RM 纪录
              </p>
            </div>
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '16px',
        }}>
          {strengthRecords.map((item, idx) => {
            const colors = [
              { border: '#ef4444', text: '#f87171', bg: 'rgba(239, 68, 68, 0.08)', name: '卧推 Bench Press' },
              { border: '#22c55e', text: '#4ade80', bg: 'rgba(34, 197, 94, 0.08)', name: '深蹲 Squat' },
              { border: '#a855f7', text: '#c084fc', bg: 'rgba(168, 85, 247, 0.08)', name: '硬拉 Deadlift' },
            ][idx] || { border: '#06b6d4', text: '#22d3ee', bg: 'rgba(6, 182, 212, 0.08)', name: item.exercise };

            return (
              <div
                key={item.exercise}
                style={{
                  background: 'var(--bg-surface)',
                  borderRadius: 'var(--radius-md)',
                  padding: '18px 20px',
                  border: `1px solid rgba(255, 255, 255, 0.06)`,
                  borderLeft: `4px solid ${colors.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: colors.text }}>
                    {colors.name}
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: 800, fontFamily: 'var(--font-display)', color: '#fff', margin: '4px 0' }}>
                    {item.max1RM > 0 ? `${item.max1RM} kg` : '暂无数据'}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                    {item.max1RM > 0 ? `做组: ${item.weight}kg × ${item.reps}次 (${item.date})` : '尚无记录'}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>保持者</div>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: 700,
                    color: '#fff',
                    background: colors.bg,
                    padding: '4px 10px',
                    borderRadius: '6px',
                    marginTop: '4px',
                    border: `1px solid ${colors.border}40`,
                  }}>
                    {item.username}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Middle Section: 30-Day Trend Chart & Muscle Group Distribution */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
        gap: '20px',
      }}>
        {/* Trend Area Chart */}
        <div className="card-elevated" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div>
              <h2 style={{ fontSize: '15px', fontWeight: 800, color: '#fff' }}>
                近 30 天打卡活跃度走势
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                每日全员完成训练场次与训练强度统计
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#22c55e', fontSize: '12px', fontWeight: 700 }}>
              <TrendingUp size={15} /> 实时统计
            </div>
          </div>

          <div style={{ width: '100%', height: `${chartHeight}px`, position: 'relative', marginTop: 'auto' }}>
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              preserveAspectRatio="none"
              style={{ width: '100%', height: '100%', overflow: 'visible' }}
            >
              <defs>
                <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              {/* Background horizontal grid lines */}
              {[0, 0.33, 0.66, 1].map((ratio) => (
                <line
                  key={ratio}
                  x1="0"
                  y1={chartHeight * ratio}
                  x2={chartWidth}
                  y2={chartHeight * ratio}
                  stroke="rgba(255,255,255,0.05)"
                  strokeDasharray="4 4"
                />
              ))}
              {/* Area gradient */}
              <path d={areaPath} fill="url(#trendGradient)" />
              {/* Stroke line */}
              <path d={svgPath} fill="none" stroke="#22c55e" strokeWidth="2.6" strokeLinecap="round" />
            </svg>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontSize: '11px', color: 'var(--text-dim)' }}>
            <span>30 天前 ({trend30Days[0]?.date})</span>
            <span>今日 ({trend30Days[trend30Days.length - 1]?.date})</span>
          </div>
        </div>

        {/* Muscle Group Distribution */}
        <div className="card-elevated" style={{ padding: '24px' }}>
          <div style={{ marginBottom: '16px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 800, color: '#fff' }}>
              肌群训练部位偏好分布
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
              基于全员训练日志解析的各肌群受训频次
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {muscleDistribution.slice(0, 6).map((m) => {
              const pct = Math.round((m.value / totalMuscleCount) * 100);
              return (
                <div key={m.name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', marginBottom: '5px' }}>
                    <span style={{ fontWeight: 600, color: '#e2e8f0' }}>{m.name}</span>
                    <span style={{ color: 'var(--text-dim)', fontWeight: 700 }}>
                      {m.value} 次 ({pct}%)
                    </span>
                  </div>
                  <div style={{
                    height: '8px',
                    borderRadius: '4px',
                    background: 'rgba(255, 255, 255, 0.06)',
                    overflow: 'hidden',
                  }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${pct}%`,
                        borderRadius: '4px',
                        background: 'linear-gradient(90deg, #22c55e, #06b6d4)',
                        transition: 'width 0.4s ease',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. Live Workout Feed (最新全员训练打卡流) */}
      <div className="card-elevated" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(34, 197, 94, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Flame size={18} color="#22c55e" />
            </div>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#fff' }}>
                全员最新打卡动态 (Live Feed)
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                实时同步的训练打卡流水，点击可跳转全员训练透视
              </p>
            </div>
          </div>

          <button onClick={onNavigateToWorkouts} className="btn btn-secondary" style={{ fontSize: '12.5px', padding: '6px 14px' }}>
            查看全部训练流水 →
          </button>
        </div>

        {recentWorkouts.length === 0 ? (
          <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-dim)' }}>
            暂无训练日志，等待手机客户端进行首次同步
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {recentWorkouts.map((w) => (
              <div
                key={w.id}
                style={{
                  background: 'var(--bg-surface)',
                  borderRadius: 'var(--radius-md)',
                  padding: '14px 18px',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'border-color 0.18s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#22c55e',
                  }}>
                    <Dumbbell size={18} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>
                        {w.title || '力量训练'}
                      </span>
                      <span style={{
                        fontSize: '11px',
                        padding: '1px 7px',
                        borderRadius: '4px',
                        background: 'rgba(255,255,255,0.06)',
                        color: 'var(--text-muted)',
                        fontWeight: 600,
                      }}>
                        {w.username}
                      </span>
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-dim)', marginTop: '2px', display: 'flex', gap: '12px' }}>
                      <span>📅 {w.date}</span>
                      {w.durationMinutes > 0 && <span>⏱️ 耗时 {w.durationMinutes} 分钟</span>}
                      <span>🎯 动作 {w.exerciseCount} 个</span>
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>单次总负荷</div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#4ade80', fontFamily: 'var(--font-display)' }}>
                    {w.volumeKg.toLocaleString()} kg
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
