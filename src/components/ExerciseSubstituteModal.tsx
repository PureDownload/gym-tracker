import React, { useState } from 'react';
import { X, ArrowRightLeft, Search } from 'lucide-react';
import type { Exercise } from '../types/workout';
import { EQUIPMENT_LABELS, MUSCLE_GROUP_LABELS } from '../data/presetExercises';

interface ExerciseSubstituteModalProps {
  currentExerciseName: string;
  category: string;
  allExercises: Exercise[];
  isOpen: boolean;
  onClose: () => void;
  onSubstitute: (newExercise: Exercise) => void;
}

export const ExerciseSubstituteModal: React.FC<ExerciseSubstituteModalProps> = ({
  currentExerciseName,
  category,
  allExercises,
  isOpen,
  onClose,
  onSubstitute,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  // Same category exercises (excluding current)
  const candidateExercises = allExercises.filter((ex) => {
    if (ex.name === currentExerciseName) return false;
    const matchCategory = ex.category === category;
    const matchSearch =
      !searchTerm ||
      ex.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ex.nameEn && ex.nameEn.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchCategory && matchSearch;
  });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content substitute-modal-container"
        style={{ maxWidth: '440px', maxHeight: '88vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ArrowRightLeft size={19} color="#10b981" />
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>
              器械被占？替换动作
            </h3>
          </div>
          <button className="icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ padding: '16px', overflowY: 'auto' }}>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
            正在为 <strong style={{ color: 'var(--text-primary)' }}>{currentExerciseName}</strong> 寻找同为{' '}
            <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>
              {MUSCLE_GROUP_LABELS[category as keyof typeof MUSCLE_GROUP_LABELS]?.label || category}
            </span>{' '}
            的替代训练动作（保留已配置的组数）。
          </div>

          {/* Search bar */}
          <div className="search-bar" style={{ marginBottom: '14px' }}>
            <Search size={16} />
            <input
              type="text"
              placeholder="搜索同肌群替代动作..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          {/* Candidate List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {candidateExercises.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '30px 0',
                  color: 'var(--text-secondary)',
                  fontSize: '0.85rem',
                }}
              >
                未找到相关替代动作
              </div>
            ) : (
              candidateExercises.map((ex) => (
                <div
                  key={ex.id}
                  className="substitute-item-card"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onClick={() => {
                    onSubstitute(ex);
                    onClose();
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                      {ex.name}
                    </div>
                    {ex.nameEn && (
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {ex.nameEn}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        background: 'rgba(255, 255, 255, 0.08)',
                        color: 'var(--text-secondary)',
                        padding: '3px 8px',
                        borderRadius: '4px',
                      }}
                    >
                      {EQUIPMENT_LABELS[ex.equipment]?.label || ex.equipment}
                    </span>
                    <button
                      className="btn-secondary"
                      style={{ padding: '4px 8px', fontSize: '0.75rem', borderRadius: '6px' }}
                    >
                      替换
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="modal-footer" style={{ padding: '12px 16px' }}>
          <button className="btn-secondary" style={{ width: '100%' }} onClick={onClose}>
            取消
          </button>
        </div>
      </div>
    </div>
  );
};
