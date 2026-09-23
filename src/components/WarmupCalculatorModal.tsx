import React, { useState, useMemo } from 'react';
import { X, Flame, Plus, Check } from 'lucide-react';
import type { WorkoutSet } from '../types/workout';

interface WarmupCalculatorModalProps {
  exerciseName: string;
  initialWeight?: number;
  isOpen: boolean;
  onClose: () => void;
  onApplyWarmupSets: (sets: WorkoutSet[]) => void;
}

export const WarmupCalculatorModal: React.FC<WarmupCalculatorModalProps> = ({
  exerciseName,
  initialWeight = 80,
  isOpen,
  onClose,
  onApplyWarmupSets,
}) => {
  const [targetWeight, setTargetWeight] = useState<number>(initialWeight > 0 ? initialWeight : 80);
  const [barWeight, setBarWeight] = useState<number>(20); // 20kg standard, 15kg women, 10kg EZ
  const [isCopied, setIsCopied] = useState<boolean>(false);

  // Round weight to nearest 2.5kg plate interval
  const roundToStep = (w: number) => Math.max(barWeight, Math.round(w / 2.5) * 2.5);

  const warmupLadder = useMemo(() => {
    const target = Math.max(targetWeight, barWeight);
    const sets: Array<{
      step: string;
      percentage: string;
      weight: number;
      reps: number;
      purpose: string;
      restSecs: number;
    }> = [];

    // Step 1: Empty Bar / Light
    sets.push({
      step: '热身组 1',
      percentage: `${barWeight}kg 空杆`,
      weight: barWeight,
      reps: 10,
      purpose: '关节润滑与本体感觉激活',
      restSecs: 45,
    });

    if (target > barWeight + 15) {
      // Step 2: ~50%
      const w50 = roundToStep(target * 0.5);
      if (w50 > barWeight && w50 < target) {
        sets.push({
          step: '热身组 2',
          percentage: '50% 负荷',
          weight: w50,
          reps: 5,
          purpose: '建立动作轨迹与募集肌纤维',
          restSecs: 60,
        });
      }

      // Step 3: ~70%
      const w70 = roundToStep(target * 0.7);
      if (w70 > w50 && w70 < target) {
        sets.push({
          step: '热身组 3',
          percentage: '70% 负荷',
          weight: w70,
          reps: 3,
          purpose: '向大重量过渡，避免疲劳积累',
          restSecs: 90,
        });
      }

      // Step 4: ~85%
      const w85 = roundToStep(target * 0.85);
      if (w85 > w70 && w85 < target) {
        sets.push({
          step: '热身组 4',
          percentage: '85% 负荷',
          weight: w85,
          reps: 1,
          purpose: '中枢神经适应极限负重唤醒',
          restSecs: 120,
        });
      }
    }

    return sets;
  }, [targetWeight, barWeight]);

  if (!isOpen) return null;

  const handleApply = () => {
    const newSets: WorkoutSet[] = warmupLadder.map((step, idx) => ({
      id: `warmup_${Date.now()}_${idx}`,
      setNumber: idx + 1,
      weightKg: step.weight,
      reps: step.reps,
      type: 'warmup',
      isCompleted: false,
    }));
    onApplyWarmupSets(newSets);
    setIsCopied(true);
    setTimeout(() => {
      setIsCopied(false);
      onClose();
    }, 400);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content warmup-modal-container"
        style={{ maxWidth: '440px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Flame size={20} color="#f59e0b" />
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>
              阶梯热身组计算器
            </h3>
          </div>
          <button className="icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ padding: '16px' }}>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>
            针对 <strong style={{ color: 'var(--text-primary)' }}>{exerciseName}</strong> 科学计算阶梯热身方案。充分唤醒神经与肌纤维，杜绝冷启动拉伤！
          </div>

          {/* Controls: Target weight & bar */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
              marginBottom: '16px',
            }}
          >
            <div className="input-group">
              <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                正式组目标重量 (kg)
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                <input
                  type="number"
                  step="2.5"
                  className="input-field"
                  value={targetWeight}
                  onChange={(e) => setTargetWeight(parseFloat(e.target.value) || 0)}
                  style={{ fontWeight: 700, fontSize: '1.05rem' }}
                />
              </div>
            </div>

            <div className="input-group">
              <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                空杆重量规格
              </label>
              <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                {[20, 15, 10].map((w) => (
                  <button
                    key={w}
                    className={`step-chip ${barWeight === w ? 'active' : ''}`}
                    onClick={() => setBarWeight(w)}
                    style={{ flex: 1, padding: '6px 0', textAlign: 'center', fontSize: '0.78rem' }}
                  >
                    {w}kg
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Increment Chips */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
            {[60, 80, 100, 120, 140].map((w) => (
              <button
                key={w}
                className="step-chip"
                onClick={() => setTargetWeight(w)}
                style={{
                  flex: 1,
                  padding: '4px 0',
                  fontSize: '0.72rem',
                  background: targetWeight === w ? 'var(--accent-primary)' : undefined,
                  color: targetWeight === w ? '#fff' : undefined,
                }}
              >
                {w}kg
              </button>
            ))}
          </div>

          {/* Generated Ladder Table */}
          <div className="warmup-ladder-table">
            {warmupLadder.map((item, idx) => (
              <div key={idx} className="warmup-step-row">
                <div className="warmup-step-left">
                  <span className="warmup-step-tag">{item.step}</span>
                  <div className="warmup-step-spec">
                    <span className="warmup-weight">{item.weight} kg</span>
                    <span className="warmup-reps">× {item.reps} 次</span>
                    <span className="warmup-percent">({item.percentage})</span>
                  </div>
                </div>
                <div className="warmup-step-right">
                  <span className="warmup-purpose">{item.purpose}</span>
                  <span className="warmup-rest">休息 ~{item.restSecs}s</span>
                </div>
              </div>
            ))}
          </div>

          {/* Target Set Preview */}
          <div className="warmup-target-preview">
            <span style={{ color: '#10b981', fontWeight: 700 }}>🎯 紧接着正式组：</span>
            <span>{targetWeight} kg 目标做组</span>
          </div>
        </div>

        <div className="modal-footer" style={{ padding: '12px 16px', display: 'flex', gap: '10px' }}>
          <button className="btn-secondary" style={{ flex: 1 }} onClick={onClose}>
            取消
          </button>
          <button
            className="btn-primary"
            style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            onClick={handleApply}
          >
            {isCopied ? <Check size={16} /> : <Plus size={16} />}
            <span>一键插入热身组</span>
          </button>
        </div>
      </div>
    </div>
  );
};
