import React, { useState } from 'react';
import { X, Scale, Plus, Trash2, TrendingDown, TrendingUp, Check } from 'lucide-react';
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

  if (!isSubPage && !isOpen) return null;

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

  const renderBody = () => (
    <>
      {/* Summary Hero Card */}
      {latestWeight && (
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              最新体重记录 ({validWeights[0].date})
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)' }}>
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

      {/* Input Form */}
      <form onSubmit={handleSubmit} style={{ marginBottom: '24px' }}>
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '16px',
          }}
        >
          <div style={{ fontWeight: 700, fontSize: '0.92rem', marginBottom: '12px' }}>
            📝 录入今日体测数据
          </div>

          {/* Date Picker */}
          <div style={{ marginBottom: '12px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '0.75rem',
                color: 'var(--text-secondary)',
                marginBottom: '4px',
              }}
            >
              打卡日期
            </label>
            <input
              type="date"
              className="input-field"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              style={{ width: '100%' }}
            />
          </div>

          {/* Weight & Body Fat */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: '12px',
              marginBottom: '12px',
            }}
          >
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  color: 'var(--text-secondary)',
                  marginBottom: '4px',
                }}
              >
                体重 (kg)
              </label>
              <input
                type="number"
                step="0.1"
                placeholder="如 72.5"
                className="input-field"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  color: 'var(--text-secondary)',
                  marginBottom: '4px',
                }}
              >
                体脂率 (%)
              </label>
              <input
                type="number"
                step="0.1"
                placeholder="如 15.0"
                className="input-field"
                value={bodyFatPercent}
                onChange={(e) => setBodyFatPercent(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
          </div>

          {/* Girths: Arm, Chest, Waist */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))',
              gap: '10px',
              marginBottom: '12px',
            }}
          >
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  color: 'var(--text-secondary)',
                  marginBottom: '4px',
                }}
              >
                臂围 (cm)
              </label>
              <input
                type="number"
                step="0.1"
                placeholder="充血/常态"
                className="input-field"
                value={armCm}
                onChange={(e) => setArmCm(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  color: 'var(--text-secondary)',
                  marginBottom: '4px',
                }}
              >
                胸围 (cm)
              </label>
              <input
                type="number"
                step="0.1"
                placeholder="如 102"
                className="input-field"
                value={chestCm}
                onChange={(e) => setChestCm(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  color: 'var(--text-secondary)',
                  marginBottom: '4px',
                }}
              >
                腰围 (cm)
              </label>
              <input
                type="number"
                step="0.1"
                placeholder="空腹腰围"
                className="input-field"
                value={waistCm}
                onChange={(e) => setWaistCm(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
          </div>

          {/* Optional: Hips, Thigh */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: '10px',
              marginBottom: '12px',
            }}
          >
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  color: 'var(--text-secondary)',
                  marginBottom: '4px',
                }}
              >
                臀围 (cm)
              </label>
              <input
                type="number"
                step="0.1"
                placeholder="选填"
                className="input-field"
                value={hipsCm}
                onChange={(e) => setHipsCm(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  color: 'var(--text-secondary)',
                  marginBottom: '4px',
                }}
              >
                大腿围 (cm)
              </label>
              <input
                type="number"
                step="0.1"
                placeholder="选填"
                className="input-field"
                value={thighCm}
                onChange={(e) => setThighCm(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
          </div>

          {/* Notes */}
          <div style={{ marginBottom: '14px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '0.75rem',
                color: 'var(--text-secondary)',
                marginBottom: '4px',
              }}
            >
              打卡备注 / 感受说明
            </label>
            <input
              type="text"
              placeholder="例：早起空腹称重，右臂臂围达到 38.5cm"
              className="input-field"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          <button
            type="submit"
            className="btn-primary"
            style={{
              width: '100%',
              justifyContent: 'center',
              backgroundColor: isSaved ? '#10b981' : undefined,
              borderColor: isSaved ? '#10b981' : undefined,
            }}
          >
            {isSaved ? <Check size={16} /> : <Plus size={16} />}
            <span>{isSaved ? '已保存打卡数据' : '保存打卡记录'}</span>
          </button>
        </div>
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
              padding: '24px 0',
              color: 'var(--text-secondary)',
              fontSize: '0.82rem',
              background: 'var(--bg-card)',
              borderRadius: '12px',
              border: '1px dashed var(--border-color)',
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
                  borderRadius: '10px',
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    {item.date}
                    {item.notes && (
                      <span style={{ marginLeft: '8px', opacity: 0.8 }}>· {item.notes}</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '4px' }}>
                    {item.weightKg != null && (
                      <span style={{ fontWeight: 700, fontSize: '0.94rem' }}>
                        {item.weightKg} kg
                      </span>
                    )}
                    {item.bodyFatPercent != null && (
                      <span style={{ color: 'var(--accent-primary)', fontSize: '0.88rem' }}>
                        体脂 {item.bodyFatPercent}%
                      </span>
                    )}
                    {item.measurements?.armCm && (
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        臂 {item.measurements.armCm}cm
                      </span>
                    )}
                    {item.measurements?.waistCm && (
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
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
        style={{ maxWidth: '520px', maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Scale size={20} color="var(--accent-primary)" />
            <h3 className="modal-title" style={{ fontSize: '1.05rem' }}>
              身材与围度追踪 (Body Metrics)
            </h3>
          </div>
          {onClose && (
            <button className="icon-btn" onClick={onClose}>
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
