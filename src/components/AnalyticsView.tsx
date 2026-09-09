import React, { useState } from 'react';
import { TrendingUp, BarChart2, Flame } from 'lucide-react';
import type { WorkoutSession, Exercise } from '../types/workout';
import { PRESET_EXERCISES, MUSCLE_GROUP_LABELS } from '../data/presetExercises';
import { analyticsService } from '../services/analytics';

interface AnalyticsViewProps {
  workouts: WorkoutSession[];
  customExercises: Exercise[];
}

type StrengthMetric = 'maxWeight' | 'estimated1RM' | 'totalVolume';
type CardioMetric = 'durationMinutes' | 'distanceKm' | 'caloriesKcal';

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  workouts,
  customExercises,
}) => {
  const allExercises = [...PRESET_EXERCISES, ...customExercises];

  // Exercises that have at least 1 record
  const exercisesWithHistory = allExercises.filter((ex) => {
    return workouts.some((w) => w.exercises.some((e) => e.exerciseId === ex.id));
  });

  const [selectedExerciseId, setSelectedExerciseId] = useState<string>(() => {
    return exercisesWithHistory.length > 0 ? exercisesWithHistory[0].id : PRESET_EXERCISES[0].id;
  });

  const selectedExercise = allExercises.find((e) => e.id === selectedExerciseId) || PRESET_EXERCISES[0];
  const isCardio = selectedExercise.category === 'cardio' || selectedExercise.isCardio;

  const [strengthMetric, setStrengthMetric] = useState<StrengthMetric>('estimated1RM');
  const [cardioMetric, setCardioMetric] = useState<CardioMetric>('durationMinutes');
  const [activeHoverPoint, setActiveHoverPoint] = useState<any | null>(null);

  // Progressive Overload Analysis
  const analysis = analyticsService.analyzeProgressiveOverload(
    selectedExercise.id,
    selectedExercise.name,
    selectedExercise.category,
    workouts
  );

  const historyPoints = analysis.historyPoints;

  // Muscle group breakdown
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

  const strokeColor = isCardio ? '#f97316' : '#10b981';

  return (
    <div className="animate-fade-in">
      {/* Exercise Dropdown Selector */}
      <div className="card" style={{ marginBottom: '14px' }}>
        <label style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
          选择要分析的项目（支持力量动作与有氧运动）
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span
            className="badge"
            style={{
              backgroundColor: analysis.statusColor + '22',
              color: analysis.statusColor,
              border: `1px solid ${analysis.statusColor}`,
            }}
          >
            {analysis.statusBadge}
          </span>

          {!isCardio && analysis.status === 'increase' && (
            <span style={{ fontSize: '0.78rem', color: 'var(--accent-primary)', fontWeight: 700 }}>
              建议目标: {analysis.targetNextWeight} kg
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
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>最大重量变化</div>
              <div
                style={{
                  fontSize: '0.95rem',
                  fontWeight: 800,
                  color: analysis.weightDelta > 0 ? 'var(--accent-primary)' : analysis.weightDelta < 0 ? 'var(--accent-danger)' : 'var(--text-secondary)',
                }}
              >
                {analysis.weightDelta > 0 ? `+${analysis.weightDelta}` : analysis.weightDelta} kg
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>1RM 走势</div>
              <div
                style={{
                  fontSize: '0.95rem',
                  fontWeight: 800,
                  color: analysis.rmDelta > 0 ? 'var(--accent-primary)' : analysis.rmDelta < 0 ? 'var(--accent-danger)' : 'var(--text-secondary)',
                }}
              >
                {analysis.rmDelta > 0 ? `+${analysis.rmDelta}` : analysis.rmDelta} kg
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>总容量波动</div>
              <div
                style={{
                  fontSize: '0.95rem',
                  fontWeight: 800,
                  color: analysis.volumeDeltaPercent > 0 ? 'var(--accent-primary)' : analysis.volumeDeltaPercent < 0 ? 'var(--accent-danger)' : 'var(--text-secondary)',
                }}
              >
                {analysis.volumeDeltaPercent > 0 ? `+${analysis.volumeDeltaPercent}` : analysis.volumeDeltaPercent}%
              </div>
            </div>
          </div>
        )}

        {/* Delta Key Metrics for Cardio */}
        {isCardio && analysis.previousDurationMinutes !== undefined && (
          <div
            style={{
              marginTop: '12px',
              paddingTop: '10px',
              borderTop: '1px solid var(--border-subtle)',
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              textAlign: 'center',
              gap: '6px',
            }}
          >
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>时长对比</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {analysis.currentDurationMinutes}分 (前次 {analysis.previousDurationMinutes}分)
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>距离对比</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {analysis.currentDistanceKm}km (前次 {analysis.previousDistanceKm || 0}km)
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
                      stroke="rgba(255, 255, 255, 0.08)"
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
                    fill="#111726"
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
                  {activeHoverPoint.value} {isCardio ? (cardioMetric === 'distanceKm' ? 'km' : cardioMetric === 'caloriesKcal' ? 'kcal' : '分') : (strengthMetric === 'totalVolume' ? 'kg容量' : 'kg')}
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
            部位训练负荷分布
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            总力量负荷: {(totalVolumeAll / 1000).toFixed(1)} 吨
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {(Object.keys(muscleDistribution) as Array<keyof typeof muscleDistribution>).map((group) => {
            const data = muscleDistribution[group];
            const info = MUSCLE_GROUP_LABELS[group];
            const pct = totalVolumeAll > 0 ? Math.round((data.volume / totalVolumeAll) * 100) : 0;

            return (
              <div key={group}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>{info.icon}</span>
                    <span style={{ fontWeight: 600 }}>{info.label}</span>
                  </span>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    {data.count} 组/段 {group !== 'cardio' ? `· ${pct}%` : ''}
                  </span>
                </div>

                <div
                  style={{
                    height: '7px',
                    borderRadius: '4px',
                    background: 'var(--bg-input)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${group === 'cardio' ? Math.min(100, data.count * 15) : pct}%`,
                      backgroundColor: info.color,
                      borderRadius: '4px',
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
  );
};
