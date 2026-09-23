import React, { useState } from 'react';
import { X, Scale, Plus, Trash2, TrendingDown, TrendingUp, Check } from 'lucide-react';
import type { BodyMetricEntry } from '../types/workout';

interface BodyMetricsModalProps {
  isOpen: boolean;
  onClose: () => void;
  bodyMetrics: BodyMetricEntry[];
  onSaveMetric: (entry: BodyMetricEntry) => void;
  onDeleteMetric: (id: string) => void;
}

export const BodyMetricsModal: React.FC<BodyMetricsModalProps> = ({
  isOpen,
  onClose,
  bodyMetrics,
  onSaveMetric,
  onDeleteMetric,
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

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const w = parseFloat(weightKg);
    const bf = parseFloat(bodyFatPercent);

    if (isNaN(w) && isNaN(bf) && !armCm && !chestCm && !waistCm) {
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
    }, 1000);
  };

  // 7-day weight moving average
  const validWeights = bodyMetrics.filter((m) => m.weightKg != null);
  const latestWeight = validWeights.length > 0 ? validWeights[0].weightKg : null;
  const previousWeight = validWeights.length > 1 ? validWeights[1].weightKg : null;
  const weightDelta =
    latestWeight && previousWeight ? Math.round((latestWeight - previousWeight) * 10) / 10 : null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content body-metrics-modal"
        style={{ maxWidth: '480px', maxHeight: '90vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Scale size={20} color="var(--accent-primary)" />
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>
              身材与围度追踪 (Body Metrics)
            </h3>
          </div>
          <button className="icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ padding: '16px', overflowY: 'auto' }}>
          {/* Summary Hero Card */}
          {latestWeight && (
            <div
              style={{
                background: 'rgba(59, 130, 246, 0.08)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                borderRadius: '12px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '16px',
              }}
            >
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  最新体重记录 ({validWeights[0].date})
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {latestWeight} <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>kg</span>
                </div>
              </div>

              {weightDelta !== null && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {weightDelta > 0 ? (
                    <span style={{ color: '#f59e0b', fontSize: '0.85rem', fontWeight: 600 }}>
                      +{weightDelta} kg <TrendingUp size={15} style={{ verticalAlign: 'middle' }} />
                    </span>
                  ) : weightDelta < 0 ? (
                    <span style={{ color: '#10b981', fontSize: '0.85rem', fontWeight: 600 }}>
                      {weightDelta} kg <TrendingDown size={15} style={{ verticalAlign: 'middle' }} />
                    </span>
                  ) : (
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>持平</span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* New Metric Entry Form */}
          <form onSubmit={handleSubmit} style={{ marginBottom: '20px' }}>
            <div style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: '10px' }}>
              📝 记录今日身材数据
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '10px',
                marginBottom: '10px',
              }}
            >
              <div>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>日期</label>
                <input
                  type="date"
                  className="input-field"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  style={{ width: '100%', marginTop: '3px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                  体重 (kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="如: 72.5"
                  className="input-field"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  style={{ width: '100%', marginTop: '3px', fontWeight: 600 }}
                />
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '8px',
                marginBottom: '10px',
              }}
            >
              <div>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                  体脂率 (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="如: 15.5"
                  className="input-field"
                  value={bodyFatPercent}
                  onChange={(e) => setBodyFatPercent(e.target.value)}
                  style={{ width: '100%', marginTop: '3px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                  手臂围 (cm)
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="如: 37.0"
                  className="input-field"
                  value={armCm}
                  onChange={(e) => setArmCm(e.target.value)}
                  style={{ width: '100%', marginTop: '3px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                  胸围 (cm)
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="如: 102.5"
                  className="input-field"
                  value={chestCm}
                  onChange={(e) => setChestCm(e.target.value)}
                  style={{ width: '100%', marginTop: '3px' }}
                />
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '8px',
                marginBottom: '10px',
              }}
            >
              <div>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                  腰围 (cm)
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="如: 78.0"
                  className="input-field"
                  value={waistCm}
                  onChange={(e) => setWaistCm(e.target.value)}
                  style={{ width: '100%', marginTop: '3px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                  臀围 (cm)
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="如: 96.0"
                  className="input-field"
                  value={hipsCm}
                  onChange={(e) => setHipsCm(e.target.value)}
                  style={{ width: '100%', marginTop: '3px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                  大腿围 (cm)
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="如: 58.0"
                  className="input-field"
                  value={thighCm}
                  onChange={(e) => setThighCm(e.target.value)}
                  style={{ width: '100%', marginTop: '3px' }}
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary"
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '10px',
              }}
            >
              {isSaved ? <Check size={16} /> : <Plus size={16} />}
              <span>{isSaved ? '已保存打卡数据' : '保存打卡记录'}</span>
            </button>
          </form>

          {/* History List */}
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: '10px' }}>
              📅 历史身材日志 ({bodyMetrics.length} 条)
            </div>

            {bodyMetrics.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '20px 0',
                  color: 'var(--text-secondary)',
                  fontSize: '0.82rem',
                }}
              >
                暂无身体记录，打卡一次开始追踪你的形体蜕变吧！
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {bodyMetrics.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      padding: '10px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        {item.date}
                      </div>
                      <div style={{ display: 'flex', gap: '10px', marginTop: '2px' }}>
                        {item.weightKg != null && (
                          <span style={{ fontWeight: 700, fontSize: '0.92rem' }}>
                            {item.weightKg} kg
                          </span>
                        )}
                        {item.bodyFatPercent != null && (
                          <span style={{ color: 'var(--accent-primary)', fontSize: '0.85rem' }}>
                            体脂 {item.bodyFatPercent}%
                          </span>
                        )}
                        {item.measurements?.armCm && (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            臂 {item.measurements.armCm}cm
                          </span>
                        )}
                        {item.measurements?.waistCm && (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            腰 {item.measurements.waistCm}cm
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      className="icon-btn"
                      style={{ color: '#ef4444', width: '28px', height: '28px' }}
                      title="删除记录"
                      onClick={() => onDeleteMetric(item.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
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
