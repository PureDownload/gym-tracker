import React, { useState } from 'react';
import {
  X,
  Scale,
  Plus,
  Trash2,
  TrendingDown,
  TrendingUp,
  Minus,
  Check,
  Calendar,
  Activity,
  FileText,
  Sparkles,
} from 'lucide-react';
import type { BodyMetricEntry } from '../types/workout';

interface BodyMetricsModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  bodyMetrics: BodyMetricEntry[];
  onSaveMetric: (entry: BodyMetricEntry) => void;
  onDeleteMetric: (id: string) => void;
  isSubPage?: boolean;
}

export const BodyMetricsModal: React.FC<BodyMetricsModalProps> = ({
  isOpen = true,
  onClose,
  bodyMetrics,
  onSaveMetric,
  onDeleteMetric,
  isSubPage = false,
}) => {
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [weightKg, setWeightKg] = useState<string>('');
  const [bodyFatPercent, setBodyFatPercent] = useState<string>('');
  const [armCm, setArmCm] = useState<string>('');
  const [chestCm, setChestCm] = useState<string>('');
  const [waistCm, setWaistCm] = useState<string>('');
  const [hipsCm, setHipsCm] = useState<string>('');
  const [thighCm, setThighCm] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [showAllHistory, setShowAllHistory] = useState<boolean>(false);

  if (!isSubPage && !isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const w = parseFloat(weightKg);
    const bf = parseFloat(bodyFatPercent);

    if (isNaN(w) && isNaN(bf) && !armCm && !chestCm && !waistCm && !hipsCm && !thighCm) {
      alert('请至少输入体重或一项身体围度数据');
      return;
    }

    const entry: BodyMetricEntry = {
      id: `metric_${date}_${Date.now()}`,
      date,
      weightKg: !isNaN(w) ? w : undefined,
      bodyFatPercent: !isNaN(bf) ? bf : undefined,
      measurements: {
        armCm: armCm ? parseFloat(armCm) : undefined,
        chestCm: chestCm ? parseFloat(chestCm) : undefined,
        waistCm: waistCm ? parseFloat(waistCm) : undefined,
        hipsCm: hipsCm ? parseFloat(hipsCm) : undefined,
        thighCm: thighCm ? parseFloat(thighCm) : undefined,
      },
      notes: notes.trim() || undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    onSaveMetric(entry);
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      setWeightKg('');
      setBodyFatPercent('');
      setArmCm('');
      setChestCm('');
      setWaistCm('');
      setHipsCm('');
      setThighCm('');
      setNotes('');
    }, 1200);
  };

  // Calculations for hero metrics
  const validWeights = bodyMetrics.filter((m) => m.weightKg != null);
  const latestEntry = bodyMetrics.length > 0 ? bodyMetrics[0] : null;
  const latestWeight = validWeights.length > 0 ? validWeights[0].weightKg : null;
  const previousWeight = validWeights.length > 1 ? validWeights[1].weightKg : null;
  const weightDelta =
    latestWeight && previousWeight ? Math.round((latestWeight - previousWeight) * 10) / 10 : null;

  const displayedHistory = showAllHistory ? bodyMetrics : bodyMetrics.slice(0, 5);

  const renderBody = () => (
    <>
      {/* 1. Hero Summary Dashboard */}
      {latestWeight != null ? (
        <div className="metric-hero-card">
          <div className="metric-hero-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Scale size={16} color="var(--accent-primary)" />
              <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                最新体测 · {validWeights[0].date}
              </span>
            </div>
            <span
              style={{
                fontSize: '0.72rem',
                color: 'var(--text-muted)',
                background: 'var(--bg-subtle)',
                padding: '2px 8px',
                borderRadius: '12px',
                border: '1px solid var(--border-subtle)',
              }}
            >
              已累积 {bodyMetrics.length} 次打卡
            </span>
          </div>

          <div className="metric-hero-val-row">
            <div>
              <span className="metric-hero-digits">{latestWeight}</span>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginLeft: '4px', fontWeight: 600 }}>
                kg
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {latestEntry?.bodyFatPercent != null && (
                <span className="metric-chip" style={{ borderColor: 'var(--accent-primary)' }}>
                  <Activity size={12} color="var(--accent-primary)" />
                  体脂 <strong>{latestEntry.bodyFatPercent}%</strong>
                </span>
              )}

              {weightDelta !== null && (
                <span
                  className={`metric-trend-pill ${
                    weightDelta > 0 ? 'increase' : weightDelta < 0 ? 'decrease' : 'neutral'
                  }`}
                >
                  {weightDelta > 0 ? (
                    <>
                      <TrendingUp size={14} /> +{weightDelta} kg
                    </>
                  ) : weightDelta < 0 ? (
                    <>
                      <TrendingDown size={14} /> {weightDelta} kg
                    </>
                  ) : (
                    <>
                      <Minus size={14} /> 持平
                    </>
                  )}
                </span>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div
          className="metric-hero-card"
          style={{ textAlign: 'center', padding: '20px 16px' }}
        >
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: 'var(--bg-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 10px',
              color: 'var(--accent-primary)',
            }}
          >
            <Sparkles size={22} />
          </div>
          <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '4px' }}>
            开启身材与形体蜕变打卡
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', maxWidth: '280px', margin: '0 auto' }}>
            持续记录体重与关键围度，见证每一次增肌减脂的切实蜕变！
          </div>
        </div>
      )}

      {/* 2. Modern Input Form */}
      <form onSubmit={handleSubmit} className="metric-form-card">
        <div className="metric-form-title">
          <Calendar size={18} color="var(--accent-primary)" />
          <span>录入今日体测数据</span>
        </div>

        {/* Date Picker */}
        <div className="metric-input-subgroup">
          <label className="metric-subgroup-label">打卡日期</label>
          <input
            type="date"
            className="input-field"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            style={{ width: '100%', fontSize: '0.85rem' }}
          />
        </div>

        {/* Core Metrics: Weight & Body Fat */}
        <div className="metric-input-subgroup">
          <label className="metric-subgroup-label">⚡ 核心体征</label>
          <div className="metric-grid-2">
            <div className="metric-field-box">
              <label className="metric-field-label">当前体重</label>
              <div className="metric-field-input-row">
                <input
                  type="number"
                  step="0.1"
                  placeholder="如 75.2"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                />
                <span className="unit">kg</span>
              </div>
            </div>

            <div className="metric-field-box">
              <label className="metric-field-label">体脂率 (选填)</label>
              <div className="metric-field-input-row">
                <input
                  type="number"
                  step="0.1"
                  placeholder="如 15.0"
                  value={bodyFatPercent}
                  onChange={(e) => setBodyFatPercent(e.target.value)}
                />
                <span className="unit">%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Circumferences */}
        <div className="metric-input-subgroup">
          <label className="metric-subgroup-label">📏 身体关键围度 (选填)</label>
          <div className="metric-grid-3">
            <div className="metric-field-box">
              <label className="metric-field-label">💪 大臂围</label>
              <div className="metric-field-input-row">
                <input
                  type="number"
                  step="0.1"
                  placeholder="臂围"
                  value={armCm}
                  onChange={(e) => setArmCm(e.target.value)}
                />
                <span className="unit">cm</span>
              </div>
            </div>

            <div className="metric-field-box">
              <label className="metric-field-label">🛡️ 胸围</label>
              <div className="metric-field-input-row">
                <input
                  type="number"
                  step="0.1"
                  placeholder="胸围"
                  value={chestCm}
                  onChange={(e) => setChestCm(e.target.value)}
                />
                <span className="unit">cm</span>
              </div>
            </div>

            <div className="metric-field-box">
              <label className="metric-field-label">⌛ 腰围</label>
              <div className="metric-field-input-row">
                <input
                  type="number"
                  step="0.1"
                  placeholder="腰围"
                  value={waistCm}
                  onChange={(e) => setWaistCm(e.target.value)}
                />
                <span className="unit">cm</span>
              </div>
            </div>

            <div className="metric-field-box">
              <label className="metric-field-label">🍑 臀围</label>
              <div className="metric-field-input-row">
                <input
                  type="number"
                  step="0.1"
                  placeholder="臀围"
                  value={hipsCm}
                  onChange={(e) => setHipsCm(e.target.value)}
                />
                <span className="unit">cm</span>
              </div>
            </div>

            <div className="metric-field-box">
              <label className="metric-field-label">🦵 大腿围</label>
              <div className="metric-field-input-row">
                <input
                  type="number"
                  step="0.1"
                  placeholder="大腿"
                  value={thighCm}
                  onChange={(e) => setThighCm(e.target.value)}
                />
                <span className="unit">cm</span>
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="metric-input-subgroup">
          <label className="metric-subgroup-label">
            <FileText size={12} />
            打卡备注 / 感受说明 (选填)
          </label>
          <input
            type="text"
            className="input-field"
            placeholder="如：空腹晨起称重、碳循环充碳后、状态极佳..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            style={{ width: '100%', fontSize: '0.82rem' }}
          />
        </div>

        <button
          type="submit"
          className="btn-primary"
          style={{
            width: '100%',
            padding: '11px',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            marginTop: '8px',
            boxShadow: '0 4px 14px var(--accent-primary-glow)',
          }}
        >
          {isSaved ? <Check size={18} /> : <Plus size={18} />}
          <span>{isSaved ? '已成功保存打卡数据！' : '保存打卡记录'}</span>
        </button>
      </form>

      {/* 3. Modern History Timeline Log */}
      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '12px',
          }}
        >
          <div style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
            📅 历史身材日志 ({bodyMetrics.length} 条)
          </div>
          {bodyMetrics.length > 5 && (
            <button
              type="button"
              className="text-btn"
              style={{ fontSize: '0.76rem', color: 'var(--accent-primary)' }}
              onClick={() => setShowAllHistory(!showAllHistory)}
            >
              {showAllHistory ? '收起展示' : `查看全部 (${bodyMetrics.length})`}
            </button>
          )}
        </div>

        {bodyMetrics.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '30px 16px',
              color: 'var(--text-secondary)',
              fontSize: '0.82rem',
              background: 'var(--bg-card)',
              borderRadius: '14px',
              border: '1px dashed var(--border-subtle)',
            }}
          >
            暂无历史打卡记录，录入第一次体测开始追踪吧！
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {displayedHistory.map((item) => (
              <div key={item.id} className="metric-history-card">
                <div className="metric-history-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Calendar size={13} color="var(--accent-primary)" />
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {item.date}
                    </span>
                    {item.notes && (
                      <span
                        style={{
                          fontSize: '0.74rem',
                          color: 'var(--text-secondary)',
                          maxWidth: '180px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          marginLeft: '4px',
                        }}
                        title={item.notes}
                      >
                        · {item.notes}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    className="icon-btn"
                    style={{
                      width: '26px',
                      height: '26px',
                      color: 'var(--text-muted)',
                      border: 'none',
                      background: 'transparent',
                    }}
                    title="删除此条记录"
                    onClick={() => {
                      if (window.confirm(`确定删除 ${item.date} 的体测记录吗？`)) {
                        onDeleteMetric(item.id);
                      }
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                {/* Metrics Chips Row */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {item.weightKg != null && (
                    <span
                      className="metric-chip"
                      style={{
                        background: 'rgba(16, 185, 129, 0.08)',
                        borderColor: 'rgba(16, 185, 129, 0.25)',
                      }}
                    >
                      <Scale size={11} color="var(--accent-primary)" />
                      <strong>{item.weightKg}</strong> kg
                    </span>
                  )}

                  {item.bodyFatPercent != null && (
                    <span
                      className="metric-chip"
                      style={{
                        background: 'rgba(56, 189, 248, 0.08)',
                        borderColor: 'rgba(56, 189, 248, 0.25)',
                      }}
                    >
                      体脂 <strong>{item.bodyFatPercent}%</strong>
                    </span>
                  )}

                  {item.measurements?.chestCm != null && (
                    <span className="metric-chip">
                      胸 <strong>{item.measurements.chestCm}</strong>cm
                    </span>
                  )}

                  {item.measurements?.armCm != null && (
                    <span className="metric-chip">
                      臂 <strong>{item.measurements.armCm}</strong>cm
                    </span>
                  )}

                  {item.measurements?.waistCm != null && (
                    <span className="metric-chip">
                      腰 <strong>{item.measurements.waistCm}</strong>cm
                    </span>
                  )}

                  {item.measurements?.hipsCm != null && (
                    <span className="metric-chip">
                      臀 <strong>{item.measurements.hipsCm}</strong>cm
                    </span>
                  )}

                  {item.measurements?.thighCm != null && (
                    <span className="metric-chip">
                      腿 <strong>{item.measurements.thighCm}</strong>cm
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );

  if (isSubPage) {
    return (
      <div className="subpage-body-container animate-fade-in" style={{ padding: '4px 0 24px' }}>
        {renderBody()}
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 110 }}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '480px', maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Scale size={20} color="var(--accent-primary)" />
            <h3 className="modal-title" style={{ fontSize: '1.05rem', fontWeight: 800 }}>
              身材与围度追踪 (Body Metrics)
            </h3>
          </div>
          {onClose && (
            <button className="icon-btn" onClick={onClose} aria-label="关闭">
              <X size={18} />
            </button>
          )}
        </div>

        <div className="modal-body smooth-scroll" style={{ padding: '16px', overflowY: 'auto' }}>
          {renderBody()}
        </div>

        <div className="modal-footer" style={{ padding: '12px 16px' }}>
          <button className="btn-secondary" style={{ width: '100%' }} onClick={onClose}>
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};
