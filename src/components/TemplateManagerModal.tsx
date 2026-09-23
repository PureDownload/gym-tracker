import React, { useState } from 'react';
import { X, Play, Trash2, Layers, Plus } from 'lucide-react';
import type { WorkoutTemplate } from '../types/workout';

interface TemplateManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  templates: WorkoutTemplate[];
  onApplyTemplate: (template: WorkoutTemplate) => void;
  onDeleteTemplate: (id: string) => void;
  onSaveCurrentAsTemplate?: () => void;
}

const CATEGORY_TABS = [
  { id: 'all', label: '全部' },
  { id: 'ppl', label: 'PPL三分化' },
  { id: 'upper_lower', label: '上下肢分化' },
  { id: 'arnold', label: '阿诺德分化' },
  { id: 'custom', label: '我的自定义' },
];

export const TemplateManagerModal: React.FC<TemplateManagerModalProps> = ({
  isOpen,
  onClose,
  templates,
  onApplyTemplate,
  onDeleteTemplate,
  onSaveCurrentAsTemplate,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedTemplateId, setExpandedTemplateId] = useState<string | null>(null);

  if (!isOpen) return null;

  const filtered = templates.filter((t) => {
    if (selectedCategory === 'all') return true;
    if (selectedCategory === 'custom') return !t.isPreset || t.category === 'custom';
    return t.category === selectedCategory;
  });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content template-modal-container"
        style={{ maxWidth: '520px', maxHeight: '90vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={20} color="var(--accent-primary)" />
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>
              训练计划与模版库
            </h3>
          </div>
          <button className="icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ padding: '16px', overflowY: 'auto' }}>
          {/* Action Row */}
          {onSaveCurrentAsTemplate && (
            <div style={{ marginBottom: '14px' }}>
              <button
                className="btn-secondary"
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '10px',
                  border: '1px dashed var(--accent-primary)',
                  color: 'var(--accent-primary)',
                  background: 'rgba(59, 130, 246, 0.06)',
                }}
                onClick={() => {
                  onSaveCurrentAsTemplate();
                  onClose();
                }}
              >
                <Plus size={16} />
                <span>将当前记录页动作存为新模版</span>
              </button>
            </div>
          )}

          {/* Category Filter Pills */}
          <div
            style={{
              display: 'flex',
              gap: '6px',
              overflowX: 'auto',
              paddingBottom: '8px',
              marginBottom: '14px',
            }}
          >
            {CATEGORY_TABS.map((tab) => (
              <button
                key={tab.id}
                className={`step-chip ${selectedCategory === tab.id ? 'active' : ''}`}
                onClick={() => setSelectedCategory(tab.id)}
                style={{ whiteSpace: 'nowrap', padding: '6px 12px', fontSize: '0.78rem' }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Template Cards List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filtered.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '30px 0',
                  color: 'var(--text-secondary)',
                  fontSize: '0.85rem',
                }}
              >
                暂无此类别的训练模版
              </div>
            ) : (
              filtered.map((t) => {
                const isExpanded = expandedTemplateId === t.id;
                return (
                  <div
                    key={t.id}
                    className="template-card"
                    style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '12px',
                      padding: '14px',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1, marginRight: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.98rem', color: 'var(--text-primary)' }}>
                            {t.name}
                          </span>
                          {t.isPreset ? (
                            <span
                              style={{
                                fontSize: '0.68rem',
                                background: 'rgba(59, 130, 246, 0.15)',
                                color: '#38bdf8',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontWeight: 600,
                              }}
                            >
                              官方经典
                            </span>
                          ) : (
                            <span
                              style={{
                                fontSize: '0.68rem',
                                background: 'rgba(16, 185, 129, 0.15)',
                                color: '#10b981',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontWeight: 600,
                              }}
                            >
                              我的自创
                            </span>
                          )}
                        </div>

                        {t.description && (
                          <div
                            style={{
                              fontSize: '0.78rem',
                              color: 'var(--text-secondary)',
                              marginBottom: '8px',
                              lineHeight: 1.4,
                            }}
                          >
                            {t.description}
                          </div>
                        )}

                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          包含 {t.exercises.length} 个动作 · 共{' '}
                          {t.exercises.reduce((sum, e) => sum + e.defaultSets.length, 0)} 组
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {!t.isPreset && (
                          <button
                            className="icon-btn"
                            style={{ width: '32px', height: '32px', color: '#ef4444' }}
                            title="删除自定义模版"
                            onClick={() => onDeleteTemplate(t.id)}
                          >
                            <Trash2 size={15} />
                          </button>
                        )}

                        <button
                          className="btn-primary"
                          style={{
                            padding: '6px 12px',
                            fontSize: '0.78rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                          onClick={() => {
                            onApplyTemplate(t);
                            onClose();
                          }}
                        >
                          <Play size={13} fill="currentColor" />
                          <span>一键开练</span>
                        </button>
                      </div>
                    </div>

                    {/* Expand/Collapse Exercises Preview */}
                    <div style={{ marginTop: '10px', borderTop: '1px solid var(--border-color)', paddingTop: '8px' }}>
                      <button
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--accent-primary)',
                          fontSize: '0.72rem',
                          cursor: 'pointer',
                          padding: 0,
                        }}
                        onClick={() => setExpandedTemplateId(isExpanded ? null : t.id)}
                      >
                        {isExpanded ? '▲ 收起动作明细' : '▼ 展开查看动作与做组'}
                      </button>

                      {isExpanded && (
                        <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {t.exercises.map((ex, idx) => (
                            <div
                              key={idx}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                fontSize: '0.76rem',
                                background: 'rgba(255, 255, 255, 0.03)',
                                padding: '6px 8px',
                                borderRadius: '6px',
                              }}
                            >
                              <span style={{ fontWeight: 600 }}>{ex.exerciseName}</span>
                              <span style={{ color: 'var(--text-secondary)' }}>
                                {ex.defaultSets.length} 组预设
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
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
