import React from 'react';
import { CalendarCheck, CheckCircle2, Trash2, ArrowRight } from 'lucide-react';
import type { WorkoutDraft } from '../types/workout';

interface UnsettledWorkoutModalProps {
  isOpen: boolean;
  draft: WorkoutDraft | null;
  onRecoverAsHistorical: (draft: WorkoutDraft) => void;
  onContinueWorkout: () => void;
  onDiscardDraft: () => void;
  onClose: () => void;
}

export const UnsettledWorkoutModal: React.FC<UnsettledWorkoutModalProps> = ({
  isOpen,
  draft,
  onRecoverAsHistorical,
  onContinueWorkout,
  onDiscardDraft,
  onClose,
}) => {
  if (!isOpen || !draft) return null;

  const totalSets = draft.exercises.reduce((acc, ex) => acc + (ex.sets?.length || 0), 0);
  const completedSets = draft.exercises.reduce(
    (acc, ex) => acc + (ex.sets?.filter((s) => s.isCompleted)?.length || 0),
    0
  );
  const durationMin = Math.max(1, Math.round((draft.elapsedSeconds || 0) / 60));

  // Determine relative date label
  const today = new Date().toISOString().split('T')[0];
  const draftDate = draft.date;
  let relativeDateLabel = draftDate;
  if (draftDate === today) {
    relativeDateLabel = '今日早前';
  } else {
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    if (draftDate === yesterday) {
      relativeDateLabel = `昨日 (${draftDate})`;
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 60 }}>
      <div
        className="modal-content animate-fade-in"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '420px', padding: '20px' }}
      >
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(6, 182, 212, 0.2))',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px auto',
              color: 'var(--accent-secondary)',
              boxShadow: '0 0 20px rgba(16, 185, 129, 0.25)',
            }}
          >
            <CalendarCheck size={28} />
          </div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>
            检测到未结算的训练记录
          </h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
            您上次离开时未点击「完成并保存」，系统已为您完好保存所有录入组数！
          </p>
        </div>

        {/* Workout Snapshot Card */}
        <div
          style={{
            background: 'var(--bg-elevated)',
            borderRadius: '12px',
            border: '1px solid var(--border-medium)',
            padding: '14px',
            marginBottom: '18px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '10px',
              borderBottom: '1px solid var(--border-subtle)',
              paddingBottom: '8px',
            }}
          >
            <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--accent-primary)' }}>
              {draft.title || '训练日'}
            </span>
            <span
              style={{
                fontSize: '0.74rem',
                padding: '2px 8px',
                borderRadius: '6px',
                background: 'rgba(59, 130, 246, 0.1)',
                color: 'var(--accent-primary)',
                fontWeight: 600,
              }}
            >
              {relativeDateLabel}
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '8px',
              marginBottom: '10px',
              textAlign: 'center',
            }}
          >
            <div style={{ padding: '6px', background: 'var(--bg-surface)', borderRadius: '8px' }}>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--accent-secondary)' }}>
                {completedSets}/{totalSets}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>打卡组数</div>
            </div>

            <div style={{ padding: '6px', background: 'var(--bg-surface)', borderRadius: '8px' }}>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                {durationMin} 分钟
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>训练用时</div>
            </div>

            <div style={{ padding: '6px', background: 'var(--bg-surface)', borderRadius: '8px' }}>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--accent-purple)' }}>
                {draft.exercises.length} 个
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>涉及动作</div>
            </div>
          </div>

          {/* Exercise list excerpt */}
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            <div style={{ fontWeight: 600, marginBottom: '4px', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              包含动作：
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {draft.exercises.map((ex, idx) => {
                const exCompleted = ex.sets?.filter((s) => s.isCompleted)?.length || 0;
                return (
                  <span
                    key={idx}
                    style={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '0.72rem',
                    }}
                  >
                    {ex.exerciseName} ({exCompleted}/{ex.sets?.length || 0}组)
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            type="button"
            className="btn-primary"
            style={{
              padding: '12px',
              fontSize: '0.92rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)',
            }}
            onClick={() => onRecoverAsHistorical(draft)}
          >
            <CheckCircle2 size={18} />
            <span>🌟 一键补录为该日记录 (推荐)</span>
          </button>

          <button
            type="button"
            className="btn-secondary"
            style={{
              padding: '11px',
              fontSize: '0.86rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
            onClick={onContinueWorkout}
          >
            <span>载入记录台继续编辑 / 调整</span>
            <ArrowRight size={15} />
          </button>

          <button
            type="button"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: '0.78rem',
              padding: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              marginTop: '4px',
            }}
            onClick={() => {
              if (window.confirm('确定放弃该未结算的训练草稿吗？此操作不可撤销。')) {
                onDiscardDraft();
              }
            }}
          >
            <Trash2 size={13} />
            <span>放弃并清空此草稿</span>
          </button>
        </div>
      </div>
    </div>
  );
};
