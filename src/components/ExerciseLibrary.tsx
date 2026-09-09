import React, { useState } from 'react';
import { Plus, Search, Trash2, Award, Pin } from 'lucide-react';
import type { Exercise, MuscleGroup, EquipmentType, WorkoutSession } from '../types/workout';
import { PRESET_EXERCISES, MUSCLE_GROUP_LABELS } from '../data/presetExercises';
import { analyticsService } from '../services/analytics';

interface ExerciseLibraryProps {
  customExercises: Exercise[];
  workouts: WorkoutSession[];
  pinnedExerciseIds: string[];
  onTogglePinExercise: (exerciseId: string) => void;
  onAddCustomExercise: (exercise: Exercise) => void;
  onDeleteCustomExercise: (id: string) => void;
}

export const ExerciseLibrary: React.FC<ExerciseLibraryProps> = ({
  customExercises,
  workouts,
  pinnedExerciseIds,
  onTogglePinExercise,
  onAddCustomExercise,
  onDeleteCustomExercise,
}) => {
  const allExercises = [...PRESET_EXERCISES, ...customExercises];

  const [selectedCategory, setSelectedCategory] = useState<MuscleGroup | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);

  // New custom exercise state
  const [newName, setNewName] = useState<string>('');
  const [newCategory, setNewCategory] = useState<MuscleGroup>('chest');
  const [newEquipment, setNewEquipment] = useState<EquipmentType>('barbell');
  const [newDescription, setNewDescription] = useState<string>('');

  const filteredExercises = allExercises
    .filter((ex) => {
      const matchesCat = selectedCategory === 'all' || ex.category === selectedCategory;
      const matchesSearch =
        searchQuery.trim() === '' ||
        ex.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (ex.nameEn && ex.nameEn.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCat && matchesSearch;
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
      {/* Top Action & Search */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search
            size={16}
            color="var(--text-muted)"
            style={{ position: 'absolute', left: '12px', top: '12px' }}
          />
          <input
            type="text"
            placeholder="搜索动作名称..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%', padding: '10px 10px 10px 36px' }}
          />
        </div>

        <button
          className="btn-primary"
          style={{ width: 'auto', padding: '10px 14px', whiteSpace: 'nowrap' }}
          onClick={() => setIsCreateModalOpen(true)}
        >
          <Plus size={18} />
          自定义动作
        </button>
      </div>

      {/* Category Filter Pills */}
      <div className="category-scroll-container">
        <button
          className={`pill-btn ${selectedCategory === 'all' ? 'active' : ''}`}
          onClick={() => setSelectedCategory('all')}
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
            >
              <span>{info.icon}</span>
              <span>{info.label}</span>
              <span style={{ fontSize: '0.68rem', opacity: 0.7 }}>({count})</span>
            </button>
          );
        })}
      </div>

      {/* Exercise Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {filteredExercises.map((ex) => {
          const catInfo = MUSCLE_GROUP_LABELS[ex.category] || { label: '其他', icon: '⚡' };
          const best = getBestRecord(ex.id);
          const isPinned = pinnedExerciseIds.includes(ex.id);

          return (
            <div
              key={ex.id}
              className="card"
              style={{
                padding: '14px',
                marginBottom: '0',
                borderLeft: isPinned ? '3px solid var(--accent-warning)' : undefined,
                backgroundColor: isPinned ? 'rgba(245, 158, 11, 0.04)' : undefined,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <span style={{ fontSize: '1.4rem' }}>{catInfo.icon}</span>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                        {ex.name}
                      </span>
                      {isPinned && (
                        <span
                          style={{
                            fontSize: '0.65rem',
                            padding: '1px 5px',
                            borderRadius: '4px',
                            backgroundColor: 'rgba(245, 158, 11, 0.2)',
                            color: 'var(--accent-warning)',
                            border: '1px solid rgba(245, 158, 11, 0.4)',
                          }}
                        >
                          已置顶
                        </span>
                      )}
                      {ex.isCustom && (
                        <span
                          style={{
                            fontSize: '0.65rem',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            backgroundColor: 'rgba(168, 85, 247, 0.2)',
                            color: 'var(--accent-purple)',
                            border: '1px solid var(--accent-purple)',
                          }}
                        >
                          自定义
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {catInfo.label} · 器械: {ex.equipment}
                    </div>

                    {ex.description && (
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
                        {ex.description}
                      </p>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {best && (
                    <div
                      style={{
                        background: 'rgba(16, 185, 129, 0.1)',
                        border: '1px solid var(--accent-primary)',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        textAlign: 'right',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <div style={{ fontSize: '0.65rem', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <Award size={11} /> 历史纪录
                      </div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                        {best.maxWeight}kg (1RM {best.max1RM}k)
                      </div>
                    </div>
                  )}

                  {/* Pin toggle button */}
                  <button
                    className="icon-btn"
                    style={{
                      width: '30px',
                      height: '30px',
                      color: isPinned ? 'var(--accent-warning)' : 'var(--text-muted)',
                    }}
                    onClick={() => onTogglePinExercise(ex.id)}
                    title={isPinned ? '取消置顶' : '置顶此动作'}
                  >
                    <Pin size={14} />
                  </button>

                  {ex.isCustom && (
                    <button
                      className="icon-btn"
                      style={{ width: '30px', height: '30px', color: 'var(--accent-danger)' }}
                      onClick={() => {
                        if (window.confirm(`确定删除自定义动作 "${ex.name}" 吗？`)) {
                          onDeleteCustomExercise(ex.id);
                        }
                      }}
                      title="删除此自定义动作"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
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
