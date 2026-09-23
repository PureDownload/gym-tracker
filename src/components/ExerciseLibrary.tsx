import React, { useState } from 'react';
import { Plus, Search, Trash2, Award, Pin, ChevronDown, Lightbulb } from 'lucide-react';
import type { Exercise, MuscleGroup, EquipmentType, WorkoutSession } from '../types/workout';
import { PRESET_EXERCISES, MUSCLE_GROUP_LABELS, EQUIPMENT_LABELS } from '../data/presetExercises';
import { analyticsService } from '../services/analytics';

interface ExerciseLibraryProps {
  customExercises: Exercise[];
  workouts: WorkoutSession[];
  pinnedExerciseIds: string[];
  onTogglePinExercise: (exerciseId: string) => void;
  onAddCustomExercise: (exercise: Exercise) => void;
  onDeleteCustomExercise: (id: string) => void;
  onSelectExerciseToLog?: (exercise: Exercise) => void;
}

export const ExerciseLibrary: React.FC<ExerciseLibraryProps> = ({
  customExercises,
  workouts,
  pinnedExerciseIds,
  onTogglePinExercise,
  onAddCustomExercise,
  onDeleteCustomExercise,
  onSelectExerciseToLog,
}) => {
  const allExercises = [...PRESET_EXERCISES, ...customExercises];

  const [selectedCategory, setSelectedCategory] = useState<MuscleGroup | 'all'>('all');
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedExerciseId, setExpandedExerciseId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);

  // New custom exercise state
  const [newName, setNewName] = useState<string>('');
  const [newCategory, setNewCategory] = useState<MuscleGroup>('chest');
  const [newEquipment, setNewEquipment] = useState<EquipmentType>('barbell');
  const [newDescription, setNewDescription] = useState<string>('');

  const toggleExpandExercise = (id: string) => {
    setExpandedExerciseId((prev) => (prev === id ? null : id));
  };

  const filteredExercises = allExercises
    .filter((ex) => {
      const matchesCat = selectedCategory === 'all' || ex.category === selectedCategory;
      const matchesEq = selectedEquipment === 'all' || ex.equipment === selectedEquipment;

      const query = searchQuery.trim().toLowerCase();
      const eqLabel = EQUIPMENT_LABELS[ex.equipment]?.label || '';
      const catLabel = MUSCLE_GROUP_LABELS[ex.category]?.label || '';

      const matchesSearch =
        query === '' ||
        ex.name.toLowerCase().includes(query) ||
        (ex.nameEn && ex.nameEn.toLowerCase().includes(query)) ||
        (ex.description && ex.description.toLowerCase().includes(query)) ||
        eqLabel.toLowerCase().includes(query) ||
        catLabel.toLowerCase().includes(query);

      return matchesCat && matchesEq && matchesSearch;
    })
    .sort((a, b) => {
      const aPinned = pinnedExerciseIds.includes(a.id);
      const bPinned = pinnedExerciseIds.includes(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      return 0;
    });

  const getBestRecord = (exerciseId: string) => {
    const history = analyticsService.getExerciseHistory(exerciseId, workouts);
    if (history.length === 0) return null;
    let maxWeight = 0;
    let max1RM = 0;
    for (const h of history) {
      if (h.maxWeight > maxWeight) maxWeight = h.maxWeight;
      if (h.estimated1RM > max1RM) max1RM = h.estimated1RM;
    }
    return { maxWeight, max1RM };
  };

  const handleCreateExercise = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const newEx: Exercise = {
      id: 'custom_' + Date.now(),
      name: newName.trim(),
      category: newCategory,
      equipment: newEquipment,
      description: newDescription.trim() || undefined,
      isCustom: true,
    };

    onAddCustomExercise(newEx);
    setNewName('');
    setNewDescription('');
    setIsCreateModalOpen(false);
  };

  return (
    <div className="animate-fade-in">
      {/* Sticky Top Header: Search & Category Filters */}
      <div className="exercise-library-sticky-header">
        {/* Top Action & Search */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search
              size={15}
              color="var(--text-muted)"
              style={{ position: 'absolute', left: '10px', top: '10px' }}
            />
            <input
              type="text"
              placeholder="搜索动作名称、英文、肌群(如上胸/二头/深蹲)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '8px 10px 8px 32px', fontSize: '0.84rem' }}
            />
          </div>

          <button
            className="btn-primary"
            style={{ width: 'auto', padding: '8px 12px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
            onClick={() => setIsCreateModalOpen(true)}
          >
            <Plus size={16} />
            自定义动作
          </button>
        </div>

        {/* Category Filter Pills */}
        <div className="category-scroll-container" style={{ marginBottom: '6px', paddingBottom: '4px' }}>
          <button
            className={`pill-btn ${selectedCategory === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('all')}
            style={{ padding: '4px 10px', fontSize: '0.76rem' }}
          >
            全部部位 ({allExercises.length})
          </button>
          {(Object.keys(MUSCLE_GROUP_LABELS) as MuscleGroup[]).map((cat) => {
            const info = MUSCLE_GROUP_LABELS[cat];
            const count = allExercises.filter((e) => e.category === cat).length;
            return (
              <button
                key={cat}
                className={`pill-btn ${selectedCategory === cat ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
                style={{ padding: '4px 10px', fontSize: '0.76rem' }}
              >
                <span>{info.icon}</span>
                <span>{info.label}</span>
                <span style={{ fontSize: '0.66rem', opacity: 0.7 }}>({count})</span>
              </button>
            );
          })}
        </div>

        {/* Equipment Filter Pills */}
        <div className="category-scroll-container" style={{ marginBottom: '6px', paddingBottom: '4px' }}>
          <button
            className={`pill-btn ${selectedEquipment === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedEquipment('all')}
            style={{ fontSize: '0.72rem', padding: '3px 8px' }}
          >
            全部器械
          </button>
          {(Object.keys(EQUIPMENT_LABELS) as EquipmentType[]).map((eq) => {
            const info = EQUIPMENT_LABELS[eq];
            const count = allExercises.filter(
              (e) => (selectedCategory === 'all' || e.category === selectedCategory) && e.equipment === eq
            ).length;
            if (count === 0 && selectedCategory !== 'all') return null;
            return (
              <button
                key={eq}
                className={`pill-btn ${selectedEquipment === eq ? 'active' : ''}`}
                onClick={() => setSelectedEquipment(eq)}
                style={{ fontSize: '0.72rem', padding: '3px 8px' }}
              >
                <span>{info.icon}</span>
                <span>{info.label}</span>
                <span style={{ fontSize: '0.64rem', opacity: 0.7 }}>({count})</span>
              </button>
            );
          })}
        </div>

        {/* Exercise Count & Summary */}
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', padding: '2px 2px 0 2px' }}>
          <span>共找到 {filteredExercises.length} 个动作 (点击展开详情)</span>
          {(selectedCategory !== 'all' || selectedEquipment !== 'all' || searchQuery) && (
            <span
              style={{ color: 'var(--accent-primary)', cursor: 'pointer', fontWeight: 600 }}
              onClick={() => {
                setSelectedCategory('all');
                setSelectedEquipment('all');
                setSearchQuery('');
              }}
            >
              重置筛选
            </span>
          )}
        </div>
      </div>

      {/* Exercise Cards - Compact & Expandable */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {filteredExercises.map((ex) => {
          const catInfo = MUSCLE_GROUP_LABELS[ex.category] || { label: '其他', icon: '⚡' };
          const eqInfo = EQUIPMENT_LABELS[ex.equipment] || { label: ex.equipment, icon: '⚙️' };
          const best = getBestRecord(ex.id);
          const isPinned = pinnedExerciseIds.includes(ex.id);
          const isExpanded = expandedExerciseId === ex.id;

          return (
            <div
              key={ex.id}
              className={`exercise-compact-card ${isExpanded ? 'expanded' : ''} ${isPinned ? 'pinned' : ''}`}
              onClick={() => toggleExpandExercise(ex.id)}
            >
              {/* Compact Main Row */}
              <div className="exercise-compact-main">
                <div className="exercise-compact-left">
                  <div className="exercise-icon-avatar">{catInfo.icon}</div>
                  <div className="exercise-compact-info">
                    <div className="exercise-compact-name-row">
                      <span className="exercise-compact-name">{ex.name}</span>
                      {isPinned && (
                        <span
                          style={{
                            fontSize: '0.62rem',
                            padding: '1px 4px',
                            borderRadius: '3px',
                            backgroundColor: 'rgba(245, 158, 11, 0.2)',
                            color: 'var(--accent-warning)',
                            border: '1px solid rgba(245, 158, 11, 0.4)',
                            fontWeight: 700,
                          }}
                        >
                          置顶
                        </span>
                      )}
                      {ex.isCustom && (
                        <span
                          style={{
                            fontSize: '0.62rem',
                            padding: '1px 5px',
                            borderRadius: '3px',
                            backgroundColor: 'rgba(168, 85, 247, 0.2)',
                            color: 'var(--accent-purple)',
                            border: '1px solid var(--accent-purple)',
                          }}
                        >
                          自定义
                        </span>
                      )}
                      {ex.isCardio && (
                        <span
                          style={{
                            fontSize: '0.62rem',
                            padding: '1px 5px',
                            borderRadius: '3px',
                            backgroundColor: 'rgba(249, 115, 22, 0.15)',
                            color: 'var(--muscle-cardio)',
                          }}
                        >
                          有氧
                        </span>
                      )}
                    </div>

                    <div className="exercise-compact-sub">
                      <span>{catInfo.label}</span>
                      <span>·</span>
                      <span>{eqInfo.icon} {eqInfo.label}</span>
                      {ex.nameEn && (
                        <span style={{ opacity: 0.6, maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          · {ex.nameEn}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="exercise-compact-right">
                  {best && (
                    <div className="exercise-record-badge-micro" title={`历史最佳: ${best.maxWeight}kg / 估算1RM: ${best.max1RM}kg`}>
                      {best.maxWeight}k
                    </div>
                  )}

                  {onSelectExerciseToLog && (
                    <button
                      type="button"
                      className="exercise-quick-add-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectExerciseToLog(ex);
                      }}
                      title="将此动作加入今日训练计划"
                    >
                      <Plus size={13} />
                      <span>加入</span>
                    </button>
                  )}

                  <div className={`exercise-chevron-toggle ${isExpanded ? 'rotated' : ''}`}>
                    <ChevronDown size={16} />
                  </div>
                </div>
              </div>

              {/* Expandable Details Accordion */}
              {isExpanded && (
                <div
                  className="exercise-card-expand-body animate-fade-in"
                  onClick={(e) => e.stopPropagation()}
                >
                  {ex.nameEn && (
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                      <strong>英文原名:</strong> <span style={{ color: 'var(--text-secondary)' }}>{ex.nameEn}</span>
                    </div>
                  )}

                  {ex.description ? (
                    <div className="exercise-instruction-box">
                      <div className="instruction-header">
                        <Lightbulb size={14} />
                        <span>动作要领与发力指导</span>
                      </div>
                      <p className="instruction-text">{ex.description}</p>
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      暂无动作文字说明。训练时注意收紧核心，保持轨迹顺畅。
                    </div>
                  )}

                  {best && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 10px',
                        background: 'rgba(59, 130, 246, 0.08)',
                        border: '1px solid rgba(59, 130, 246, 0.2)',
                        borderRadius: '8px',
                        fontSize: '0.76rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--accent-primary)', fontWeight: 700 }}>
                        <Award size={14} />
                        <span>个人历史最佳纪录 (PR)</span>
                      </div>
                      <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>
                        最大重量 {best.maxWeight} kg · 估算 1RM {best.max1RM} kg
                      </div>
                    </div>
                  )}

                  {/* Actions in expanded state */}
                  <div className="exercise-card-actions">
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{
                        flex: 1,
                        padding: '7px 10px',
                        fontSize: '0.76rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                      }}
                      onClick={() => onTogglePinExercise(ex.id)}
                    >
                      <Pin size={13} color={isPinned ? 'var(--accent-warning)' : 'var(--text-muted)'} />
                      <span>{isPinned ? '取消置顶' : '置顶此动作'}</span>
                    </button>

                    {onSelectExerciseToLog && (
                      <button
                        type="button"
                        className="btn-primary"
                        style={{
                          flex: 1.5,
                          padding: '7px 10px',
                          fontSize: '0.76rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px',
                        }}
                        onClick={() => onSelectExerciseToLog(ex)}
                      >
                        <Plus size={14} />
                        <span>加入今日训练</span>
                      </button>
                    )}

                    {ex.isCustom && (
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{
                          padding: '7px 10px',
                          fontSize: '0.76rem',
                          color: 'var(--accent-danger)',
                          borderColor: 'rgba(239, 68, 68, 0.3)',
                        }}
                        onClick={() => {
                          if (window.confirm(`确定删除自定义动作 "${ex.name}" 吗？`)) {
                            onDeleteCustomExercise(ex.id);
                          }
                        }}
                        title="删除此自定义动作"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Create Custom Exercise Modal */}
      {isCreateModalOpen && (
        <div className="modal-overlay" onClick={() => setIsCreateModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">新建自定义动作</h3>
              <button
                className="icon-btn"
                style={{ width: '30px', height: '30px' }}
                onClick={() => setIsCreateModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateExercise}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>动作名称 *</label>
                <input
                  type="text"
                  required
                  placeholder="例如：六角杠铃硬拉 / 史密斯倾斜划船"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  style={{ width: '100%', padding: '10px', marginTop: '4px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>所属部位</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as MuscleGroup)}
                    style={{ width: '100%', padding: '10px', marginTop: '4px' }}
                  >
                    {(Object.keys(MUSCLE_GROUP_LABELS) as MuscleGroup[]).map((cat) => (
                      <option key={cat} value={cat}>
                        {MUSCLE_GROUP_LABELS[cat].icon} {MUSCLE_GROUP_LABELS[cat].label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>器械类型</label>
                  <select
                    value={newEquipment}
                    onChange={(e) => setNewEquipment(e.target.value as EquipmentType)}
                    style={{ width: '100%', padding: '10px', marginTop: '4px' }}
                  >
                    <option value="barbell">杠铃 (Barbell)</option>
                    <option value="dumbbell">哑铃 (Dumbbell)</option>
                    <option value="cable">绳索龙门架 (Cable)</option>
                    <option value="machine">固定器械 (Machine)</option>
                    <option value="bodyweight">自重 (Bodyweight)</option>
                    <option value="other">其他/复合</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>动作要领或备注（选填）</label>
                <textarea
                  rows={3}
                  placeholder="例如：沉肩，背部反弓，小臂垂直地面..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  style={{ width: '100%', padding: '10px', marginTop: '4px' }}
                />
              </div>

              <button type="submit" className="btn-primary">
                创建并加入动作库
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
