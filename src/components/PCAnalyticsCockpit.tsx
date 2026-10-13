import React, { useState, useMemo } from 'react';
import {
  Weight,
  Flame,
  Calendar,
  Trophy,
  Activity,
  BatteryCharging,
  TrendingUp,
  BarChart2,
  Scale,
} from 'lucide-react';
import type { WorkoutSession, Exercise, BodyMetricEntry, MuscleGroup } from '../types/workout';
import { PRESET_EXERCISES, MUSCLE_GROUP_LABELS } from '../data/presetExercises';
import { analyticsService, type HeatmapDay } from '../services/analytics';
import { evaluateStrengthProfile } from '../services/strengthStandards';
import { storageService } from '../services/storage';
import '../styles/pc-analytics.css';

interface PCAnalyticsCockpitProps {
  workouts: WorkoutSession[];
  customExercises?: Exercise[];
  bodyMetrics?: BodyMetricEntry[];
  onOpenBodyMetricsModal?: () => void;
}

type StrengthMetric = 'estimated1RM' | 'maxWeight' | 'totalVolume';

export const PCAnalyticsCockpit: React.FC<PCAnalyticsCockpitProps> = ({
  workouts,
  customExercises = [],
  bodyMetrics = [],
  onOpenBodyMetricsModal,
}) => {
  const allExercises = useMemo(
    () => [...PRESET_EXERCISES, ...customExercises],
    [customExercises]
  );

  const [metricMode, setMetricMode] = useState<StrengthMetric>('estimated1RM');
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number; date: string; value: number } | null>(null);
  const [hoveredHeatmapDay, setHoveredHeatmapDay] = useState<HeatmapDay | null>(null);

  // 用户体测和力量基准
  const userProfile = useMemo(() => storageService.getUserProfile(), []);
  const latestMetric = useMemo(() => bodyMetrics.find((m) => m.weightKg != null), [bodyMetrics]);
  const currentWeight = latestMetric?.weightKg || userProfile.bodyWeightKg || 70;
  const currentGender = userProfile.gender || 'male';

  const strengthProfile = useMemo(() => {
    return evaluateStrengthProfile(workouts, currentWeight, currentGender);
  }, [workouts, currentWeight, currentGender]);

  // 1. KPI 统计计算
  const kpis = useMemo(() => {
    let totalVolKg = 0;
    let totalMinutes = 0;
    let totalCompletedSets = 0;

    workouts.forEach((w) => {
      totalMinutes += w.durationMinutes || 0;
      w.exercises.forEach((e) => {
        (e.sets || []).forEach((s) => {
          if (s.isCompleted) {
            totalCompletedSets += 1;
            totalVolKg += (s.weightKg || 0) * (s.reps || 0);
          }
        });
      });
    });

    const tonnage = Math.round((totalVolKg / 1000) * 10) / 10;
    return {
      totalVolKg: Math.round(totalVolKg),
      tonnage,
      totalMinutes,
      totalHours: (totalMinutes / 60).toFixed(1),
      totalWorkouts: workouts.length,
      totalCompletedSets,
    };
  }, [workouts]);

  // 2. 肌肉恢复状态计算
  const recoveryData = useMemo(() => {
    return analyticsService.getMuscleRecoveryStatus(workouts);
  }, [workouts]);

  const readyMusclesCount = useMemo(() => {
    return recoveryData.recoveryList.filter((r) => r.status === 'ready').length;
  }, [recoveryData]);

  // 3. 周度有效组数
  const weeklySetsData = useMemo(() => {
    return analyticsService.getWeeklyEffectiveSets(workouts);
  }, [workouts]);

  // 4. 单动作历史与超负荷折线
  const exercisesWithHistory = useMemo(() => {
    return allExercises.filter((ex) =>
      workouts.some((w) => w.exercises.some((e) => e.exerciseId === ex.id))
    );
  }, [allExercises, workouts]);

  const [selectedExerciseId, setSelectedExerciseId] = useState<string>(() => {
    return exercisesWithHistory.length > 0 ? exercisesWithHistory[0].id : PRESET_EXERCISES[0].id;
  });

  const exerciseHistory = useMemo(() => {
    return analyticsService.getExerciseHistory(selectedExerciseId, workouts);
  }, [selectedExerciseId, workouts]);

  // 5. 16周训练一致性热力矩阵
  const heatmapData = useMemo(() => {
    return analyticsService.getConsistencyHeatmap(workouts, 16);
  }, [workouts]);

  // 绘制单动作 SVG 曲线数据
  const chartData = useMemo(() => {
    if (exerciseHistory.length === 0) return null;

    const values = exerciseHistory.map((p) => {
      if (metricMode === 'estimated1RM') return p.estimated1RM;
      if (metricMode === 'maxWeight') return p.maxWeight;
      return p.totalVolume;
    });

    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const valRange = Math.max(maxVal - minVal, 5);

    const width = 640;
    const height = 180;
    const padding = { top: 20, right: 30, bottom: 30, left: 40 };
    const innerW = width - padding.left - padding.right;
    const innerH = height - padding.top - padding.bottom;

    const points = exerciseHistory.map((p, idx) => {
      const val =
        metricMode === 'estimated1RM'
          ? p.estimated1RM
          : metricMode === 'maxWeight'
          ? p.maxWeight
          : p.totalVolume;
      const x =
        exerciseHistory.length === 1
          ? padding.left + innerW / 2
          : padding.left + (idx / (exerciseHistory.length - 1)) * innerW;
      const y = padding.top + innerH - ((val - minVal) / valRange) * innerH;
      return { x, y, date: p.date, val };
    });

    const pathD = points.reduce((acc, curr, idx) => {
      return idx === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`;
    }, '');

    const areaD =
      points.length > 1
        ? `${pathD} L ${points[points.length - 1].x} ${height - padding.bottom} L ${points[0].x} ${height - padding.bottom} Z`
        : '';

    return { points, pathD, areaD, minVal, maxVal, width, height };
  }, [exerciseHistory, metricMode]);

  return (
    <div className="pc-cockpit-container">
      {/* 1. 顶部四大核心 KPI 数据大盘 */}
      <section className="pc-kpi-grid">
        <div className="pc-kpi-card" style={{ '--kpi-glow': '#22c55e' } as React.CSSProperties}>
          <div className="pc-kpi-header">
            <span className="pc-kpi-title">累计举铁总负荷</span>
            <div className="pc-kpi-icon-wrap" style={{ color: '#22c55e' }}>
              <Weight size={18} />
            </div>
          </div>
          <div className="pc-kpi-val">
            {kpis.tonnage} <span className="pc-kpi-unit">吨 (T)</span>
          </div>
          <div className="pc-kpi-sub">
            <span>总计 {kpis.totalVolKg.toLocaleString()} kg 容量</span>
          </div>
        </div>

        <div className="pc-kpi-card" style={{ '--kpi-glow': '#06b6d4' } as React.CSSProperties}>
          <div className="pc-kpi-header">
            <span className="pc-kpi-title">训练场次与时长</span>
            <div className="pc-kpi-icon-wrap" style={{ color: '#06b6d4' }}>
              <Calendar size={18} />
            </div>
          </div>
          <div className="pc-kpi-val">
            {kpis.totalWorkouts} <span className="pc-kpi-unit">场</span>
          </div>
          <div className="pc-kpi-sub">
            <span>
              累计举铁 {kpis.totalHours} 小时 · {kpis.totalCompletedSets} 组打卡
            </span>
          </div>
        </div>

        <div className="pc-kpi-card" style={{ '--kpi-glow': '#a855f7' } as React.CSSProperties}>
          <div className="pc-kpi-header">
            <span className="pc-kpi-title">肌群超量恢复就绪度</span>
            <div className="pc-kpi-icon-wrap" style={{ color: '#a855f7' }}>
              <BatteryCharging size={18} />
            </div>
          </div>
          <div className="pc-kpi-val">
            {recoveryData.overallReadiness}% <span className="pc-kpi-unit">就绪</span>
          </div>
          <div className="pc-kpi-sub">
            <span>
              {readyMusclesCount} / {recoveryData.recoveryList.length} 肌群就绪 · {recoveryData.recommendationAdvice || '适度训练'}
            </span>
          </div>
        </div>

        <div className="pc-kpi-card" style={{ '--kpi-glow': '#f59e0b' } as React.CSSProperties}>
          <div className="pc-kpi-header">
            <span className="pc-kpi-title">力量基准总评</span>
            <div className="pc-kpi-icon-wrap" style={{ color: '#f59e0b' }}>
              <Trophy size={18} />
            </div>
          </div>
          <div className="pc-kpi-val">
            <span style={{ fontSize: '1.4rem' }}>{strengthProfile?.overallRankLabel || '新手入门'}</span>
          </div>
          <div className="pc-kpi-sub">
            <span>
              三大项 1RM 极限和: {strengthProfile?.totalBigThree1RMKg || 0} kg
            </span>
          </div>
        </div>
      </section>

      {/* 2. 中部核心分析区：肌肉恢复与周有效组数 (左) + 单动作超负荷折线 (右) */}
      <section className="pc-two-cols">
        {/* 左栏：肌群恢复状态与周度负荷 */}
        <div className="pc-card">
          <div className="pc-card-header">
            <div className="pc-card-title">
              <Activity size={20} color="#22c55e" />
              <span>肌肉恢复与超补偿状态监测</span>
            </div>
            <span className="pc-card-badge">基于 48~72h 科学恢复曲线</span>
          </div>

          {/* 核心肌群状态胶囊 */}
          <div className="pc-muscle-grid">
            {recoveryData.recoveryList.map((m) => {
              const info = MUSCLE_GROUP_LABELS[m.muscle] || { label: m.muscle, icon: '⚡' };
              const statusClass = m.status === 'ready'
                ? 'recovered'
                : m.status === 'recovering'
                ? 'recovering'
                : 'fatigued';
              const color = m.status === 'ready'
                ? '#22c55e'
                : m.status === 'recovering'
                ? '#06b6d4'
                : '#f59e0b';
              return (
                <div key={m.muscle} className={`pc-muscle-pill ${statusClass}`}>
                  <div className="pc-muscle-name">{info.icon} {info.label}</div>
                  <div className="pc-muscle-bar">
                    <div
                      className="pc-muscle-fill"
                      style={{ width: `${m.recoveryPercentage}%`, backgroundColor: color }}
                    />
                  </div>
                  <div className="pc-muscle-status" style={{ color }}>
                    {m.statusText} ({m.recoveryPercentage}%)
                  </div>
                </div>
              );
            })}
          </div>

          {/* 周度有效组数堆叠 */}
          <div style={{ marginTop: '12px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '10px',
              }}
            >
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <BarChart2 size={16} color="#06b6d4" />
                <span>近 7 天各部位有效训练组数 (MEV ~ MRV)</span>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                建议维持 10~20 组/周
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {weeklySetsData.weeklySets.map((ws) => {
                const info = MUSCLE_GROUP_LABELS[ws.muscle] || { label: ws.muscle };
                const pct = Math.min(100, Math.round((ws.completedSets / (ws.targetMax || 20)) * 100));
                return (
                  <div key={ws.muscle}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '0.8rem',
                        marginBottom: '4px',
                      }}
                    >
                      <span style={{ color: '#fff' }}>{info.label}</span>
                      <span style={{ color: ws.completedSets >= ws.targetMin ? '#22c55e' : 'var(--text-dim)' }}>
                        {ws.completedSets} 组 / 目标 {ws.targetMin}~{ws.targetMax} 组
                      </span>
                    </div>
                    <div
                      style={{
                        height: '6px',
                        background: 'rgba(255, 255, 255, 0.06)',
                        borderRadius: '3px',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${pct}%`,
                          background:
                            ws.status === 'optimal'
                              ? 'linear-gradient(90deg, #22c55e, #06b6d4)'
                              : pct >= 50
                              ? '#22c55e'
                              : '#64748b',
                          borderRadius: '3px',
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

        {/* 右栏：单动作渐进超负荷与 1RM 进阶曲线 */}
        <div className="pc-card">
          <div className="pc-card-header">
            <div className="pc-card-title">
              <TrendingUp size={20} color="#06b6d4" />
              <span>单动作渐进超负荷进阶曲线</span>
            </div>

            {/* 动作选择器 */}
            <select
              value={selectedExerciseId}
              onChange={(e) => setSelectedExerciseId(e.target.value)}
              className="pc-exercise-select"
            >
              {exercisesWithHistory.length === 0 ? (
                <option value="">暂无训练记录的动作</option>
              ) : (
                exercisesWithHistory.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.name} ({MUSCLE_GROUP_LABELS[ex.category as MuscleGroup]?.label || '通用'})
                  </option>
                ))
              )}
            </select>
          </div>

          {/* 指标切换胶囊 */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className={`pc-desk-tab-btn ${metricMode === 'estimated1RM' ? 'active' : ''}`}
              onClick={() => setMetricMode('estimated1RM')}
              style={{ fontSize: '0.78rem', padding: '5px 12px' }}
            >
              估算 1RM 极限
            </button>
            <button
              type="button"
              className={`pc-desk-tab-btn ${metricMode === 'maxWeight' ? 'active' : ''}`}
              onClick={() => setMetricMode('maxWeight')}
              style={{ fontSize: '0.78rem', padding: '5px 12px' }}
            >
              单组最大重量
            </button>
            <button
              type="button"
              className={`pc-desk-tab-btn ${metricMode === 'totalVolume' ? 'active' : ''}`}
              onClick={() => setMetricMode('totalVolume')}
              style={{ fontSize: '0.78rem', padding: '5px 12px' }}
            >
              单次总容量 (kg)
            </button>
          </div>

          {/* SVG 趋势图表区 */}
          <div className="pc-chart-wrap">
            {chartData && chartData.points.length > 0 ? (
              <svg viewBox={`0 0 ${chartData.width} ${chartData.height}`} className="pc-chart-svg">
                <defs>
                  <linearGradient id="pcChartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* 背景网格线 */}
                <line
                  x1="40"
                  y1="20"
                  x2={chartData.width - 30}
                  y2="20"
                  stroke="rgba(255,255,255,0.06)"
                  strokeDasharray="4 4"
                />
                <line
                  x1="40"
                  y1={chartData.height / 2}
                  x2={chartData.width - 30}
                  y2={chartData.height / 2}
                  stroke="rgba(255,255,255,0.06)"
                  strokeDasharray="4 4"
                />
                <line
                  x1="40"
                  y1={chartData.height - 30}
                  x2={chartData.width - 30}
                  y2={chartData.height - 30}
                  stroke="rgba(255,255,255,0.1)"
                />

                {/* 面积与折线 */}
                {chartData.areaD && <path d={chartData.areaD} fill="url(#pcChartGradient)" />}
                <path
                  d={chartData.pathD}
                  fill="none"
                  stroke="#06b6d4"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* 历史记录点 */}
                {chartData.points.map((pt, idx) => (
                  <circle
                    key={idx}
                    cx={pt.x}
                    cy={pt.y}
                    r={hoveredPoint?.x === pt.x ? 6 : 4}
                    fill={hoveredPoint?.x === pt.x ? '#22c55e' : '#06b6d4'}
                    stroke="#111"
                    strokeWidth="2"
                    style={{ cursor: 'pointer', transition: 'r 0.2s' }}
                    onMouseEnter={() =>
                      setHoveredPoint({ x: pt.x, y: pt.y, date: pt.date, value: pt.val })
                    }
                    onMouseLeave={() => setHoveredPoint(null)}
                  />
                ))}
              </svg>
            ) : (
              <div
                style={{
                  height: '180px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-dim)',
                  fontSize: '0.85rem',
                }}
              >
                该动作暂无历史完成组记录，打卡后将自动生成曲线
              </div>
            )}

            {/* 浮动 Tooltip */}
            {hoveredPoint && (
              <div
                style={{
                  position: 'absolute',
                  left: `${hoveredPoint.x}px`,
                  top: `${hoveredPoint.y - 45}px`,
                  transform: 'translateX(-50%)',
                  background: '#1e293b',
                  border: '1px solid rgba(255,255,255,0.15)',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  pointerEvents: 'none',
                  whiteSpace: 'nowrap',
                  zIndex: 10,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                }}
              >
                <div style={{ color: '#fff', fontWeight: 700 }}>
                  {hoveredPoint.value}{' '}
                  {metricMode === 'totalVolume' ? 'kg 容量' : 'kg'}
                </div>
                <div style={{ color: 'var(--text-dim)', fontSize: '0.7rem' }}>
                  {hoveredPoint.date}
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-dim)' }}>
            <span>动作历史共 {exerciseHistory.length} 次记录</span>
            {chartData && (
              <span>
                历史峰值: {chartData.maxVal} {metricMode === 'totalVolume' ? 'kg' : 'kg'}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* 3. 底部全宽数据卡：全景训练一致性热力矩阵 (Consistency Heatmap) */}
      <section className="pc-card">
        <div className="pc-card-header">
          <div className="pc-card-title">
            <Flame size={20} color="#22c55e" />
            <span>训练一致性热力矩阵 (16周 Consistency Heatmap)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
            <span>较少</span>
            <span className="pc-heatmap-cell lvl-1" style={{ display: 'inline-block' }} />
            <span className="pc-heatmap-cell lvl-2" style={{ display: 'inline-block' }} />
            <span className="pc-heatmap-cell lvl-3" style={{ display: 'inline-block' }} />
            <span className="pc-heatmap-cell lvl-4" style={{ display: 'inline-block' }} />
            <span>更高</span>
          </div>
        </div>

        <div className="pc-heatmap-grid" style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {heatmapData.days.map((day) => {
            const count = day.setsCount || 0;
            const lvlClass = `lvl-${day.level}`;
            return (
              <div
                key={day.date}
                className={`pc-heatmap-cell ${lvlClass}`}
                title={`${day.date}: ${count > 0 ? `${count} 组 (${day.totalVolume}kg)` : '休息日'}`}
                onMouseEnter={() => setHoveredHeatmapDay(day)}
                onMouseLeave={() => setHoveredHeatmapDay(null)}
              />
            );
          })}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: 'var(--text-dim)' }}>
          <div>
            {hoveredHeatmapDay ? (
              <span style={{ color: '#fff' }}>
                📅 {hoveredHeatmapDay.date} ·{' '}
                {hoveredHeatmapDay.setsCount > 0
                  ? `完成 ${hoveredHeatmapDay.setsCount} 组训练，举铁负荷 ${hoveredHeatmapDay.totalVolume} kg`
                  : '充分休整'}
              </span>
            ) : (
              <span>鼠标悬浮热力方格可查看单日训练量</span>
            )}
          </div>

          {onOpenBodyMetricsModal && (
            <button
              type="button"
              onClick={onOpenBodyMetricsModal}
              className="pc-desk-tab-btn"
              style={{ padding: '4px 10px', fontSize: '0.75rem' }}
            >
              <Scale size={14} /> 记录最新体测
            </button>
          )}
        </div>
      </section>
    </div>
  );
};
