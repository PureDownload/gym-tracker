import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  BarChart2,
  Flame,
  Activity,
  Trophy,
  Calendar,
  BatteryCharging,
  Award,
  Scale,
  Plus,
} from 'lucide-react';
import type { WorkoutSession, Exercise, MuscleGroup, BodyMetricEntry } from '../types/workout';
import { PRESET_EXERCISES, MUSCLE_GROUP_LABELS } from '../data/presetExercises';
import { analyticsService } from '../services/analytics';
import { evaluateStrengthProfile, STRENGTH_RANK_META } from '../services/strengthStandards';
import { storageService } from '../services/storage';

interface AnalyticsViewProps {
  workouts: WorkoutSession[];
  customExercises: Exercise[];
  bodyMetrics?: BodyMetricEntry[];
  onOpenBodyMetricsModal?: () => void;
}

type SubTab = 'overview' | 'single' | 'standards' | 'body_metrics';
type StrengthMetric = 'maxWeight' | 'estimated1RM' | 'totalVolume';
type CardioMetric = 'durationMinutes' | 'distanceKm' | 'caloriesKcal';

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  workouts,
  customExercises,
  bodyMetrics = [],
  onOpenBodyMetricsModal,
}) => {
  const allExercises = useMemo(
    () => [...PRESET_EXERCISES, ...customExercises],
    [customExercises]
  );

  const [activeSubTab, setActiveSubTab] = useState<SubTab>('overview');

  // Strength Standards & Profile State
  const [userProfile] = useState(() => storageService.getUserProfile());
  const [userWeightInput, setUserWeightInput] = useState<string>(() => {
    const latestBM = bodyMetrics.find((m) => m.weightKg != null);
    return String(latestBM?.weightKg || userProfile.bodyWeightKg || 70);
  });
  const [userGender, setUserGender] = useState<'male' | 'female'>(userProfile.gender || 'male');

  const strengthProfile = useMemo(() => {
    const w = parseFloat(userWeightInput) || 70;
    return evaluateStrengthProfile(workouts, w, userGender);
  }, [workouts, userWeightInput, userGender]);

  // =========================================================
  // 1. MACRO SCIENTIFIC CALCULATIONS (宏观科学可视化数据)
  // =========================================================
  const recoveryData = useMemo(
    () => analyticsService.getMuscleRecoveryStatus(workouts),
    [workouts]
  );

  const weeklySetsData = useMemo(
    () => analyticsService.getWeeklyEffectiveSets(workouts),
    [workouts]
  );

  const prData = useMemo(
    () => analyticsService.getPersonalRecords(workouts),
    [workouts]
  );

  const heatmapData = useMemo(
    () => analyticsService.getConsistencyHeatmap(workouts, 16),
    [workouts]
  );

  const [hoveredHeatmapDay, setHoveredHeatmapDay] = useState<any | null>(null);

  // =========================================================
  // 2. MICRO SINGLE EXERCISE EVOLUTION (单动作超负荷分析)
  // =========================================================
  const exercisesWithHistory = useMemo(() => {
    return allExercises.filter((ex) => {
      return workouts.some((w) => w.exercises.some((e) => e.exerciseId === ex.id));
    });
  }, [allExercises, workouts]);

  const [selectedExerciseId, setSelectedExerciseId] = useState<string>(() => {
    return exercisesWithHistory.length > 0 ? exercisesWithHistory[0].id : PRESET_EXERCISES[0].id;
  });

  const selectedExercise =
    allExercises.find((e) => e.id === selectedExerciseId) || PRESET_EXERCISES[0];
  const isCardio = selectedExercise.category === 'cardio' || selectedExercise.isCardio;

  const [strengthMetric, setStrengthMetric] = useState<StrengthMetric>('estimated1RM');
  const [cardioMetric, setCardioMetric] = useState<CardioMetric>('durationMinutes');
  const [activeHoverPoint, setActiveHoverPoint] = useState<any | null>(null);

  const analysis = analyticsService.analyzeProgressiveOverload(
    selectedExercise.id,
    selectedExercise.name,
    selectedExercise.category,
    workouts
  );

  const historyPoints = analysis.historyPoints;
  const muscleDistribution = analyticsService.getMuscleGroupDistribution(workouts);
  const totalVolumeAll = Object.values(muscleDistribution).reduce((sum, v) => sum + v.volume, 0);

  // SVG Chart Dimensions
  const chartWidth = 420;
  const chartHeight = 180;
  const paddingLeft = 40;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 30;

  const innerWidth = chartWidth - paddingLeft - paddingRight;
  const innerHeight = chartHeight - paddingTop - paddingBottom;

  const getMetricValue = (p: any) => {
    if (isCardio) {
      if (cardioMetric === 'durationMinutes') return p.durationMinutes;
      if (cardioMetric === 'distanceKm') return p.distanceKm;
      return p.caloriesKcal;
    } else {
      if (strengthMetric === 'maxWeight') return p.maxWeight;
      if (strengthMetric === 'estimated1RM') return p.estimated1RM;
      return p.totalVolume;
    }
  };

  const metricValues = historyPoints.map((p) => getMetricValue(p));
  const rawMin = metricValues.length > 0 ? Math.min(...metricValues) : 0;
  const rawMax = metricValues.length > 0 ? Math.max(...metricValues) : 100;
  const minY = Math.max(0, Math.floor(rawMin * 0.9));
  const maxY = Math.ceil(rawMax * 1.1) || (isCardio ? 60 : 100);

  const svgPoints = historyPoints.map((p, idx) => {
    const val = getMetricValue(p);
    const x =
      historyPoints.length === 1
        ? paddingLeft + innerWidth / 2
        : paddingLeft + (idx / (historyPoints.length - 1)) * innerWidth;
    const y = paddingTop + innerHeight - ((val - minY) / (maxY - minY || 1)) * innerHeight;
    return { x, y, point: p, value: val };
  });

  const polylinePath = svgPoints.map((pt) => `${pt.x},${pt.y}`).join(' ');

  const getMetricLabel = () => {
    if (isCardio) {
      switch (cardioMetric) {
        case 'durationMinutes':
          return '有氧时长 (分钟)';
        case 'distanceKm':
          return '运动距离 (公里)';
        case 'caloriesKcal':
          return '消耗热量 (千卡)';
      }
    } else {
      switch (strengthMetric) {
        case 'maxWeight':
          return '最高做组重量 (kg)';
        case 'estimated1RM':
          return '估算 1RM 极限力量 (kg)';
        case 'totalVolume':
          return '单次训练总容量 (kg)';
      }
    }
  };

  const strokeColor = isCardio ? 'var(--muscle-cardio)' : 'var(--accent-primary)';

  return (
    <div className="animate-fade-in">
      {/* ========================================================
          TOP NAVIGATION SUB-TABS (Sticky 毛玻璃吸顶导航栏)
          ======================================================== */}
      <div className="analytics-sticky-header">
        <div className="analytics-tab-row hide-scrollbar">
          <button
            type="button"
            className={`analytics-tab-btn ${activeSubTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('overview')}
          >
            <Activity size={15} />
            <span>科学全景</span>
          </button>

          <button
            type="button"
            className={`analytics-tab-btn ${activeSubTab === 'single' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('single')}
          >
            <TrendingUp size={15} />
            <span>动作超负荷</span>
          </button>

          <button
            type="button"
            className={`analytics-tab-btn ${activeSubTab === 'standards' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('standards')}
          >
            <Award size={15} color="#f59e0b" />
            <span>力量等级评定</span>
          </button>

          <button
            type="button"
            className={`analytics-tab-btn ${activeSubTab === 'body_metrics' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('body_metrics')}
          >
            <Scale size={15} color="#10b981" />
            <span>身材与围度</span>
          </button>
        </div>
      </div>

      {activeSubTab === 'overview' && (
        // ========================================================
        // TAB A: MACRO SCIENTIFIC DASHBOARDS (科学全景四大看板)
        // ========================================================
        <div>
          {/* 1. STREAK & CONSISTENCY HEATMAP (打卡连续天数与热力墙) */}
          <div className="card" style={{ marginBottom: '14px', padding: '14px' }}>
            <div className="card-title-row" style={{ marginBottom: '10px' }}>
              <div className="card-title">
                <Calendar size={18} color="var(--accent-primary)" />
                训练一致性打卡墙 (近16周)
              </div>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                累计练过 {heatmapData.totalWorkouts} 次
              </span>
            </div>

            {/* Streak Summary */}
            <div className="streak-card">
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--accent-warning)' }}>
                  🔥 {heatmapData.currentStreakDays} 天
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>当前连续打卡</div>
              </div>
              <div style={{ width: '1px', height: '24px', background: 'var(--border-subtle)' }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--accent-primary)' }}>
                  🏆 {heatmapData.longestStreakDays} 天
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>历史最长连击</div>
              </div>
              <div style={{ width: '1px', height: '24px', background: 'var(--border-subtle)' }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--accent-cyan)' }}>
                  {heatmapData.totalVolumeKg > 1000
                    ? (heatmapData.totalVolumeKg / 1000).toFixed(1) + ' t'
                    : heatmapData.totalVolumeKg + ' kg'}
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>累计举起总吨位</div>
              </div>
            </div>

            {/* Heatmap Matrix */}
            <div className="heatmap-container">
              <div className="heatmap-grid">
                {heatmapData.days.map((d) => (
                  <div
                    key={d.date}
                    className={`heatmap-cell lvl-${d.level}`}
                    onClick={() => setHoveredHeatmapDay(d)}
                    title={`${d.date}: ${d.setsCount > 0 ? `${d.setsCount}组 (${d.sessionTitle || '训练'})` : '休息日'}`}
                  />
                ))}
              </div>
            </div>

            {/* Hover details / legend */}
            {hoveredHeatmapDay ? (
              <div
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--accent-primary)',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  marginTop: '8px',
                  fontSize: '0.74rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>
                  📅 {hoveredHeatmapDay.date} · {hoveredHeatmapDay.sessionTitle || (hoveredHeatmapDay.setsCount > 0 ? '打卡记录' : '休息日')}
                </span>
                <span style={{ fontWeight: 800, color: 'var(--accent-primary)' }}>
                  {hoveredHeatmapDay.setsCount > 0
                    ? `${hoveredHeatmapDay.setsCount} 组 · ${hoveredHeatmapDay.totalVolume} kg`
                    : '充分休整'}
                </span>
              </div>
            ) : (
              <div className="heatmap-legend">
                <span>较少</span>
                <div className="heatmap-cell lvl-0" />
                <div className="heatmap-cell lvl-1" />
                <div className="heatmap-cell lvl-2" />
                <div className="heatmap-cell lvl-3" />
                <div className="heatmap-cell lvl-4" />
                <span>较多</span>
              </div>
            )}
          </div>

          {/* 2. MUSCLE RECOVERY RADAR (全身肌群超量恢复就绪雷达) */}
          <div className="recovery-hero-card">
            <div className="card-title-row" style={{ marginBottom: '8px' }}>
              <div className="card-title" style={{ color: 'var(--accent-primary)' }}>
                <BatteryCharging size={20} />
                全身肌群超量恢复雷达 (Readiness)
              </div>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.85rem',
                  fontWeight: 800,
                  color: 'var(--accent-primary)',
                }}
              >
                综合就绪度 {recoveryData.overallReadiness}%
              </span>
            </div>

            {/* Smart Advice Banner */}
            <div
              style={{
                backgroundColor: 'var(--bg-subtle)',
                borderLeft: '3px solid var(--accent-primary)',
                padding: '8px 12px',
                borderRadius: '0 8px 8px 0',
                fontSize: '0.78rem',
                color: 'var(--text-primary)',
                lineHeight: 1.45,
              }}
            >
              {recoveryData.recommendationAdvice}
            </div>

            {/* Recovery Progress Bars */}
            <div className="recovery-grid">
              {recoveryData.recoveryList.map((item) => {
                const info = MUSCLE_GROUP_LABELS[item.muscle] || { label: item.muscle, icon: '⚡' };
                return (
                  <div key={item.muscle} className="recovery-row-item">
                    <div className="recovery-label-line">
                      <span style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>{info.icon}</span>
                        <span>{info.label}</span>
                        <span
                          style={{
                            fontSize: '0.68rem',
                            fontWeight: 600,
                            padding: '1px 6px',
                            borderRadius: '4px',
                            backgroundColor:
                              item.status === 'ready'
                                ? 'var(--accent-primary-glow)'
                                : item.status === 'recovering'
                                ? 'rgba(245, 158, 11, 0.15)'
                                : 'rgba(239, 68, 68, 0.15)',
                            color:
                              item.status === 'ready'
                                ? 'var(--accent-primary)'
                                : item.status === 'recovering'
                                ? 'var(--accent-warning)'
                                : 'var(--accent-danger)',
                          }}
                        >
                          {item.statusText}
                        </span>
                      </span>

                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {item.lastTrainedDate
                          ? `${item.recoveryPercentage}% (距上次${item.hoursElapsed}h)`
                          : '100% (未练状态)'}
                      </span>
                    </div>

                    <div className="recovery-track">
                      <div
                        className={`recovery-fill-bar ${item.status}`}
                        style={{ width: `${item.recoveryPercentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. WEEKLY EFFECTIVE SETS BALANCE (每周各肌群有效组数平衡分析) */}
          <div className="weekly-balance-card">
            <div className="card-title-row" style={{ marginBottom: '8px' }}>
              <div className="card-title">
                <BarChart2 size={18} color="var(--accent-cyan)" />
                本周各肌群有效组数 (10~20组黄金区间)
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                {weeklySetsData.weekRangeText} · 共 {weeklySetsData.totalSetsThisWeek} 组
              </span>
            </div>

            <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
              运动科学标准：单肌群每周 <strong>10~20 个有效组</strong>是增肌最高性价比区间，少于8组刺激不足，超过22组易积累无效疲劳。
            </p>

            <div>
              {weeklySetsData.weeklySets.map((ws) => {
                const info = MUSCLE_GROUP_LABELS[ws.muscle] || { label: ws.muscle, icon: '⚡' };
                const pct = Math.min(100, Math.round((ws.completedSets / 25) * 100));

                return (
                  <div key={ws.muscle} className="weekly-sets-item">
                    <div className="weekly-sets-label-row">
                      <span style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>{info.icon}</span>
                        <span>{info.label}</span>
                        <span
                          style={{
                            fontSize: '0.68rem',
                            fontWeight: 600,
                            padding: '1px 5px',
                            borderRadius: '4px',
                            backgroundColor:
                              ws.status === 'optimal'
                                ? 'var(--accent-primary-glow)'
                                : ws.status === 'under'
                                ? 'rgba(239, 68, 68, 0.12)'
                                : 'rgba(245, 158, 11, 0.15)',
                            color:
                              ws.status === 'optimal'
                                ? 'var(--accent-primary)'
                                : ws.status === 'under'
                                ? 'var(--accent-danger)'
                                : 'var(--accent-warning)',
                          }}
                        >
                          {ws.statusText}
                        </span>
                      </span>

                      <span style={{ fontSize: '0.76rem', fontFamily: 'var(--font-mono)', fontWeight: 800 }}>
                        {ws.completedSets} <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>/ 目标 {ws.targetMin}~{ws.targetMax}组</span>
                      </span>
                    </div>

                    <div className="weekly-target-zone-bar">
                      <div
                        style={{
                          height: '100%',
                          width: `${pct}%`,
                          borderRadius: '999px',
                          backgroundColor:
                            ws.status === 'optimal'
                              ? 'var(--accent-primary)'
                              : ws.status === 'high'
                              ? 'var(--accent-warning)'
                              : 'var(--text-muted)',
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4. PERSONAL RECORDS WALL (三大项与核心动作 PR 荣誉榜) */}
          <div className="card" style={{ marginBottom: '14px', padding: '14px' }}>
            <div className="card-title-row" style={{ marginBottom: '6px' }}>
              <div className="card-title" style={{ color: 'var(--accent-warning)' }}>
                <Trophy size={18} />
                个人最高成绩 PR 荣誉榜 (Personal Records)
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                突破纪录 {prData.length} 项
              </span>
            </div>

            <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
              记录你在健身房里每一次突破极限的历史最高做组重量、估算 1RM 与力量段位。
            </p>

            {prData.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px 0', fontSize: '0.84rem' }}>
                暂无力量动作打卡，去完成第一次训练即可上榜！
              </div>
            ) : (
              <div className="pr-hall-grid">
                {prData.map((pr) => {
                  const catInfo = MUSCLE_GROUP_LABELS[pr.category] || { label: pr.category, icon: '⚡' };
                  return (
                    <div key={pr.exerciseId} className={`pr-card-item ${pr.isBig3 ? 'big3' : ''}`}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '1.1rem' }}>{catInfo.icon}</span>
                          <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                            {pr.exerciseName}
                          </span>
                          {pr.isBig3 && (
                            <span
                              style={{
                                fontSize: '0.65rem',
                                padding: '1px 5px',
                                borderRadius: '4px',
                                backgroundColor: 'rgba(245, 158, 11, 0.2)',
                                color: 'var(--accent-warning)',
                                fontWeight: 700,
                              }}
                            >
                              三大项
                            </span>
                          )}
                          {pr.isRecentPR && (
                            <span
                              style={{
                                fontSize: '0.65rem',
                                padding: '1px 5px',
                                borderRadius: '4px',
                                backgroundColor: 'var(--accent-primary-glow)',
                                color: 'var(--accent-primary)',
                                fontWeight: 800,
                              }}
                            >
                              🌟 最新突破
                            </span>
                          )}
                        </div>

                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', gap: '8px' }}>
                          <span>📅 {pr.dateAchieved} 突破</span>
                          <span>·</span>
                          <span style={{ color: 'var(--accent-cyan)' }}>估算极限 1RM: {pr.estimated1RM} kg</span>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div className="pr-val-display">{pr.maxWeightKg} kg</div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--accent-warning)', fontWeight: 700, marginTop: '2px' }}>
                          {pr.strengthLevel}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {activeSubTab === 'single' && (
        // ========================================================
        // TAB B: MICRO PROGRESSIVE OVERLOAD CURVES (单动作折线图)
        // ========================================================
        <div>
          {/* Exercise Dropdown Selector */}
          <div className="card" style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
              选择要深度追踪的动作（支持力量与有氧）
            </label>
            <select
              value={selectedExerciseId}
              onChange={(e) => {
                setSelectedExerciseId(e.target.value);
                setActiveHoverPoint(null);
              }}
              style={{ width: '100%', padding: '10px 12px', fontSize: '0.95rem', fontWeight: 700 }}
            >
              {allExercises.map((ex) => {
                const hasData = workouts.some((w) => w.exercises.some((e) => e.exerciseId === ex.id));
                const catInfo = MUSCLE_GROUP_LABELS[ex.category];
                return (
                  <option key={ex.id} value={ex.id}>
                    {catInfo?.icon} {ex.name} {hasData ? '（已记录）' : '（暂无记录）'}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Progressive Overload Advisor Card */}
          <div className={`card suggestion-card ${analysis.status}`} style={{ borderLeftColor: analysis.statusColor }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
              <span
                className="badge"
                style={{
                  backgroundColor: 'var(--bg-subtle)',
                  color: analysis.statusColor,
                  border: `1px solid ${analysis.statusColor}`,
                }}
              >
                {analysis.statusBadge}
              </span>

              {!isCardio && analysis.targetNextWeight > 0 && (
                <span
                  style={{
                    fontSize: '0.78rem',
                    color: analysis.statusColor,
                    fontWeight: 800,
                    backgroundColor: 'var(--bg-input)',
                    border: `1px solid ${analysis.statusColor}`,
                    padding: '3px 9px',
                    borderRadius: '20px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  🎯 建议重量: {analysis.targetNextWeight} kg
                </span>
              )}
            </div>

            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>
              {analysis.recommendationTitle}
            </h3>

            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
              {analysis.recommendationDetail}
            </p>

            {/* Delta Key Metrics for Strength */}
            {!isCardio && analysis.previousMaxWeight !== undefined && (
              <div
                style={{
                  marginTop: '12px',
                  paddingTop: '10px',
                  borderTop: '1px solid var(--border-subtle)',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  textAlign: 'center',
                  gap: '6px',
                }}
              >
                <div style={{ background: 'var(--bg-input)', padding: '6px 4px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>最大重量变化</div>
                  <div
                    style={{
                      fontSize: '0.95rem',
                      fontWeight: 800,
                      color:
                        analysis.weightDelta > 0
                          ? 'var(--accent-primary)'
                          : analysis.weightDelta < 0
                          ? 'var(--accent-danger)'
                          : 'var(--text-secondary)',
                    }}
                  >
                    {analysis.weightDelta > 0 ? `+${analysis.weightDelta}` : analysis.weightDelta} kg
                  </div>
                </div>

                <div style={{ background: 'var(--bg-input)', padding: '6px 4px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>1RM 走势</div>
                  <div
                    style={{
                      fontSize: '0.95rem',
                      fontWeight: 800,
                      color:
                        analysis.rmDelta > 0
                          ? 'var(--accent-primary)'
                          : analysis.rmDelta < 0
                          ? 'var(--accent-danger)'
                          : 'var(--text-secondary)',
                    }}
                  >
                    {analysis.rmDelta > 0 ? `+${analysis.rmDelta}` : analysis.rmDelta} kg
                  </div>
                </div>

                <div style={{ background: 'var(--bg-input)', padding: '6px 4px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>总容量波动</div>
                  <div
                    style={{
                      fontSize: '0.95rem',
                      fontWeight: 800,
                      color:
                        analysis.volumeDeltaPercent > 0
                          ? 'var(--accent-primary)'
                          : analysis.volumeDeltaPercent < 0
                          ? 'var(--accent-danger)'
                          : 'var(--text-secondary)',
                    }}
                  >
                    {analysis.volumeDeltaPercent > 0 ? `+${analysis.volumeDeltaPercent}` : analysis.volumeDeltaPercent}%
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Interactive Trend Chart Card */}
          <div className="card chart-card">
            <div className="chart-header-row">
              <div style={{ fontSize: '0.92rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                {isCardio ? <Flame size={16} color="var(--muscle-cardio)" /> : <TrendingUp size={16} color="var(--accent-cyan)" />}
                <span>{isCardio ? '有氧耐力与时长走势' : '力量与容量趋势图'}</span>
              </div>

              {/* Metric Switcher */}
              {isCardio ? (
                <div className="chart-metric-selector">
                  <button
                    className={`metric-btn ${cardioMetric === 'durationMinutes' ? 'active' : ''}`}
                    onClick={() => setCardioMetric('durationMinutes')}
                  >
                    时长
                  </button>
                  <button
                    className={`metric-btn ${cardioMetric === 'distanceKm' ? 'active' : ''}`}
                    onClick={() => setCardioMetric('distanceKm')}
                  >
                    距离
                  </button>
                  <button
                    className={`metric-btn ${cardioMetric === 'caloriesKcal' ? 'active' : ''}`}
                    onClick={() => setCardioMetric('caloriesKcal')}
                  >
                    热量
                  </button>
                </div>
              ) : (
                <div className="chart-metric-selector">
                  <button
                    className={`metric-btn ${strengthMetric === 'estimated1RM' ? 'active' : ''}`}
                    onClick={() => setStrengthMetric('estimated1RM')}
                  >
                    1RM
                  </button>
                  <button
                    className={`metric-btn ${strengthMetric === 'maxWeight' ? 'active' : ''}`}
                    onClick={() => setStrengthMetric('maxWeight')}
                  >
                    做组重
                  </button>
                  <button
                    className={`metric-btn ${strengthMetric === 'totalVolume' ? 'active' : ''}`}
                    onClick={() => setStrengthMetric('totalVolume')}
                  >
                    总容量
                  </button>
                </div>
              )}
            </div>

            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '8px', paddingLeft: '4px' }}>
              当前指标：{getMetricLabel()}
            </div>

            {/* SVG Chart Rendering */}
            {historyPoints.length === 0 ? (
              <div
                style={{
                  height: '160px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-muted)',
                  fontSize: '0.85rem',
                }}
              >
                该项目暂无记录，录入训练后即可在此查看可视化曲线
              </div>
            ) : (
              <div style={{ position: 'relative' }}>
                <svg
                  viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                  style={{ width: '100%', height: 'auto', overflow: 'visible' }}
                >
                  <defs>
                    <linearGradient id="cardioGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor={strokeColor} stopOpacity="0.4" />
                      <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Grid Lines */}
                  {[0, 0.5, 1].map((ratio) => {
                    const y = paddingTop + innerHeight * ratio;
                    const gridVal = Math.round(maxY - ratio * (maxY - minY));
                    return (
                      <g key={ratio}>
                        <line
                          x1={paddingLeft}
                          y1={y}
                          x2={chartWidth - paddingRight}
                          y2={y}
                          stroke="var(--border-subtle)"
                          strokeDasharray="3 3"
                        />
                        <text
                          x={paddingLeft - 6}
                          y={y + 4}
                          fill="var(--text-muted)"
                          fontSize="9"
                          textAnchor="end"
                        >
                          {gridVal}
                        </text>
                      </g>
                    );
                  })}

                  {/* Area Fill */}
                  {svgPoints.length > 1 && (
                    <polygon
                      points={`${svgPoints[0].x},${paddingTop + innerHeight} ${polylinePath} ${svgPoints[svgPoints.length - 1].x},${paddingTop + innerHeight}`}
                      fill="url(#cardioGradient)"
                    />
                  )}

                  {/* Polyline */}
                  {svgPoints.length > 1 ? (
                    <polyline
                      points={polylinePath}
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  ) : null}

                  {/* Points */}
                  {svgPoints.map((pt, idx) => (
                    <g key={idx}>
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r="5"
                        fill="var(--bg-surface)"
                        stroke={strokeColor}
                        strokeWidth="2.5"
                        style={{ cursor: 'pointer' }}
                        onClick={() => setActiveHoverPoint(pt)}
                      />
                      <text
                        x={pt.x}
                        y={chartHeight - 8}
                        fill="var(--text-muted)"
                        fontSize="9"
                        textAnchor="middle"
                      >
                        {pt.point.date.slice(5)}
                      </text>
                    </g>
                  ))}
                </svg>

                {/* Selected point inspection pill */}
                {activeHoverPoint ? (
                  <div
                    style={{
                      background: 'var(--bg-elevated)',
                      border: `1px solid ${strokeColor}`,
                      borderRadius: '8px',
                      padding: '6px 12px',
                      marginTop: '8px',
                      fontSize: '0.78rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span>
                      📅 {activeHoverPoint.point.date} · 表现: {activeHoverPoint.point.bestSet}
                    </span>
                    <span style={{ fontWeight: 800, color: strokeColor }}>
                      {activeHoverPoint.value}{' '}
                      {isCardio
                        ? cardioMetric === 'distanceKm'
                          ? 'km'
                          : cardioMetric === 'caloriesKcal'
                          ? 'kcal'
                          : '分'
                        : strengthMetric === 'totalVolume'
                        ? 'kg容量'
                        : 'kg'}
                    </span>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    点击折线上的节点可查看该日详细有氧/力量参数
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Muscle Group Volume Distribution */}
          <div className="card">
            <div className="card-title-row">
              <div className="card-title">
                <BarChart2 size={18} color="var(--accent-primary)" />
                部位历史训练负荷总分布
              </div>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                总容量: {totalVolumeAll > 1000 ? (totalVolumeAll / 1000).toFixed(1) + ' 吨' : totalVolumeAll + ' kg'}
              </span>
            </div>

            <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {(Object.keys(muscleDistribution) as MuscleGroup[]).map((cat) => {
                const info = MUSCLE_GROUP_LABELS[cat];
                const data = muscleDistribution[cat];
                const pct = totalVolumeAll > 0 ? Math.round((data.volume / totalVolumeAll) * 100) : 0;

                return (
                  <div key={cat} style={{ fontSize: '0.78rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>{info?.icon}</span>
                        <span>{info?.label}</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                          ({data.count}组)
                        </span>
                      </span>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                        {data.volume} kg ({pct}%)
                      </span>
                    </div>

                    <div
                      style={{
                        height: '6px',
                        background: 'var(--bg-input)',
                        borderRadius: '3px',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${pct}%`,
                          background: info?.color || 'var(--accent-primary)',
                          borderRadius: '3px',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          TAB C: STRENGTH STANDARDS & RATIO EVALUATION (力量等级评定)
          ======================================================== */}
      {activeSubTab === 'standards' && (
        <div>
          {/* User Parameters Settings Card */}
          <div className="card" style={{ marginBottom: '14px', padding: '14px' }}>
            <div className="card-title-row" style={{ marginBottom: '10px' }}>
              <div className="card-title" style={{ color: '#f59e0b' }}>
                <Award size={18} />
                力量等级与自重推比设置
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                  当前自重 (kg)
                </label>
                <input
                  type="number"
                  step="0.5"
                  className="input-field"
                  value={userWeightInput}
                  onChange={(e) => {
                    setUserWeightInput(e.target.value);
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val) && val > 0) {
                      storageService.saveUserProfile({ gender: userGender, bodyWeightKg: val });
                    }
                  }}
                  style={{ width: '100%', marginTop: '4px', fontWeight: 700 }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                  生理性别
                </label>
                <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                  {(['male', 'female'] as const).map((g) => (
                    <button
                      key={g}
                      type="button"
                      className={`step-chip ${userGender === g ? 'active' : ''}`}
                      onClick={() => {
                        setUserGender(g);
                        storageService.saveUserProfile({
                          gender: g,
                          bodyWeightKg: parseFloat(userWeightInput) || 70,
                        });
                      }}
                      style={{ flex: 1, padding: '6px 0', textAlign: 'center', fontSize: '0.78rem' }}
                    >
                      {g === 'male' ? '男士 ♂' : '女士 ♀'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Hero Banner: Big 3 Total & Overall Rank */}
          <div
            className="strength-hero-card"
            style={{
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(59, 130, 246, 0.08))',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: '14px',
              padding: '16px',
              marginBottom: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  三大项综合评级 (卧推 + 深蹲 + 硬拉)
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-primary)', marginTop: '4px' }}>
                  {STRENGTH_RANK_META[strengthProfile.overallRank].badge}{' '}
                  {strengthProfile.overallRankLabel}
                </div>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {STRENGTH_RANK_META[strengthProfile.overallRank].desc}
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>三大项总成绩</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f59e0b' }}>
                  {strengthProfile.totalBigThree1RMKg}{' '}
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>kg</span>
                </div>
                <div style={{ fontSize: '0.76rem', color: 'var(--accent-primary)', fontWeight: 600 }}>
                  {strengthProfile.totalRatio} 倍自重
                </div>
              </div>
            </div>
          </div>

          {/* Four Lifts Breakdown Grid */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
            {strengthProfile.lifts.map((lift) => {
              return (
                <div
                  key={lift.exerciseKey}
                  className="card"
                  style={{ padding: '14px', border: `1px solid var(--border-color)` }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.98rem', color: 'var(--text-primary)' }}>
                        {lift.exerciseName}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        最高单组: {lift.bestWeightKg}kg · 估算 1RM: {lift.bestEstimated1RMKg}kg
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          color: lift.rankColor,
                          backgroundColor: `${lift.rankColor}20`,
                          border: `1px solid ${lift.rankColor}40`,
                        }}
                      >
                        {lift.rankLabel}
                      </span>
                      <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
                        推比 {lift.ratio}x BW
                      </div>
                    </div>
                  </div>

                  {/* Progress bar towards next tier */}
                  <div style={{ marginTop: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      <span>晋级进度</span>
                      <span>
                        {lift.diffToNextKg > 0 ? (
                          <>距离下一段位还差 <strong style={{ color: lift.rankColor }}>{lift.diffToNextKg} kg</strong> (目标 {lift.nextRankWeightKg}kg)</>
                        ) : (
                          <span style={{ color: '#10b981' }}>已达此段位顶峰！🎉</span>
                        )}
                      </span>
                    </div>

                    <div
                      style={{
                        height: '6px',
                        background: 'var(--bg-input)',
                        borderRadius: '3px',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${lift.progressPercent}%`,
                          background: lift.rankColor,
                          borderRadius: '3px',
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================
          TAB D: BODY METRICS & PHYSIQUE TRACKING (身材与围度追踪)
          ======================================================== */}
      {activeSubTab === 'body_metrics' && (
        <div>
          {/* Top Action Card */}
          <div
            className="card"
            style={{
              padding: '14px',
              marginBottom: '14px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                身体围度与体重打卡
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                已记录 {bodyMetrics.length} 次体测历史
              </div>
            </div>

            {onOpenBodyMetricsModal && (
              <button
                className="btn-primary"
                style={{ padding: '7px 12px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                onClick={onOpenBodyMetricsModal}
              >
                <Plus size={15} />
                <span>录入今日数据</span>
              </button>
            )}
          </div>

          {/* Latest Metric Hero Card */}
          {bodyMetrics.length > 0 && (
            <div
              className="card"
              style={{
                padding: '16px',
                marginBottom: '14px',
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(59, 130, 246, 0.05))',
                border: '1px solid rgba(16, 185, 129, 0.25)',
              }}
            >
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                最新体测 · {bodyMetrics[0].date}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
                <span style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--text-primary)' }}>
                  {bodyMetrics[0].weightKg != null ? bodyMetrics[0].weightKg : '--'}
                </span>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600 }}>kg</span>
                {bodyMetrics[0].bodyFatPercent != null && (
                  <span
                    style={{
                      marginLeft: '12px',
                      fontSize: '0.88rem',
                      fontWeight: 700,
                      color: '#10b981',
                      background: 'rgba(16, 185, 129, 0.15)',
                      padding: '2px 8px',
                      borderRadius: '6px',
                    }}
                  >
                    体脂率 {bodyMetrics[0].bodyFatPercent}%
                  </span>
                )}
              </div>

              {/* Circumferences Pills */}
              {bodyMetrics[0].measurements && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '12px' }}>
                  {bodyMetrics[0].measurements.armCm && (
                    <span className="step-chip" style={{ fontSize: '0.74rem' }}>
                      💪 手臂 {bodyMetrics[0].measurements.armCm}cm
                    </span>
                  )}
                  {bodyMetrics[0].measurements.chestCm && (
                    <span className="step-chip" style={{ fontSize: '0.74rem' }}>
                      🎽 胸围 {bodyMetrics[0].measurements.chestCm}cm
                    </span>
                  )}
                  {bodyMetrics[0].measurements.waistCm && (
                    <span className="step-chip" style={{ fontSize: '0.74rem' }}>
                      📏 腰围 {bodyMetrics[0].measurements.waistCm}cm
                    </span>
                  )}
                  {bodyMetrics[0].measurements.hipsCm && (
                    <span className="step-chip" style={{ fontSize: '0.74rem' }}>
                      🍑 臀围 {bodyMetrics[0].measurements.hipsCm}cm
                    </span>
                  )}
                  {bodyMetrics[0].measurements.thighCm && (
                    <span className="step-chip" style={{ fontSize: '0.74rem' }}>
                      🦵 大腿 {bodyMetrics[0].measurements.thighCm}cm
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* History List */}
          <div className="card" style={{ padding: '14px' }}>
            <div style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: '10px' }}>
              📋 历史打卡日志
            </div>

            {bodyMetrics.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-secondary)', fontSize: '0.84rem' }}>
                暂无身材记录，点击上方按钮记录你的第一次体测吧！
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {bodyMetrics.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid var(--border-color)',
                      fontSize: '0.82rem',
                    }}
                  >
                    <div>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginRight: '8px' }}>
                        {item.date}
                      </span>
                      <strong style={{ color: 'var(--text-primary)' }}>
                        {item.weightKg != null ? `${item.weightKg} kg` : '-'}
                      </strong>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                      {item.bodyFatPercent != null && <span>体脂 {item.bodyFatPercent}%</span>}
                      {item.measurements?.armCm && <span>臂 {item.measurements.armCm}cm</span>}
                      {item.measurements?.waistCm && <span>腰 {item.measurements.waistCm}cm</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
