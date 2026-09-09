import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Check, Search, CheckCircle2, Pin, Sparkles } from 'lucide-react';
import type { MuscleGroup, Exercise, WorkoutExercise, WorkoutSet, WorkoutSession } from '../types/workout';
import { PRESET_EXERCISES, MUSCLE_GROUP_LABELS } from '../data/presetExercises';

interface WorkoutLoggerProps {
  customExercises: Exercise[];
  workouts: WorkoutSession[];
  pinnedExerciseIds: string[];
  workoutToCopy?: WorkoutSession | null;
  onClearWorkoutToCopy?: () => void;
  onTogglePinExercise: (exerciseId: string) => void;
  onSaveWorkout: (workout: WorkoutSession) => void;
  onSetCompleted: () => void; // triggers rest timer
}

const QUICK_TITLES = [
  '练胸日',
  '练背日',
  '练腿日',
  '练肩日',
  '手臂日',
  '有氧减脂日',
  '上肢综合',
  '下肢力量',
  '户外路跑',
  '核心与有氧',
];

export const WorkoutLogger: React.FC<WorkoutLoggerProps> = ({
  customExercises,
  workouts,
  pinnedExerciseIds,
  workoutToCopy,
  onClearWorkoutToCopy,
  onTogglePinExercise,
  onSaveWorkout,
  onSetCompleted,
}) => {
  const allExercises = [...PRESET_EXERCISES, ...customExercises];

  // Workout Session State
  const [workoutDate, setWorkoutDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [workoutTitle, setWorkoutTitle] = useState<string>('练胸日');
  const [sessionNotes] = useState<string>('');

  // Selected exercises in current workout
  const [activeExercises, setActiveExercises] = useState<WorkoutExercise[]>(() => {
    const defaultEx = allExercises.find(e => pinnedExerciseIds.includes(e.id)) || allExercises[0];
    const isCardio = defaultEx.category === 'cardio' || defaultEx.isCardio;

    return [
      {
        id: 'ex_' + Date.now(),
        exerciseId: defaultEx.id,
        exerciseName: defaultEx.name,
        category: defaultEx.category,
        isCardio,
        sets: isCardio
          ? [
              {
                id: 'set_1',
                setNumber: 1,
                weightKg: 0,
                reps: 0,
                durationMinutes: 30,
                distanceKm: 4.5,
                caloriesKcal: 280,
                heartRateBpm: 138,
                isCompleted: false,
                type: 'normal',
              },
            ]
          : [
              { id: 'set_1', setNumber: 1, weightKg: 50, reps: 10, isCompleted: false, type: 'warmup' },
              { id: 'set_2', setNumber: 2, weightKg: 65, reps: 8, isCompleted: false, type: 'normal' },
              { id: 'set_3', setNumber: 3, weightKg: 65, reps: 8, isCompleted: false, type: 'normal' },
            ],
      },
    ];
  });

  // Watch for external copy workout trigger
  useEffect(() => {
    if (workoutToCopy) {
      setWorkoutTitle(workoutToCopy.title || '复制训练');
      setWorkoutDate(new Date().toISOString().split('T')[0]);

      const clonedExercises: WorkoutExercise[] = workoutToCopy.exercises.map((ex, exIdx) => ({
        id: `copied_ex_${Date.now()}_${exIdx}`,
        exerciseId: ex.exerciseId,
        exerciseName: ex.exerciseName,
        category: ex.category,
        isCardio: ex.category === 'cardio' || ex.isCardio,
        sets: ex.sets.map((s, sIdx) => ({
          id: `copied_set_${Date.now()}_${exIdx}_${sIdx}`,
          setNumber: s.setNumber || sIdx + 1,
          weightKg: s.weightKg || 0,
          reps: s.reps || 0,
          durationMinutes: s.durationMinutes,
          distanceKm: s.distanceKm,
          caloriesKcal: s.caloriesKcal,
          heartRateBpm: s.heartRateBpm,
          isCompleted: false,
          type: s.type,
          rpe: s.rpe,
        })),
      }));

      setActiveExercises(clonedExercises);
      setSavedSuccessMsg(`已成功复制「${workoutToCopy.title}」的训练参数！`);
      setTimeout(() => setSavedSuccessMsg(''), 3000);

      if (onClearWorkoutToCopy) {
        onClearWorkoutToCopy();
      }
    }
  }, [workoutToCopy]);

  // Modal State
  const [isPickerOpen, setIsPickerOpen] = useState<boolean>(false);
  const [pickerTargetIndex, setPickerTargetIndex] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<MuscleGroup | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [savedSuccessMsg, setSavedSuccessMsg] = useState<string>('');

  // Filter and sort exercises: PINNED FIRST!
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

  const getLastWorkoutSets = (exerciseId: string): WorkoutSet[] | null => {
    for (const session of workouts) {
      const match = session.exercises.find((e) => e.exerciseId === exerciseId);
      if (match && match.sets.length > 0) {
        return match.sets;
      }
    }
    return null;
  };

  const handleOpenPicker = (targetIndex: number | null) => {
    setPickerTargetIndex(targetIndex);
    setSearchQuery('');
    setIsPickerOpen(true);
  };

  const handleSelectExercise = (exercise: Exercise) => {
    const prevSets = getLastWorkoutSets(exercise.id);
    const isCardio = exercise.category === 'cardio' || exercise.isCardio;

    let initialSets: WorkoutSet[] = [];
    if (prevSets && prevSets.length > 0) {
      initialSets = prevSets.map((ps, idx) => ({
        id: `set_${Date.now()}_${idx}`,
        setNumber: idx + 1,
        weightKg: ps.weightKg || 0,
        reps: ps.reps || 0,
        durationMinutes: ps.durationMinutes || (isCardio ? 30 : undefined),
        distanceKm: ps.distanceKm || (isCardio ? 4.0 : undefined),
        caloriesKcal: ps.caloriesKcal || (isCardio ? 250 : undefined),
        heartRateBpm: ps.heartRateBpm || (isCardio ? 135 : undefined),
        isCompleted: false,
        type: ps.type,
      }));
    } else {
      if (isCardio) {
        initialSets = [
          {
            id: `set_${Date.now()}_1`,
            setNumber: 1,
            weightKg: 0,
            reps: 0,
            durationMinutes: 30,
            distanceKm: 4.5,
            caloriesKcal: 280,
            heartRateBpm: 135,
            isCompleted: false,
            type: 'normal',
          },
        ];
      } else {
        initialSets = [
          { id: `set_${Date.now()}_1`, setNumber: 1, weightKg: 40, reps: 10, isCompleted: false, type: 'normal' },
          { id: `set_${Date.now()}_2`, setNumber: 2, weightKg: 40, reps: 10, isCompleted: false, type: 'normal' },
          { id: `set_${Date.now()}_3`, setNumber: 3, weightKg: 40, reps: 8, isCompleted: false, type: 'normal' },
        ];
      }
    }

    if (pickerTargetIndex === null) {
      const newExEntry: WorkoutExercise = {
        id: 'ex_' + Date.now(),
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        category: exercise.category,
        isCardio,
        sets: initialSets,
      };
      setActiveExercises([...activeExercises, newExEntry]);
    } else {
      const updated = [...activeExercises];
      updated[pickerTargetIndex] = {
        ...updated[pickerTargetIndex],
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        category: exercise.category,
        isCardio,
        sets: initialSets,
      };
      setActiveExercises(updated);
    }

    setIsPickerOpen(false);
  };

  const handleAddSet = (exerciseIndex: number) => {
    const updated = [...activeExercises];
    const currentEx = updated[exerciseIndex];
    const currentSets = currentEx.sets;
    const lastSet = currentSets[currentSets.length - 1];
    const isCardio = currentEx.category === 'cardio' || currentEx.isCardio;

    const newSet: WorkoutSet = {
      id: `set_${Date.now()}_${currentSets.length + 1}`,
      setNumber: currentSets.length + 1,
      weightKg: isCardio ? 0 : lastSet ? lastSet.weightKg : 40,
      reps: isCardio ? 0 : lastSet ? lastSet.reps : 10,
      durationMinutes: isCardio ? (lastSet?.durationMinutes || 15) : undefined,
      distanceKm: isCardio ? (lastSet?.distanceKm || 2.0) : undefined,
      caloriesKcal: isCardio ? (lastSet?.caloriesKcal || 120) : undefined,
      heartRateBpm: isCardio ? (lastSet?.heartRateBpm || 135) : undefined,
      isCompleted: false,
      type: 'normal',
    };

    updated[exerciseIndex].sets.push(newSet);
    setActiveExercises(updated);
  };

  const handleRemoveSet = (exerciseIndex: number, setIndex: number) => {
    const updated = [...activeExercises];
    if (updated[exerciseIndex].sets.length <= 1) return;
    updated[exerciseIndex].sets.splice(setIndex, 1);
    updated[exerciseIndex].sets.forEach((s, idx) => (s.setNumber = idx + 1));
    setActiveExercises(updated);
  };

  const handleUpdateSet = (
    exerciseIndex: number,
    setIndex: number,
    field: keyof WorkoutSet,
    val: any
  ) => {
    const updated = [...activeExercises];
    updated[exerciseIndex].sets[setIndex] = {
      ...updated[exerciseIndex].sets[setIndex],
      [field]: val,
    };
    setActiveExercises(updated);
  };

  const handleToggleSetComplete = (exerciseIndex: number, setIndex: number) => {
    const updated = [...activeExercises];
    const set = updated[exerciseIndex].sets[setIndex];
    const newStatus = !set.isCompleted;
    set.isCompleted = newStatus;
    setActiveExercises(updated);

    if (newStatus) {
      onSetCompleted();
    }
  };

  // Quick Steppers for Strength
  const handleStrengthAdjust = (
    exerciseIndex: number,
    setIndex: number,
    weightDelta: number,
    repsDelta: number
  ) => {
    const updated = [...activeExercises];
    const targetSet = updated[exerciseIndex].sets[setIndex];
    if (weightDelta !== 0) {
      const currentWeight = Number(targetSet.weightKg) || 0;
      const newWeight = Math.max(0, Math.round((currentWeight + weightDelta) * 10) / 10);
      targetSet.weightKg = newWeight;
    }
    if (repsDelta !== 0) {
      const currentReps = Number(targetSet.reps) || 0;
      targetSet.reps = Math.max(1, currentReps + repsDelta);
    }
    setActiveExercises(updated);
  };

  // Quick Steppers for Cardio (Duration & Distance)
  const handleCardioAdjust = (
    exerciseIndex: number,
    setIndex: number,
    timeDeltaMin: number,
    distDeltaKm: number
  ) => {
    const updated = [...activeExercises];
    const targetSet = updated[exerciseIndex].sets[setIndex];
    if (timeDeltaMin !== 0) {
      targetSet.durationMinutes = Math.max(1, (targetSet.durationMinutes || 30) + timeDeltaMin);
    }
    if (distDeltaKm !== 0) {
      const newDist = Math.max(0, Math.round(((targetSet.distanceKm || 0) + distDeltaKm) * 10) / 10);
      targetSet.distanceKm = newDist;
    }
    setActiveExercises(updated);
  };

  const handleRemoveExercise = (exerciseIndex: number) => {
    if (activeExercises.length <= 1) return;
    const updated = [...activeExercises];
    updated.splice(exerciseIndex, 1);
    setActiveExercises(updated);
  };

  const handleSave = () => {
    if (activeExercises.length === 0) return;

    const newSession: WorkoutSession = {
      id: 'session_' + Date.now(),
      date: workoutDate,
      title: workoutTitle || '训练日',
      exercises: activeExercises.map((ex) => ({
        ...ex,
        sets: ex.sets.map((s) => ({
          ...s,
          weightKg: Number(s.weightKg) || 0,
          reps: Number(s.reps) || 0,
          durationMinutes: s.durationMinutes ? Number(s.durationMinutes) : undefined,
          distanceKm: s.distanceKm ? Number(s.distanceKm) : undefined,
          caloriesKcal: s.caloriesKcal ? Number(s.caloriesKcal) : undefined,
          isCompleted: true,
        })),
      })),
      createdAt: new Date(workoutDate).getTime() || Date.now(),
      notes: sessionNotes,
    };

    onSaveWorkout(newSession);
    setSavedSuccessMsg('训练记录已成功保存！');
    setTimeout(() => setSavedSuccessMsg(''), 3000);
  };

  return (
    <div className="animate-fade-in">
      {/* Session Title, Quick Tags & Date */}
      <div className="card" style={{ marginBottom: '14px' }}>
        <div style={{ marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              快捷选择训练标题（或自行输入）
            </label>
            <span style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '3px' }}>
              <Sparkles size={11} /> 点击标签自动填充
            </span>
          </div>

          {/* Quick Title Presets */}
          <div className="category-scroll-container" style={{ paddingBottom: '6px', marginBottom: '8px' }}>
            {QUICK_TITLES.map((t) => (
              <button
                key={t}
                type="button"
                className={`pill-btn ${workoutTitle === t ? 'active' : ''}`}
                style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                onClick={() => setWorkoutTitle(t)}
              >
                {t}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <input
                type="text"
                value={workoutTitle}
                onChange={(e) => setWorkoutTitle(e.target.value)}
                placeholder="例如：练胸日 / 有氧减脂日"
                style={{ width: '100%', padding: '8px 10px' }}
              />
            </div>
            <div style={{ width: '135px' }}>
              <input
                type="date"
                value={workoutDate}
                onChange={(e) => setWorkoutDate(e.target.value)}
                style={{ width: '100%', padding: '8px 6px' }}
              />
            </div>
          </div>
        </div>
      </div>

      {savedSuccessMsg && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: '10px',
            backgroundColor: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid var(--accent-primary)',
            color: 'var(--accent-primary)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '14px',
            fontSize: '0.88rem',
            fontWeight: 600,
          }}
        >
          <CheckCircle2 size={18} />
          {savedSuccessMsg}
        </div>
      )}

      {/* Exercises in current session */}
      {activeExercises.map((exerciseEntry, exIdx) => {
        const catInfo = MUSCLE_GROUP_LABELS[exerciseEntry.category] || { label: '其他', icon: '⚡' };
        const lastSets = getLastWorkoutSets(exerciseEntry.exerciseId);
        const isPinned = pinnedExerciseIds.includes(exerciseEntry.exerciseId);
        const isCardio = exerciseEntry.category === 'cardio' || exerciseEntry.isCardio;

        return (
          <div key={exerciseEntry.id} className="card" style={{ padding: '14px' }}>
            {/* Exercise Header */}
            <div className="card-title-row" style={{ marginBottom: '10px' }}>
              <div
                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                onClick={() => handleOpenPicker(exIdx)}
                title="点击更换动作"
              >
                <span style={{ fontSize: '1.2rem' }}>{catInfo.icon}</span>
                <div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {exerciseEntry.exerciseName}
                    {isCardio && (
                      <span
                        style={{
                          fontSize: '0.65rem',
                          padding: '1px 5px',
                          borderRadius: '4px',
                          backgroundColor: 'rgba(249, 115, 22, 0.2)',
                          color: 'var(--muscle-cardio)',
                          border: '1px solid rgba(249, 115, 22, 0.4)',
                        }}
                      >
                        有氧模式
                      </span>
                    )}
                    {isPinned && (
                      <span
                        style={{
                          fontSize: '0.65rem',
                          padding: '1px 5px',
                          borderRadius: '4px',
                          backgroundColor: 'rgba(245, 158, 11, 0.2)',
                          color: 'var(--accent-warning)',
                        }}
                      >
                        <Pin size={9} style={{ display: 'inline' }} /> 置顶
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {catInfo.label} · 点击可更换动作
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  className="icon-btn"
                  style={{
                    width: '30px',
                    height: '30px',
                    color: isPinned ? 'var(--accent-warning)' : 'var(--text-muted)',
                  }}
                  onClick={() => onTogglePinExercise(exerciseEntry.exerciseId)}
                  title={isPinned ? '取消置顶' : '置顶此动作'}
                >
                  <Pin size={14} />
                </button>

                {activeExercises.length > 1 && (
                  <button
                    className="icon-btn"
                    style={{ width: '30px', height: '30px', color: 'var(--accent-danger)' }}
                    onClick={() => handleRemoveExercise(exIdx)}
                    title="移除此动作"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Last Performance Hint */}
            {lastSets && lastSets.length > 0 && (
              <div
                style={{
                  fontSize: '0.74rem',
                  color: 'var(--text-secondary)',
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  padding: '5px 10px',
                  borderRadius: '6px',
                  marginBottom: '10px',
                }}
              >
                📌 上次参考：
                {isCardio
                  ? lastSets.map((s, idx) => `#${idx + 1}: ${s.durationMinutes || 0}分 ${s.distanceKm ? s.distanceKm + 'km' : ''} ${s.caloriesKcal ? s.caloriesKcal + 'kcal' : ''}`).join(' | ')
                  : lastSets.map((s, idx) => `#${idx + 1}: ${s.weightKg}kg×${s.reps}`).join(' | ')}
              </div>
            )}

            {/* CARDIO MODE vs STRENGTH MODE SETS TABLE */}
            {isCardio ? (
              // --- CARDIO INPUT VIEW ---
              <div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '32px 1.1fr 1.1fr 1fr 38px',
                    gap: '6px',
                    fontSize: '0.72rem',
                    color: 'var(--text-muted)',
                    textAlign: 'center',
                    marginBottom: '6px',
                    padding: '0 4px',
                  }}
                >
                  <span>组</span>
                  <span>时长 (分)</span>
                  <span>距离 (km)</span>
                  <span>热量/心率</span>
                  <span>完成</span>
                </div>

                <div className="sets-table-wrapper">
                  {exerciseEntry.sets.map((set, setIdx) => (
                    <div key={set.id}>
                      <div
                        className={`set-row ${set.isCompleted ? 'completed' : ''}`}
                        style={{ gridTemplateColumns: '32px 1.1fr 1.1fr 1fr 38px', gap: '6px' }}
                      >
                        <div className="set-num-badge">{set.setNumber}</div>

                        {/* Duration Minutes */}
                        <div className="set-input-group">
                          <input
                            type="number"
                            min="1"
                            step="1"
                            className="set-input"
                            value={set.durationMinutes ? set.durationMinutes : ''}
                            placeholder="30"
                            onChange={(e) => {
                              const val = e.target.value;
                              handleUpdateSet(
                                exIdx,
                                setIdx,
                                'durationMinutes',
                                val === '' ? 0 : parseInt(val, 10) || 0
                              );
                            }}
                          />
                          <span className="set-input-unit">分</span>
                        </div>

                        {/* Distance Km */}
                        <div className="set-input-group">
                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            className="set-input"
                            value={set.distanceKm ? set.distanceKm : ''}
                            placeholder="5.0"
                            onChange={(e) => {
                              const val = e.target.value;
                              handleUpdateSet(
                                exIdx,
                                setIdx,
                                'distanceKm',
                                val === '' ? 0 : parseFloat(val) || 0
                              );
                            }}
                          />
                          <span className="set-input-unit">km</span>
                        </div>

                        {/* Calories / Heart Rate */}
                        <div className="set-input-group">
                          <input
                            type="number"
                            min="0"
                            step="10"
                            className="set-input"
                            value={set.caloriesKcal ? set.caloriesKcal : ''}
                            placeholder="kcal"
                            onChange={(e) => {
                              const val = e.target.value;
                              handleUpdateSet(
                                exIdx,
                                setIdx,
                                'caloriesKcal',
                                val === '' ? 0 : parseInt(val, 10) || 0
                              );
                            }}
                          />
                          <span className="set-input-unit">cal</span>
                        </div>

                        <button
                          className={`check-btn ${set.isCompleted ? 'checked' : ''}`}
                          onClick={() => handleToggleSetComplete(exIdx, setIdx)}
                          title={set.isCompleted ? '已完成' : '打勾完成'}
                        >
                          <Check size={18} />
                        </button>
                      </div>

                      {/* Cardio Quick Steppers */}
                      <div className="stepper-bar" style={{ marginTop: '2px', marginBottom: '8px' }}>
                        <button
                          className="step-chip"
                          onClick={() => handleCardioAdjust(exIdx, setIdx, 5, 0)}
                        >
                          +5分钟
                        </button>
                        <button
                          className="step-chip"
                          onClick={() => handleCardioAdjust(exIdx, setIdx, 10, 0)}
                        >
                          +10分钟
                        </button>
                        <button
                          className="step-chip"
                          onClick={() => handleCardioAdjust(exIdx, setIdx, -5, 0)}
                        >
                          -5分钟
                        </button>
                        <button
                          className="step-chip"
                          onClick={() => handleCardioAdjust(exIdx, setIdx, 0, 0.5)}
                        >
                          +0.5km
                        </button>
                        <button
                          className="step-chip"
                          onClick={() => handleCardioAdjust(exIdx, setIdx, 0, 1.0)}
                        >
                          +1.0km
                        </button>
                        {exerciseEntry.sets.length > 1 && (
                          <button
                            className="step-chip"
                            style={{ marginLeft: 'auto', color: 'var(--text-muted)' }}
                            onClick={() => handleRemoveSet(exIdx, setIdx)}
                          >
                            删段
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              // --- STRENGTH INPUT VIEW ---
              <div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '34px 1fr 1fr 40px',
                    gap: '8px',
                    fontSize: '0.72rem',
                    color: 'var(--text-muted)',
                    textAlign: 'center',
                    marginBottom: '6px',
                    padding: '0 4px',
                  }}
                >
                  <span>组数</span>
                  <span>重量 (kg)</span>
                  <span>次数 (reps)</span>
                  <span>打勾</span>
                </div>

                <div className="sets-table-wrapper">
                  {exerciseEntry.sets.map((set, setIdx) => (
                    <div key={set.id}>
                      <div className={`set-row ${set.isCompleted ? 'completed' : ''}`}>
                        <div className="set-num-badge">{set.setNumber}</div>

                        <div className="set-input-group">
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            className="set-input"
                            value={set.weightKg === 0 ? '' : set.weightKg}
                            placeholder="0"
                            onChange={(e) => {
                              const val = e.target.value;
                              handleUpdateSet(
                                exIdx,
                                setIdx,
                                'weightKg',
                                val === '' ? 0 : parseFloat(val) || 0
                              );
                            }}
                          />
                          <span className="set-input-unit">kg</span>
                        </div>

                        <div className="set-input-group">
                          <input
                            type="number"
                            step="1"
                            min="0"
                            className="set-input"
                            value={set.reps === 0 ? '' : set.reps}
                            placeholder="0"
                            onChange={(e) => {
                              const val = e.target.value;
                              handleUpdateSet(
                                exIdx,
                                setIdx,
                                'reps',
                                val === '' ? 0 : parseInt(val, 10) || 0
                              );
                            }}
                          />
                          <span className="set-input-unit">次</span>
                        </div>

                        <button
                          className={`check-btn ${set.isCompleted ? 'checked' : ''}`}
                          onClick={() => handleToggleSetComplete(exIdx, setIdx)}
                          title={set.isCompleted ? '已完成' : '打勾完成并触发休息计时'}
                        >
                          <Check size={18} />
                        </button>
                      </div>

                      {/* Strength Micro Steppers */}
                      <div className="stepper-bar" style={{ marginTop: '2px', marginBottom: '8px' }}>
                        <button
                          className="step-chip"
                          onClick={() => handleStrengthAdjust(exIdx, setIdx, 2.5, 0)}
                        >
                          +2.5kg
                        </button>
                        <button
                          className="step-chip"
                          onClick={() => handleStrengthAdjust(exIdx, setIdx, 5, 0)}
                        >
                          +5kg
                        </button>
                        <button
                          className="step-chip"
                          onClick={() => handleStrengthAdjust(exIdx, setIdx, -2.5, 0)}
                        >
                          -2.5kg
                        </button>
                        <button
                          className="step-chip"
                          onClick={() => handleStrengthAdjust(exIdx, setIdx, 0, 1)}
                        >
                          +1次
                        </button>
                        <button
                          className="step-chip"
                          onClick={() => handleStrengthAdjust(exIdx, setIdx, 0, -1)}
                        >
                          -1次
                        </button>
                        {exerciseEntry.sets.length > 1 && (
                          <button
                            className="step-chip"
                            style={{ marginLeft: 'auto', color: 'var(--text-muted)' }}
                            onClick={() => handleRemoveSet(exIdx, setIdx)}
                          >
                            删组
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add Set Button */}
            <button
              className="btn-secondary"
              onClick={() => handleAddSet(exIdx)}
              style={{ marginTop: '4px' }}
            >
              <Plus size={16} />
              {isCardio ? '添加有氧段落/间歇' : '添加一组'}
            </button>
          </div>
        );
      })}

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '10px', marginTop: '14px', marginBottom: '20px' }}>
        <button
          className="btn-secondary"
          onClick={() => handleOpenPicker(null)}
          style={{ padding: '12px' }}
        >
          <Plus size={18} />
          组合下一个动作
        </button>

        <button
          className="btn-primary"
          onClick={handleSave}
          style={{ flex: 1.2 }}
        >
          <CheckCircle2 size={18} />
          保存本次训练
        </button>
      </div>

      {/* Exercise Picker Modal */}
      {isPickerOpen && (
        <div className="modal-overlay" onClick={() => setIsPickerOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {pickerTargetIndex === null ? '添加动作' : '更换动作'}
              </h3>
              <button
                className="icon-btn"
                style={{ width: '32px', height: '32px' }}
                onClick={() => setIsPickerOpen(false)}
              >
                ✕
              </button>
            </div>

            {/* Search Input */}
            <div style={{ position: 'relative', marginBottom: '12px' }}>
              <Search
                size={16}
                color="var(--text-muted)"
                style={{ position: 'absolute', left: '12px', top: '12px' }}
              />
              <input
                type="text"
                placeholder="搜索动作名称（支持力量与有氧跑步/单车等）"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '100%', padding: '10px 10px 10px 36px' }}
              />
            </div>

            {/* Category Filter Pills */}
            <div className="category-scroll-container">
              <button
                className={`pill-btn ${selectedCategory === 'all' ? 'active' : ''}`}
                onClick={() => setSelectedCategory('all')}
              >
                全部部位
              </button>
              {(Object.keys(MUSCLE_GROUP_LABELS) as MuscleGroup[]).map((cat) => {
                const info = MUSCLE_GROUP_LABELS[cat];
                return (
                  <button
                    key={cat}
                    className={`pill-btn ${selectedCategory === cat ? 'active' : ''}`}
                    onClick={() => setSelectedCategory(cat)}
                  >
                    <span>{info.icon}</span>
                    <span>{info.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Exercise List */}
            <div className="modal-body">
              {filteredExercises.map((ex) => {
                const catInfo = MUSCLE_GROUP_LABELS[ex.category] || { label: '其他', icon: '⚡' };
                const isPinned = pinnedExerciseIds.includes(ex.id);
                const isCardio = ex.category === 'cardio' || ex.isCardio;

                return (
                  <div
                    key={ex.id}
                    className="exercise-select-item"
                    style={{
                      borderLeft: isPinned ? '3px solid var(--accent-warning)' : isCardio ? '3px solid var(--muscle-cardio)' : undefined,
                      backgroundColor: isPinned ? 'rgba(245, 158, 11, 0.05)' : undefined,
                    }}
                    onClick={() => handleSelectExercise(ex)}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {ex.name}
                        {isCardio && (
                          <span
                            style={{
                              fontSize: '0.65rem',
                              padding: '1px 5px',
                              borderRadius: '4px',
                              backgroundColor: 'rgba(249, 115, 22, 0.15)',
                              color: 'var(--muscle-cardio)',
                            }}
                          >
                            有氧
                          </span>
                        )}
                        {isPinned && (
                          <span
                            style={{
                              fontSize: '0.65rem',
                              padding: '1px 5px',
                              borderRadius: '4px',
                              backgroundColor: 'rgba(245, 158, 11, 0.2)',
                              color: 'var(--accent-warning)',
                            }}
                          >
                            已置顶
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {catInfo.label} · {ex.equipment}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        className="icon-btn"
                        style={{
                          width: '32px',
                          height: '32px',
                          color: isPinned ? 'var(--accent-warning)' : 'var(--text-muted)',
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onTogglePinExercise(ex.id);
                        }}
                        title={isPinned ? '取消置顶' : '置顶此动作'}
                      >
                        <Pin size={15} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
