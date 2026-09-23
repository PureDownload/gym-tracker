import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Minus,
  Trash2,
  Check,
  Search,
  CheckCircle2,
  Pin,
  Lightbulb,
  Calculator,
  Timer,
  Play,
  Pause,
  RotateCcw,
  Copy,
  X,
  Trophy,
  Dumbbell,
  Layers,
  Flame,
  ArrowRightLeft,
  Share2,
  MoreHorizontal,
} from 'lucide-react';
import type {
  MuscleGroup,
  EquipmentType,
  Exercise,
  WorkoutExercise,
  WorkoutSet,
  WorkoutSession,
  SetType,
  WorkoutTemplate,
} from '../types/workout';
import { PRESET_EXERCISES, MUSCLE_GROUP_LABELS, EQUIPMENT_LABELS } from '../data/presetExercises';
import { WarmupCalculatorModal } from './WarmupCalculatorModal';
import { WorkoutPosterModal } from './WorkoutPosterModal';
import { TemplateManagerModal } from './TemplateManagerModal';
import { ExerciseSubstituteModal } from './ExerciseSubstituteModal';

interface WorkoutLoggerProps {
  customExercises: Exercise[];
  workouts: WorkoutSession[];
  pinnedExerciseIds: string[];
  templates?: WorkoutTemplate[];
  onSaveTemplate?: (template: WorkoutTemplate) => void;
  onDeleteTemplate?: (id: string) => void;
  workoutToCopy?: WorkoutSession | null;
  onClearWorkoutToCopy?: () => void;
  exerciseToAdd?: Exercise | null;
  onClearExerciseToAdd?: () => void;
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
  '核心与有氧',
];

const SET_TYPE_LABELS: Record<SetType, { label: string; badge: string; className: string }> = {
  normal: { label: '正式组', badge: '', className: '' },
  warmup: { label: '热身组', badge: 'W', className: 'warmup' },
  drop: { label: '递减组', badge: 'D', className: 'drop' },
  failure: { label: '力竭组', badge: 'F', className: 'failure' },
};

// Domain guidance tips for beginner exercisers
const MUSCLE_TIPS: Record<
  MuscleGroup,
  { keyPoints: string[]; breath: string; safety: string }
> = {
  chest: {
    keyPoints: [
      '肩胛骨紧贴凳面后缩下沉，全程沉肩挺胸，切勿耸肩',
      '大臂与躯干夹角约 45°~60°（呈箭头型），避免大臂垂直于躯干导致肩袖撞击',
      '手腕中立与小臂呈一条直线，避免手腕严重后折承重',
    ],
    breath: '推起发力时匀速呼气，下放离心控制（2~3秒）时深吸气，切勿憋气。',
    safety: '新手先从空杆（20kg）或轻哑铃找胸肌发力感，切忌盲目上大重量导致代偿！',
  },
  back: {
    keyPoints: [
      '核心全程收紧保持脊柱中立，背部切勿拱背或过分超伸',
      '意念集中在“肘部向后引拉”，不要只靠手臂前臂死命使劲',
      '拉到动作顶峰时用力夹紧背部挤压1秒，还原时缓慢感受背阔肌拉伸',
    ],
    breath: '下拉或后拉发力时呼气，手臂送出离心回放时吸气。',
    safety: '划船动作如果感觉腰酸，说明腰部代偿，请先减轻重量或俯卧靠在斜板上做。',
  },
  legs: {
    keyPoints: [
      '双脚脚尖微朝外，下蹲全过程膝盖轨迹务必与脚尖方向严格一致，切忌内扣',
      '屈髋先于或同时屈膝（像往后坐椅子），脚后跟与足底三点牢固抓地',
      '上身保持挺拔核心收紧，下蹲至大腿至少与地面平行',
    ],
    breath: '站起蹬地时呼气，下蹲蓄力时吸气。',
    safety: '膝盖有酸痛感请立刻检查是否有膝盖内扣或脚跟离地，新手深蹲建议先练自重高脚杯深蹲！',
  },
  shoulders: {
    keyPoints: [
      '推举时核心与臀部收紧，骨盆中立，严防下腰反弓借力',
      '侧平举时微屈手肘，以大臂带动手肘抬起，不要把双肩耸起给斜方肌代偿',
      '哑铃举到手肘与肩齐平即可，无需举过头顶',
    ],
    breath: '向上推举或侧平举时呼气，缓慢下落时吸气。',
    safety: '肩关节是全身最脆弱的球窝关节，侧平举从 2~5kg 小哑铃起步即可获得极佳泵感！',
  },
  arms: {
    keyPoints: [
      '二头弯举时大臂紧贴身体两侧，身体不要前后晃荡借力',
      '三头臂屈伸时保持大臂固定，仅以肘关节为轴做屈伸',
      '全程离心控制下放，不要让重物做自由落体砸落',
    ],
    breath: '肌肉收缩用力时呼气，还原伸展时吸气。',
    safety: '手臂容易手腕痛，可尝试曲杆（EZ-bar）或对握姿势缓解腕部压力。',
  },
  core: {
    keyPoints: [
      '卷腹时意念在肋骨下角向骨盆靠近的折叠，不要用双手抱着头死勒颈椎',
      '平板支撑时身体呈一条直线，腹肌和臀大肌同时夹紧，切勿塌腰',
      '注重动作质量与核心紧绷感，而非单次盲目追求次数',
    ],
    breath: '卷起用力时大幅呼气吐尽腹内气体，还原吸气。',
    safety: '腰椎不适者尽量避免大角度仰卧起坐，建议换成死虫式或平板支撑。',
  },
  cardio: {
    keyPoints: [
      '跑步时前脚掌或足中缓冲落地，步伐轻盈，上半身微前倾',
      '心率保持在有氧燃脂区间（约 (220-年龄) × 60%~75%）效果最好',
      '及时小口多次补充常温水，运动前后各进行 3~5 分钟动态与静态拉伸',
    ],
    breath: '跑步建议采用“两步一吸、两步一呼”或三步呼吸节奏。',
    safety: '出现胸闷或严重头晕请立即减速缓步慢走，切勿骤停！',
  },
};

const MOTIVATIONAL_QUOTES = [
  '“动作的标准程度，永远比举起的重量重要得多。”',
  '“每一次肌肉的力竭，都是身体在发出变强的信号。”',
  '“坚持自律是最好的雕刻刀，汗水从不辜负每一刻努力。”',
  '“今天的打卡只是起点，日积月累终将见证蜕变！”',
];

export const WorkoutLogger: React.FC<WorkoutLoggerProps> = ({
  customExercises,
  workouts,
  pinnedExerciseIds,
  templates = [],
  onSaveTemplate,
  onDeleteTemplate,
  workoutToCopy,
  onClearWorkoutToCopy,
  exerciseToAdd,
  onClearExerciseToAdd,
  onTogglePinExercise,
  onSaveWorkout,
  onSetCompleted,
}) => {
  const allExercises = useMemo(
    () => [...PRESET_EXERCISES, ...customExercises],
    [customExercises]
  );

  // 1. Session Basics
  const [workoutDate, setWorkoutDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [workoutTitle, setWorkoutTitle] = useState<string>('练胸日');
  const [sessionNotes] = useState<string>('');
  const [savedSuccessMsg, setSavedSuccessMsg] = useState<string>('');

  // 2. Real-time Workout Timer (HUD) - Default NOT running on open to give full user control
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [isTimeEditModalOpen, setIsTimeEditModalOpen] = useState<boolean>(false);
  const [manualMinutesInput, setManualMinutesInput] = useState<string>('');

  // 3. New Advanced Modal States (Templates, Warmup, Substitute, Story Poster)
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState<boolean>(false);
  const [isPosterModalOpen, setIsPosterModalOpen] = useState<boolean>(false);
  const [lastSavedSession, setLastSavedSession] = useState<WorkoutSession | null>(null);
  const [warmupTargetEx, setWarmupTargetEx] = useState<{
    exIdx: number;
    name: string;
    weight: number;
  } | null>(null);
  const [substituteTargetEx, setSubstituteTargetEx] = useState<{
    exIdx: number;
    name: string;
    category: string;
  } | null>(null);
  const [activeMoreMenuExId, setActiveMoreMenuExId] = useState<string | null>(null);

  // Sticky HUD compact state when scrolling
  const [isHudCompact, setIsHudCompact] = useState<boolean>(false);

  useEffect(() => {
    const mainEl = document.querySelector('.main-content');
    if (!mainEl) return;
    const handleScroll = () => {
      setIsHudCompact(mainEl.scrollTop > 25);
    };
    mainEl.addEventListener('scroll', handleScroll, { passive: true });
    return () => mainEl.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const formatElapsed = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    if (m >= 60) {
      const h = Math.floor(m / 60);
      const remM = m % 60;
      return `${h}h ${remM.toString().padStart(2, '0')}m`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Template & Substitute helper functions
  const handleApplyTemplate = (tmpl: WorkoutTemplate) => {
    setWorkoutTitle(tmpl.name);
    const newExercises: WorkoutExercise[] = tmpl.exercises.map((te, exIdx) => ({
      id: `tmpl_ex_${Date.now()}_${exIdx}`,
      exerciseId: te.exerciseId,
      exerciseName: te.exerciseName,
      category: te.category,
      isCardio: te.isCardio,
      notes: te.notes,
      sets: te.defaultSets.map((ds, sIdx) => ({
        id: `tmpl_set_${Date.now()}_${exIdx}_${sIdx}`,
        setNumber: ds.setNumber || sIdx + 1,
        weightKg: ds.weightKg || 0,
        reps: ds.reps || 0,
        type: ds.type || 'normal',
        rpe: ds.rpe,
        durationMinutes: ds.durationMinutes,
        distanceKm: ds.distanceKm,
        isCompleted: false,
      })),
    }));
    setActiveExercises(newExercises);
    setSavedSuccessMsg(`已成功套用「${tmpl.name}」模版！`);
    setTimeout(() => setSavedSuccessMsg(''), 2500);
  };

  const handleSaveCurrentAsTemplate = () => {
    const defaultName = workoutTitle || '我的训练模版';
    const templateName = window.prompt('请输入新模版名称：', defaultName);
    if (!templateName || !templateName.trim()) return;

    const newTemplate: WorkoutTemplate = {
      id: `custom_tmpl_${Date.now()}`,
      name: templateName.trim(),
      category: 'custom',
      description: `包含 ${activeExercises.length} 个动作的个性化方案`,
      exercises: activeExercises.map((ex) => ({
        exerciseId: ex.exerciseId,
        exerciseName: ex.exerciseName,
        category: ex.category,
        isCardio: ex.isCardio,
        notes: ex.notes,
        defaultSets: ex.sets.map((s) => ({
          setNumber: s.setNumber,
          weightKg: s.weightKg,
          reps: s.reps,
          type: s.type,
          rpe: s.rpe,
          durationMinutes: s.durationMinutes,
          distanceKm: s.distanceKm,
        })),
      })),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    if (onSaveTemplate) {
      onSaveTemplate(newTemplate);
      setSavedSuccessMsg(`成功保存新模版「${newTemplate.name}」！`);
      setTimeout(() => setSavedSuccessMsg(''), 2500);
    }
  };

  const handleSubstituteExercise = (newEx: Exercise) => {
    if (!substituteTargetEx) return;
    const { exIdx } = substituteTargetEx;
    const updated = [...activeExercises];
    const target = updated[exIdx];
    if (!target) return;

    target.exerciseId = newEx.id;
    target.exerciseName = newEx.name;
    target.category = newEx.category;
    target.isCardio = newEx.isCardio || newEx.category === 'cardio';

    setActiveExercises(updated);
    setSavedSuccessMsg(`已将动作替换为「${newEx.name}」！`);
    setTimeout(() => setSavedSuccessMsg(''), 2500);
    setSubstituteTargetEx(null);
  };

  const handleApplyWarmupSets = (warmupSets: WorkoutSet[]) => {
    if (!warmupTargetEx) return;
    const { exIdx } = warmupTargetEx;
    const updated = [...activeExercises];
    const target = updated[exIdx];
    if (!target) return;

    const existingNormalSets = target.sets.filter((s) => s.type !== 'warmup');
    const combined = [...warmupSets, ...existingNormalSets];
    combined.forEach((s, idx) => (s.setNumber = idx + 1));
    target.sets = combined;

    setActiveExercises(updated);
    setSavedSuccessMsg(`已为「${target.exerciseName}」配置 ${warmupSets.length} 个阶梯热身组！`);
    setTimeout(() => setSavedSuccessMsg(''), 2500);
    setWarmupTargetEx(null);
  };

  // 3. Current active exercises
  const [activeExercises, setActiveExercises] = useState<WorkoutExercise[]>(() => {
    const defaultEx =
      allExercises.find((e) => pinnedExerciseIds.includes(e.id)) || allExercises[0];
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
                caloriesKcal: 250,
                heartRateBpm: 135,
                isCompleted: false,
                type: 'normal',
              },
            ]
          : [
              // Friendly beginner defaults (starting from empty bar 20kg, not 65kg!)
              { id: 'set_1', setNumber: 1, weightKg: 20, reps: 12, isCompleted: false, type: 'warmup' },
              { id: 'set_2', setNumber: 2, weightKg: 30, reps: 10, isCompleted: false, type: 'normal' },
              { id: 'set_3', setNumber: 3, weightKg: 30, reps: 10, isCompleted: false, type: 'normal' },
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
          type: s.type || 'normal',
          rpe: s.rpe,
        })),
      }));

      setActiveExercises(clonedExercises);
      setSavedSuccessMsg(`已成功载入「${workoutToCopy.title}」的训练参数！`);
      setTimeout(() => setSavedSuccessMsg(''), 3000);

      if (onClearWorkoutToCopy) {
        onClearWorkoutToCopy();
      }
    }
  }, [workoutToCopy]);

  // 4. UI Focus & Modals State
  const [activeRowKey, setActiveRowKey] = useState<string | null>(null); // format: `${exIdx}_${setIdx}`
  const [openTipsExId, setOpenTipsExId] = useState<string | null>(null);
  const [plateCalcWeight, setPlateCalcWeight] = useState<number | null>(null);
  const [plateBarType, setPlateBarType] = useState<number>(20); // 20kg standard, 15kg women, 10kg EZ, 0kg
  const [celebrationData, setCelebrationData] = useState<{
    volumeKg: number;
    completedSets: number;
    totalSets: number;
    durationMin: number;
  } | null>(null);

  // Picker Modal State
  const [isPickerOpen, setIsPickerOpen] = useState<boolean>(false);
  const [pickerTargetIndex, setPickerTargetIndex] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<MuscleGroup | 'all'>('all');
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // 5. Dynamic HUD Calculations
  const hudStats = useMemo(() => {
    let totalSets = 0;
    let completedSets = 0;
    let totalVolume = 0;

    activeExercises.forEach((ex) => {
      ex.sets.forEach((s) => {
        totalSets++;
        if (s.isCompleted) {
          completedSets++;
        }
        // Count volume for strength sets
        if (!ex.isCardio && ex.category !== 'cardio') {
          const w = Number(s.weightKg) || 0;
          const r = Number(s.reps) || 0;
          totalVolume += w * r;
        }
      });
    });

    const progressPct = totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0;
    return { totalSets, completedSets, totalVolume, progressPct };
  }, [activeExercises]);

  // Filter exercises in picker
  const filteredExercises = useMemo(() => {
    return allExercises
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
  }, [allExercises, selectedCategory, selectedEquipment, searchQuery, pinnedExerciseIds]);

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
    setSelectedEquipment('all');
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
        type: ps.type || 'normal',
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
            caloriesKcal: 250,
            heartRateBpm: 135,
            isCompleted: false,
            type: 'normal',
          },
        ];
      } else {
        // Sensible beginner defaults
        const defaultW = exercise.equipment === 'barbell' ? 20 : exercise.equipment === 'dumbbell' ? 7.5 : 25;
        initialSets = [
          { id: `set_${Date.now()}_1`, setNumber: 1, weightKg: defaultW, reps: 12, isCompleted: false, type: 'warmup' },
          { id: `set_${Date.now()}_2`, setNumber: 2, weightKg: defaultW + 5, reps: 10, isCompleted: false, type: 'normal' },
          { id: `set_${Date.now()}_3`, setNumber: 3, weightKg: defaultW + 5, reps: 10, isCompleted: false, type: 'normal' },
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

  // Watch for external exercise addition (e.g. from Exercise Library "+ 加入训练")
  useEffect(() => {
    if (exerciseToAdd) {
      handleSelectExercise(exerciseToAdd);
      setSavedSuccessMsg(`已将「${exerciseToAdd.name}」加入当前训练！`);
      setTimeout(() => setSavedSuccessMsg(''), 2500);
      if (onClearExerciseToAdd) {
        onClearExerciseToAdd();
      }
    }
  }, [exerciseToAdd]);

  const handleAddSet = (exerciseIndex: number) => {
    const updated = [...activeExercises];
    const currentEx = updated[exerciseIndex];
    const currentSets = currentEx.sets;
    const lastSet = currentSets[currentSets.length - 1];
    const isCardio = currentEx.category === 'cardio' || currentEx.isCardio;

    const newSet: WorkoutSet = {
      id: `set_${Date.now()}_${currentSets.length + 1}`,
      setNumber: currentSets.length + 1,
      weightKg: isCardio ? 0 : lastSet ? lastSet.weightKg : 20,
      reps: isCardio ? 0 : lastSet ? lastSet.reps : 10,
      durationMinutes: isCardio ? lastSet?.durationMinutes || 15 : undefined,
      distanceKm: isCardio ? lastSet?.distanceKm || 2.0 : undefined,
      caloriesKcal: isCardio ? lastSet?.caloriesKcal || 120 : undefined,
      heartRateBpm: isCardio ? lastSet?.heartRateBpm || 135 : undefined,
      isCompleted: false,
      type: 'normal',
    };

    updated[exerciseIndex].sets.push(newSet);
    setActiveExercises(updated);
    // Set active row to newly created set
    setActiveRowKey(`${exerciseIndex}_${updated[exerciseIndex].sets.length - 1}`);
  };

  const handleRemoveSet = (exerciseIndex: number, setIndex: number) => {
    const updated = [...activeExercises];
    if (updated[exerciseIndex].sets.length <= 1) return;
    updated[exerciseIndex].sets.splice(setIndex, 1);
    updated[exerciseIndex].sets.forEach((s, idx) => (s.setNumber = idx + 1));
    setActiveExercises(updated);
    if (activeRowKey === `${exerciseIndex}_${setIndex}`) {
      setActiveRowKey(null);
    }
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

  // Toggle set completed with auto-advancing focus and rest timer
  const handleToggleSetComplete = (exerciseIndex: number, setIndex: number) => {
    const updated = [...activeExercises];
    const currentEx = updated[exerciseIndex];
    const currentSet = currentEx.sets[setIndex];
    const newStatus = !currentSet.isCompleted;
    currentSet.isCompleted = newStatus;
    setActiveExercises(updated);

    if (newStatus) {
      onSetCompleted(); // Pop up rest timer

      // If timer is not running and currently at 0, start timing automatically on first set completion
      if (!isTimerRunning && elapsedSeconds === 0) {
        setIsTimerRunning(true);
      }

      // Smoothly advance focus to next set
      if (setIndex + 1 < currentEx.sets.length) {
        setActiveRowKey(`${exerciseIndex}_${setIndex + 1}`);
      } else if (exerciseIndex + 1 < updated.length) {
        setActiveRowKey(`${exerciseIndex + 1}_0`);
      } else {
        setActiveRowKey(null);
      }
    }
  };

  // Discrete steppers for Weight & Reps
  const handleAdjustWeight = (exIdx: number, setIdx: number, delta: number) => {
    const currentW = Number(activeExercises[exIdx].sets[setIdx].weightKg) || 0;
    const newW = Math.max(0, Math.round((currentW + delta) * 100) / 100);
    handleUpdateSet(exIdx, setIdx, 'weightKg', newW);
  };

  const handleAdjustReps = (exIdx: number, setIdx: number, delta: number) => {
    const currentR = Number(activeExercises[exIdx].sets[setIdx].reps) || 0;
    const newR = Math.max(1, currentR + delta);
    handleUpdateSet(exIdx, setIdx, 'reps', newR);
  };

  // Copy parameters from the previous set
  const handleCopyFromPreviousSet = (exIdx: number, setIdx: number) => {
    if (setIdx === 0) return;
    const prev = activeExercises[exIdx].sets[setIdx - 1];
    const updated = [...activeExercises];
    updated[exIdx].sets[setIdx].weightKg = prev.weightKg;
    updated[exIdx].sets[setIdx].reps = prev.reps;
    updated[exIdx].sets[setIdx].durationMinutes = prev.durationMinutes;
    updated[exIdx].sets[setIdx].distanceKm = prev.distanceKm;
    updated[exIdx].sets[setIdx].type = prev.type;
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

    const sessionDurationMin = Math.max(1, Math.round(elapsedSeconds / 60));

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
      durationMinutes: sessionDurationMin,
      createdAt: new Date(workoutDate).getTime() || Date.now(),
      notes: sessionNotes,
    };

    onSaveWorkout(newSession);
    setLastSavedSession(newSession);

    // Trigger celebration summary modal
    setCelebrationData({
      volumeKg: hudStats.totalVolume,
      completedSets: hudStats.completedSets,
      totalSets: hudStats.totalSets,
      durationMin: sessionDurationMin,
    });
  };

  // Barbell Plate Calculator breakdown
  const plateBreakdown = useMemo(() => {
    if (plateCalcWeight === null) return null;
    const totalW = plateCalcWeight;
    const barW = plateBarType;
    const netWeight = Math.max(0, totalW - barW);
    const sideWeight = netWeight / 2;
    const availablePlates = [25, 20, 15, 10, 5, 2.5, 1.25];
    const sidePlates: { weight: number; count: number }[] = [];
    let rem = sideWeight;

    for (const p of availablePlates) {
      if (rem >= p) {
        const c = Math.floor(rem / p);
        sidePlates.push({ weight: p, count: c });
        rem = Math.round((rem - c * p) * 100) / 100;
      }
    }

    return { totalW, barW, sideWeight, sidePlates, remainder: rem };
  }, [plateCalcWeight, plateBarType]);

  return (
    <div className="animate-fade-in">
      {/* ========================================================
          1. IMMERSIVE WORKOUT HUD DASHBOARD (实时训练抬头看板)
          ======================================================== */}
      <div className={`workout-hud-card ${isHudCompact ? 'compact' : ''}`}>
        <div className="hud-grid">
          {/* Time elapsed */}
          <div
            className="hud-stat-box"
            style={{ cursor: 'pointer' }}
            onClick={() => {
              setManualMinutesInput(Math.round(elapsedSeconds / 60).toString());
              setIsTimeEditModalOpen(true);
            }}
            title="点击修改或手动设置用时"
          >
            <div
              className="hud-stat-value green"
              style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
            >
              <span
                className={`hud-timer-dot ${isTimerRunning ? 'running' : 'paused'}`}
                title={isTimerRunning ? '正在计时' : '已暂停'}
              />
              {formatElapsed(elapsedSeconds)}
            </div>
            <div className="hud-stat-label">
              <span>{isTimerRunning ? '训练计时中' : elapsedSeconds > 0 ? '已暂停' : '点击开始'}</span>
              <div className="hud-timer-controls" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  className="hud-timer-btn"
                  onClick={() => setIsTimerRunning(!isTimerRunning)}
                  title={isTimerRunning ? '暂停计时' : '开始计时'}
                >
                  {isTimerRunning ? <Pause size={11} /> : <Play size={11} />}
                </button>
                <button
                  type="button"
                  className="hud-timer-btn danger"
                  onClick={() => {
                    setElapsedSeconds(0);
                    setIsTimerRunning(false);
                  }}
                  title="重置计时为 00:00"
                >
                  <RotateCcw size={11} />
                </button>
              </div>
            </div>
          </div>

          {/* Total Volume */}
          <div className="hud-stat-box primary">
            <div className="hud-stat-value green">
              {hudStats.totalVolume > 1000
                ? (hudStats.totalVolume / 1000).toFixed(1) + ' t'
                : hudStats.totalVolume + ' kg'}
            </div>
            <div className="hud-stat-label">
              <Dumbbell size={10} />
              <span>今日总负荷</span>
            </div>
          </div>

          {/* Sets Progress */}
          <div className="hud-stat-box cyan">
            <div className="hud-stat-value cyan">
              {hudStats.completedSets} / {hudStats.totalSets}
            </div>
            <div className="hud-stat-label">
              <span>完成组数</span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="hud-progress-wrapper">
          <div className="hud-progress-track">
            <div
              className="hud-progress-fill"
              style={{ width: `${Math.max(5, hudStats.progressPct)}%` }}
            />
          </div>
          <div className="hud-progress-text">
            <span>训练进度 {hudStats.progressPct}%</span>
            <span>
              {hudStats.completedSets === hudStats.totalSets && hudStats.totalSets > 0
                ? '🔥 全组完成，准备收官！'
                : `剩余 ${hudStats.totalSets - hudStats.completedSets} 组`}
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================
          2. WORKOUT TITLE & DATE PILLS (轻量快捷标题栏)
          ======================================================== */}
      <div className="card" style={{ marginBottom: '12px', padding: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              🎯 今日训练计划
            </span>
          </div>
          <div style={{ width: '130px' }}>
            <input
              type="date"
              value={workoutDate}
              onChange={(e) => setWorkoutDate(e.target.value)}
              style={{ width: '100%', padding: '4px 6px', fontSize: '0.78rem' }}
            />
          </div>
        </div>

        {/* Template Quick Launcher Bar */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
          <button
            type="button"
            className="btn-secondary"
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '6px 10px',
              fontSize: '0.76rem',
              color: 'var(--accent-primary)',
              borderColor: 'var(--accent-primary)',
              background: 'rgba(59, 130, 246, 0.05)',
            }}
            onClick={() => setIsTemplateModalOpen(true)}
          >
            <Layers size={14} />
            <span>训练计划模版库 ({templates.length}套)</span>
          </button>
          <button
            type="button"
            className="btn-secondary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 10px',
              fontSize: '0.74rem',
            }}
            onClick={handleSaveCurrentAsTemplate}
            title="将当前动作另存为模版"
          >
            <span>💾 存为模版</span>
          </button>
        </div>

        {/* Quick Title Tags */}
        <div className="category-scroll-container" style={{ paddingBottom: '4px' }}>
          {QUICK_TITLES.map((t) => (
            <button
              key={t}
              type="button"
              className={`pill-btn ${workoutTitle === t ? 'active' : ''}`}
              style={{ padding: '3px 9px', fontSize: '0.74rem' }}
              onClick={() => setWorkoutTitle(t)}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {savedSuccessMsg && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: '10px',
            backgroundColor: 'var(--accent-primary-glow)',
            border: '1px solid var(--accent-primary)',
            color: 'var(--accent-primary)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '12px',
            fontSize: '0.88rem',
            fontWeight: 600,
          }}
        >
          <CheckCircle2 size={18} />
          {savedSuccessMsg}
        </div>
      )}

      {/* ========================================================
          3. EXERCISE CARDS & COMPACT SETS TABLE (紧凑专业矩阵)
          ======================================================== */}
      {activeExercises.map((exerciseEntry, exIdx) => {
        const catInfo = MUSCLE_GROUP_LABELS[exerciseEntry.category] || { label: '其他', icon: '⚡' };
        const lastSets = getLastWorkoutSets(exerciseEntry.exerciseId);
        const isPinned = pinnedExerciseIds.includes(exerciseEntry.exerciseId);
        const isCardio = exerciseEntry.category === 'cardio' || exerciseEntry.isCardio;
        const currentExerciseObj = allExercises.find((e) => e.id === exerciseEntry.exerciseId);
        const isTipsOpen = openTipsExId === exerciseEntry.id;
        const categoryTips = MUSCLE_TIPS[exerciseEntry.category] || MUSCLE_TIPS.chest;

        return (
          <div
            key={exerciseEntry.id}
            className="card"
            style={{ padding: '12px 14px', marginBottom: '12px' }}
          >
            {/* Card Header */}
            <div className="card-title-row" style={{ marginBottom: '8px' }}>
              <div
                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}
                onClick={() => handleOpenPicker(exIdx)}
                title="点击更换动作"
              >
                <span style={{ fontSize: '1.25rem' }}>{catInfo.icon}</span>
                <div>
                  <div
                    style={{
                      fontSize: '1rem',
                      fontWeight: 800,
                      color: 'var(--text-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
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
                        有氧
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {catInfo.label} · 点击可更换动作
                  </div>
                </div>
              </div>

              {/* Action Buttons: Primary (Warmup, Substitute) + More Menu (Plate calc, Tips, Pin, Delete) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', position: 'relative' }}>
                {/* 🔥 Warm-up Sets Ladder Calculator */}
                {!isCardio && (
                  <button
                    type="button"
                    className="icon-btn"
                    style={{ width: '32px', height: '32px', color: '#f59e0b' }}
                    onClick={() => {
                      const firstSetWeight =
                        exerciseEntry.sets.find((s) => s.type !== 'warmup')?.weightKg ||
                        exerciseEntry.sets[0]?.weightKg ||
                        80;
                      setWarmupTargetEx({
                        exIdx,
                        name: exerciseEntry.exerciseName,
                        weight: firstSetWeight,
                      });
                    }}
                    title="计算科学阶梯热身组方案"
                  >
                    <Flame size={16} />
                  </button>
                )}

                {/* 🔁 Exercise Substitute Button */}
                <button
                  type="button"
                  className="icon-btn"
                  style={{ width: '32px', height: '32px', color: '#10b981' }}
                  onClick={() => {
                    setSubstituteTargetEx({
                      exIdx,
                      name: exerciseEntry.exerciseName,
                      category: exerciseEntry.category,
                    });
                  }}
                  title="器械被占？换个同肌群备选动作"
                >
                  <ArrowRightLeft size={16} />
                </button>

                {/* ··· More Actions Menu Trigger */}
                <div style={{ position: 'relative' }}>
                  <button
                    type="button"
                    className={`icon-btn ${activeMoreMenuExId === exerciseEntry.id ? 'active' : ''}`}
                    style={{ width: '32px', height: '32px', color: 'var(--text-secondary)' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMoreMenuExId(activeMoreMenuExId === exerciseEntry.id ? null : exerciseEntry.id);
                    }}
                    title="更多动作操作 (杠铃算片、动作要领、置顶、删除)"
                  >
                    <MoreHorizontal size={16} />
                  </button>

                  {/* Dropdown Menu */}
                  {activeMoreMenuExId === exerciseEntry.id && (
                    <div
                      className="exercise-more-dropdown animate-scale-in"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Plate Calculator */}
                      {currentExerciseObj?.equipment === 'barbell' && (
                        <button
                          type="button"
                          className="exercise-dropdown-item"
                          onClick={() => {
                            const firstSetWeight = exerciseEntry.sets[0]?.weightKg || 40;
                            setPlateCalcWeight(firstSetWeight);
                            setActiveMoreMenuExId(null);
                          }}
                        >
                          <Calculator size={15} color="var(--accent-primary)" />
                          <span>杠铃算片器 (配重)</span>
                        </button>
                      )}

                      {/* Tips */}
                      <button
                        type="button"
                        className="exercise-dropdown-item"
                        onClick={() => {
                          setOpenTipsExId(isTipsOpen ? null : exerciseEntry.id);
                          setActiveMoreMenuExId(null);
                        }}
                      >
                        <Lightbulb size={15} color="#f59e0b" />
                        <span>{isTipsOpen ? '收起动作要领' : '动作要领与指导'}</span>
                      </button>

                      {/* Pin */}
                      <button
                        type="button"
                        className="exercise-dropdown-item"
                        onClick={() => {
                          onTogglePinExercise(exerciseEntry.exerciseId);
                          setActiveMoreMenuExId(null);
                        }}
                      >
                        <Pin size={15} color={isPinned ? 'var(--accent-warning)' : 'var(--text-muted)'} />
                        <span>{isPinned ? '取消置顶动作' : '置顶此动作'}</span>
                      </button>

                      {/* Delete */}
                      {activeExercises.length > 1 && (
                        <button
                          type="button"
                          className="exercise-dropdown-item danger"
                          onClick={() => {
                            handleRemoveExercise(exIdx);
                            setActiveMoreMenuExId(null);
                          }}
                        >
                          <Trash2 size={15} color="var(--accent-danger)" />
                          <span>移除此训练动作</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Beginner Tips Collapsible Drawer */}
            {isTipsOpen && (
              <div className="exercise-tips-drawer">
                <div className="tips-title-row">
                  <span className="tips-title">
                    <Lightbulb size={14} /> 动作要领与新手避坑指导
                  </span>
                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                    onClick={() => setOpenTipsExId(null)}
                  >
                    <X size={14} />
                  </button>
                </div>
                <div className="tips-content">
                  {currentExerciseObj?.description && (
                    <div style={{ marginBottom: '6px', color: 'var(--accent-cyan)', fontWeight: 600 }}>
                      ⚡ 动作特点：{currentExerciseObj.description}
                    </div>
                  )}
                  <ul>
                    {categoryTips.keyPoints.map((pt, pIdx) => (
                      <li key={pIdx}>{pt}</li>
                    ))}
                  </ul>
                  <div style={{ marginTop: '6px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    💨 <strong>呼吸节奏</strong>：{categoryTips.breath}
                  </div>
                  <div style={{ marginTop: '4px', fontSize: '0.72rem', color: 'var(--accent-warning)' }}>
                    ⚠️ <strong>安全提示</strong>：{categoryTips.safety}
                  </div>
                </div>
              </div>
            )}

            {/* Previous Session Performance Reference */}
            {lastSets && lastSets.length > 0 && (
              <div
                className="hide-scrollbar"
                style={{
                  fontSize: '0.74rem',
                  color: 'var(--text-secondary)',
                  backgroundColor: 'var(--bg-subtle)',
                  border: '1px solid var(--border-subtle)',
                  padding: '5px 10px',
                  borderRadius: '6px',
                  marginBottom: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  overflowX: 'auto',
                  overscrollBehaviorX: 'contain',
                }}
              >
                <span style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>📌 上次参考:</span>
                {isCardio
                  ? lastSets
                      .map(
                        (s, idx) =>
                          `#${idx + 1}: ${s.durationMinutes || 0}分 ${s.distanceKm ? s.distanceKm + 'km' : ''}`
                      )
                      .join(' | ')
                  : lastSets.map((s, idx) => `#${idx + 1}: ${s.weightKg}kg×${s.reps}`).join(' | ')}
              </div>
            )}

            {/* ===================================================
                COMPACT SETS TABLE (紧凑型表格视图)
                =================================================== */}
            <div className="compact-table-container">
              {/* Table Header */}
              <div className="compact-table-head">
                <div className="col-set-num">组</div>
                <div className="col-prev">前次参考</div>
                <div className="col-weight">{isCardio ? '时长 (分)' : '重量 (kg)'}</div>
                <div className="col-reps">{isCardio ? '距离 (km)' : '次数 (次)'}</div>
                <div className="col-check">完成</div>
              </div>

              {/* Table Body Rows */}
              {exerciseEntry.sets.map((set, setIdx) => {
                const rowKey = `${exIdx}_${setIdx}`;
                const isActive = activeRowKey === rowKey;
                const prevSet = lastSets && lastSets[setIdx];
                const setTypeInfo = SET_TYPE_LABELS[set.type || 'normal'];

                return (
                  <div
                    key={set.id}
                    className={`compact-set-row-wrapper ${isActive ? 'active' : ''}`}
                  >
                    <div
                      className={`compact-set-row ${set.isCompleted ? 'completed' : ''}`}
                      onClick={() => setActiveRowKey(isActive ? null : rowKey)}
                    >
                      {/* Set Number & Type Badge */}
                      <div
                        className="col-set-num"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Cycle set type: normal -> warmup -> drop -> failure
                          const types: SetType[] = ['normal', 'warmup', 'drop', 'failure'];
                          const curIdx = types.indexOf(set.type || 'normal');
                          const nextType = types[(curIdx + 1) % types.length];
                          handleUpdateSet(exIdx, setIdx, 'type', nextType);
                        }}
                        title="点击可切换组属性 (正式/热身/递减/力竭)"
                      >
                        <div className={`set-index-badge ${setTypeInfo.className}`}>
                          {setTypeInfo.badge || set.setNumber}
                        </div>
                        {setTypeInfo.badge && (
                          <div className="set-type-hint">{setTypeInfo.label}</div>
                        )}
                      </div>

                      {/* Previous Session Hint with Interactive Ghost Fill & Overload */}
                      <div className="col-prev" onClick={(e) => e.stopPropagation()}>
                        {isCardio ? (
                          prevSet ? (
                            <button
                              type="button"
                              className="ghost-fill-chip"
                              title="点击一键填入上次数据"
                              onClick={() => {
                                handleUpdateSet(
                                  exIdx,
                                  setIdx,
                                  'durationMinutes',
                                  prevSet.durationMinutes || 0
                                );
                                if (prevSet.distanceKm) {
                                  handleUpdateSet(
                                    exIdx,
                                    setIdx,
                                    'distanceKm',
                                    prevSet.distanceKm
                                  );
                                }
                              }}
                            >
                              {prevSet.durationMinutes || 0}分{' '}
                              {prevSet.distanceKm ? `${prevSet.distanceKm}k` : ''}
                            </button>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>-</span>
                          )
                        ) : prevSet && prevSet.weightKg > 0 ? (
                          <div className="ghost-set-wrapper">
                            <button
                              type="button"
                              className="ghost-fill-chip"
                              title="点击一键填入上次数据"
                              onClick={() => {
                                handleUpdateSet(exIdx, setIdx, 'weightKg', prevSet.weightKg);
                                handleUpdateSet(exIdx, setIdx, 'reps', prevSet.reps);
                              }}
                            >
                              {prevSet.weightKg}kg×{prevSet.reps}
                            </button>
                            <button
                              type="button"
                              className="ghost-overload-chip"
                              title="上次重量 +2.5kg 渐进超负荷"
                              onClick={() => {
                                handleUpdateSet(
                                  exIdx,
                                  setIdx,
                                  'weightKg',
                                  (prevSet.weightKg || 0) + 2.5
                                );
                                handleUpdateSet(exIdx, setIdx, 'reps', prevSet.reps);
                              }}
                            >
                              +2.5
                            </button>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>-</span>
                        )}
                      </div>

                      {/* Weight / Duration Input */}
                      <div className="col-weight" onClick={(e) => e.stopPropagation()}>
                        {isCardio ? (
                          <input
                            type="number"
                            step="1"
                            min="1"
                            className="compact-input-field"
                            value={set.durationMinutes || ''}
                            placeholder="30"
                            onFocus={() => setActiveRowKey(rowKey)}
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
                        ) : (
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            className="compact-input-field"
                            value={set.weightKg === 0 ? '' : set.weightKg}
                            placeholder="0"
                            onFocus={() => setActiveRowKey(rowKey)}
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
                        )}
                      </div>

                      {/* Reps / Distance Input */}
                      <div className="col-reps" onClick={(e) => e.stopPropagation()}>
                        {isCardio ? (
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            className="compact-input-field cyan"
                            value={set.distanceKm || ''}
                            placeholder="5.0"
                            onFocus={() => setActiveRowKey(rowKey)}
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
                        ) : (
                          <input
                            type="number"
                            step="1"
                            min="1"
                            className="compact-input-field cyan"
                            value={set.reps === 0 ? '' : set.reps}
                            placeholder="10"
                            onFocus={() => setActiveRowKey(rowKey)}
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
                        )}
                      </div>

                      {/* Check Completion Button */}
                      <div className="col-check" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className={`check-btn-compact ${set.isCompleted ? 'checked' : ''}`}
                          onClick={() => handleToggleSetComplete(exIdx, setIdx)}
                          title={set.isCompleted ? '已完成' : '打勾完成并触发组间休息'}
                        >
                          <Check size={18} />
                        </button>
                      </div>
                    </div>

                    {/* ===================================================
                        INLINE MICRO-STEPPER DOCK (仅激活组展开微调盘)
                        =================================================== */}
                    {isActive && (
                      <div className="inline-stepper-dock">
                        {isCardio ? (
                          // Cardio Adjustments
                          <>
                            <div className="dock-row">
                              <span className="dock-label">⏱️ 时长调整:</span>
                              <div style={{ display: 'flex', gap: '4px' }}>
                                {[-5, -1, 1, 5].map((delta) => (
                                  <button
                                    key={delta}
                                    type="button"
                                    className="dock-pill-btn"
                                    onClick={() => {
                                      const cur = Number(set.durationMinutes) || 30;
                                      handleUpdateSet(
                                        exIdx,
                                        setIdx,
                                        'durationMinutes',
                                        Math.max(1, cur + delta)
                                      );
                                    }}
                                  >
                                    {delta > 0 ? `+${delta}分` : `${delta}分`}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div className="dock-row">
                              <span className="dock-label">🏃 距离调整:</span>
                              <div style={{ display: 'flex', gap: '4px' }}>
                                {[-1, -0.5, 0.5, 1].map((delta) => (
                                  <button
                                    key={delta}
                                    type="button"
                                    className="dock-pill-btn"
                                    onClick={() => {
                                      const cur = Number(set.distanceKm) || 0;
                                      handleUpdateSet(
                                        exIdx,
                                        setIdx,
                                        'distanceKm',
                                        Math.max(0, Math.round((cur + delta) * 10) / 10)
                                      );
                                    }}
                                  >
                                    {delta > 0 ? `+${delta}k` : `${delta}k`}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </>
                        ) : (
                          // Strength Adjustments
                          <>
                            <div className="dock-row">
                              <span className="dock-label">🏋️ 重量微调:</span>
                              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                {[-5, -2.5, -1.25, 1.25, 2.5, 5].map((delta) => (
                                  <button
                                    key={delta}
                                    type="button"
                                    className="dock-pill-btn"
                                    onClick={() => handleAdjustWeight(exIdx, setIdx, delta)}
                                  >
                                    {delta > 0 ? `+${delta}` : `${delta}`}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div className="dock-row">
                              <span className="dock-label">🔄 次数微调:</span>
                              <div style={{ display: 'flex', gap: '4px' }}>
                                {[-2, -1, 1, 2].map((delta) => (
                                  <button
                                    key={delta}
                                    type="button"
                                    className="dock-pill-btn"
                                    onClick={() => handleAdjustReps(exIdx, setIdx, delta)}
                                  >
                                    {delta > 0 ? `+${delta}次` : `${delta}次`}
                                  </button>
                                ))}
                              </div>

                              {/* Copy from previous set */}
                              {setIdx > 0 && (
                                <button
                                  type="button"
                                  className="dock-pill-btn copy"
                                  onClick={() => handleCopyFromPreviousSet(exIdx, setIdx)}
                                  title="复制上一组的重量和次数"
                                >
                                  <Copy size={11} style={{ display: 'inline', marginRight: 2 }} />
                                  同上一组
                                </button>
                              )}
                            </div>

                            <div className="dock-row" style={{ paddingTop: '2px' }}>
                              <span className="dock-label">🏷️ 组别属性:</span>
                              <div className="dock-type-selector">
                                {(Object.keys(SET_TYPE_LABELS) as SetType[]).map((t) => (
                                  <button
                                    key={t}
                                    type="button"
                                    className={`type-pill ${set.type === t ? 'active' : ''}`}
                                    onClick={() => handleUpdateSet(exIdx, setIdx, 'type', t)}
                                  >
                                    {SET_TYPE_LABELS[t].label}
                                  </button>
                                ))}
                              </div>

                              {currentExerciseObj?.equipment === 'barbell' && (
                                <button
                                  type="button"
                                  className="dock-pill-btn"
                                  style={{ color: 'var(--accent-primary)', borderColor: 'var(--accent-primary-glow)' }}
                                  onClick={() => setPlateCalcWeight(set.weightKg || 40)}
                                >
                                  <Calculator size={11} style={{ display: 'inline', marginRight: 2 }} />
                                  算片器
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Set Management Row */}
            <div className="sets-manage-row" style={{ marginTop: '8px' }}>
              <button
                type="button"
                className="btn-manage-set btn-add-set"
                onClick={() => handleAddSet(exIdx)}
              >
                <Plus size={15} />
                <span>{isCardio ? '添加有氧段落' : '添加一组'}</span>
              </button>

              <button
                type="button"
                className="btn-manage-set btn-del-set"
                disabled={exerciseEntry.sets.length <= 1}
                onClick={() => {
                  if (exerciseEntry.sets.length > 1) {
                    handleRemoveSet(exIdx, exerciseEntry.sets.length - 1);
                  }
                }}
                title={exerciseEntry.sets.length <= 1 ? '至少保留一组' : '删除末尾组'}
              >
                <Minus size={15} />
                <span>删除末组</span>
              </button>
            </div>
          </div>
        );
      })}

      {/* ========================================================
          4. BOTTOM ACTIONS (组合动作 & 保存训练)
          ======================================================== */}
      <div style={{ display: 'flex', gap: '10px', marginTop: '14px', marginBottom: '24px' }}>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => handleOpenPicker(null)}
          style={{ padding: '12px' }}
        >
          <Plus size={18} />
          组合下一个动作
        </button>

        <button
          type="button"
          className="btn-primary"
          onClick={handleSave}
          style={{ flex: 1.2, padding: '12px' }}
        >
          <CheckCircle2 size={18} />
          完成并保存训练
        </button>
      </div>

      {/* ========================================================
          5. MODAL: WORKOUT TIMER ADJUSTMENT (用时调节/重置弹窗)
          ======================================================== */}
      {isTimeEditModalOpen && (
        <div className="modal-overlay" onClick={() => setIsTimeEditModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '360px' }}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Timer size={18} color="var(--accent-primary)" />
                调整训练用时
              </h3>
              <button
                className="icon-btn"
                style={{ width: '32px', height: '32px' }}
                onClick={() => setIsTimeEditModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body" style={{ padding: '16px 0' }}>
              <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                <div style={{ fontSize: '2.2rem', fontWeight: 900, fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)' }}>
                  {formatElapsed(elapsedSeconds)}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  状态：{isTimerRunning ? '🔥 正在计时中' : elapsedSeconds > 0 ? '⏸️ 已暂停' : '⏹️ 未开始'}
                </div>
              </div>

              {/* Quick Presets */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
                  快捷设定用时：
                </label>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {[
                    { m: 0, label: '重置为 00:00' },
                    { m: 15, label: '15分钟' },
                    { m: 30, label: '30分钟' },
                    { m: 45, label: '45分钟' },
                    { m: 60, label: '60分钟' },
                    { m: 90, label: '90分钟' },
                  ].map((item) => (
                    <button
                      key={item.m}
                      type="button"
                      className={`dock-pill-btn ${Math.round(elapsedSeconds / 60) === item.m ? 'copy' : ''}`}
                      onClick={() => {
                        setElapsedSeconds(item.m * 60);
                        if (item.m === 0) setIsTimerRunning(false);
                      }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Increments */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
                  微调增加 / 减少：
                </label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {[-10, -5, 5, 10].map((delta) => (
                    <button
                      key={delta}
                      type="button"
                      className="dock-pill-btn"
                      style={{ flex: 1 }}
                      onClick={() => {
                        setElapsedSeconds((prev) => Math.max(0, prev + delta * 60));
                      }}
                    >
                      {delta > 0 ? `+${delta}分钟` : `${delta}分钟`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Manual Input */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
                  手动输入分钟数：
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="number"
                    min="0"
                    placeholder="例如 45"
                    value={manualMinutesInput}
                    onChange={(e) => setManualMinutesInput(e.target.value)}
                    style={{ flex: 1, padding: '8px 10px', fontSize: '0.9rem' }}
                  />
                  <button
                    type="button"
                    className="btn-primary"
                    style={{ padding: '8px 16px', fontSize: '0.82rem' }}
                    onClick={() => {
                      const mins = parseInt(manualMinutesInput, 10);
                      if (!isNaN(mins) && mins >= 0) {
                        setElapsedSeconds(mins * 60);
                        setIsTimeEditModalOpen(false);
                      }
                    }}
                  >
                    应用
                  </button>
                </div>
              </div>

              {/* Timer State Toggle */}
              <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid var(--border-subtle)', paddingTop: '14px' }}>
                <button
                  type="button"
                  className={isTimerRunning ? 'btn-secondary' : 'btn-primary'}
                  style={{ flex: 1, padding: '10px' }}
                  onClick={() => setIsTimerRunning(!isTimerRunning)}
                >
                  {isTimerRunning ? <Pause size={15} /> : <Play size={15} />}
                  <span>{isTimerRunning ? '暂停计时' : '开始计时'}</span>
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ flex: 1, padding: '10px', color: 'var(--accent-danger)' }}
                  onClick={() => {
                    setElapsedSeconds(0);
                    setIsTimerRunning(false);
                    setIsTimeEditModalOpen(false);
                  }}
                >
                  <RotateCcw size={15} />
                  <span>归零重置</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          6. MODAL: BARBELL PLATE CALCULATOR (杠铃算片器图解)
          ======================================================== */}
      {plateCalcWeight !== null && plateBreakdown && (
        <div className="modal-overlay" onClick={() => setPlateCalcWeight(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Calculator size={18} color="var(--accent-primary)" />
                杠铃配重算片器 (Plate Calculator)
              </h3>
              <button
                className="icon-btn"
                style={{ width: '32px', height: '32px' }}
                onClick={() => setPlateCalcWeight(null)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body plate-calc-container">
              {/* Total Display */}
              <div className="plate-summary-hero">
                <div className="plate-total-display">{plateCalcWeight} kg</div>
                <div className="plate-formula-display">
                  = {plateBarType}kg 空杆 + 两侧各挂 {plateBreakdown.sideWeight} kg
                </div>
              </div>

              {/* Barbell Type Selector */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
                  选择杠铃杆规格：
                </label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {[
                    { w: 20, label: '标准奥杆 (20kg)' },
                    { w: 15, label: '短杆/女 (15kg)' },
                    { w: 10, label: 'EZ曲杆 (10kg)' },
                    { w: 0, label: '史密斯/自重0' },
                  ].map((item) => (
                    <button
                      key={item.w}
                      type="button"
                      className={`type-pill ${plateBarType === item.w ? 'active' : ''}`}
                      style={{ flex: 1, padding: '6px 2px', fontSize: '0.7rem' }}
                      onClick={() => setPlateBarType(item.w)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Visual Breakdown */}
              <div style={{ background: 'var(--bg-surface)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: '8px', color: 'var(--text-primary)' }}>
                  单侧需挂铁片清单（两侧完全对称）：
                </div>

                {plateBreakdown.sidePlates.length === 0 ? (
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textAlign: 'center', padding: '10px' }}>
                    无需加片，直接推空杆即可！
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {plateBreakdown.sidePlates.map((item) => {
                      const cls = item.weight >= 25 ? 'plate-25' : item.weight >= 20 ? 'plate-20' : item.weight >= 15 ? 'plate-15' : item.weight >= 10 ? 'plate-10' : item.weight >= 5 ? 'plate-5' : item.weight >= 2.5 ? 'plate-2_5' : 'plate-1_25';
                      return (
                        <div key={item.weight} className={`plate-chip-pill ${cls}`}>
                          {item.weight} kg × {item.count}片
                        </div>
                      );
                    })}
                  </div>
                )}

                {plateBreakdown.remainder > 0 && (
                  <div style={{ fontSize: '0.72rem', color: 'var(--accent-warning)', marginTop: '8px' }}>
                    ⚠️ 尚有 {plateBreakdown.remainder * 2}kg 配重因最小铁片规格（1.25kg）无法整除。
                  </div>
                )}
              </div>

              {/* Quick Weight Adjust Steppers */}
              <div style={{ marginTop: '16px' }}>
                <label style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
                  快速切换目标重量：
                </label>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {[20, 30, 40, 50, 60, 70, 80, 100].map((w) => (
                    <button
                      key={w}
                      type="button"
                      className={`dock-pill-btn ${plateCalcWeight === w ? 'copy' : ''}`}
                      onClick={() => setPlateCalcWeight(w)}
                    >
                      {w}kg
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          6. MODAL: CELEBRATION SUMMARY (训练完成战报弹窗)
          ======================================================== */}
      {celebrationData && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ textAlign: 'center', padding: '24px 20px' }}>
            <div className="celebration-badge-hero">
              <Trophy size={36} color="var(--primary-text)" />
            </div>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-primary)', marginBottom: '6px' }}>
              🎉 训练大功告成！
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              今天又是战胜惰性、突破自我的一天，恭喜你完成全部训练！
            </p>

            <div className="celebration-stat-grid">
              <div className="celebration-stat-card">
                <div className="celebration-stat-val">
                  {celebrationData.volumeKg > 1000
                    ? (celebrationData.volumeKg / 1000).toFixed(2) + ' t'
                    : celebrationData.volumeKg + ' kg'}
                </div>
                <div className="celebration-stat-lbl">今日总负荷</div>
              </div>

              <div className="celebration-stat-card">
                <div className="celebration-stat-val" style={{ color: 'var(--accent-cyan)' }}>
                  {celebrationData.durationMin} 分钟
                </div>
                <div className="celebration-stat-lbl">训练总用时</div>
              </div>

              <div className="celebration-stat-card">
                <div className="celebration-stat-val" style={{ color: 'var(--accent-warning)' }}>
                  {celebrationData.completedSets} 组
                </div>
                <div className="celebration-stat-lbl">打卡完成组数</div>
              </div>

              <div className="celebration-stat-card">
                <div className="celebration-stat-val" style={{ color: 'var(--accent-purple)' }}>
                  ~{Math.round(celebrationData.durationMin * 7.5)} kcal
                </div>
                <div className="celebration-stat-lbl">预估消耗</div>
              </div>
            </div>

            <div className="quote-bubble">
              {MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)]}
            </div>

            {lastSavedSession && (
              <button
                type="button"
                className="btn-secondary"
                style={{
                  width: '100%',
                  marginTop: '12px',
                  padding: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  borderColor: 'var(--accent-warning)',
                  color: 'var(--accent-warning)',
                  background: 'rgba(245, 158, 11, 0.08)',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                }}
                onClick={() => {
                  setCelebrationData(null);
                  setIsPosterModalOpen(true);
                }}
              >
                <Share2 size={18} />
                <span>📸 生成高颜值打卡海报 (存图发圈)</span>
              </button>
            )}

            <button
              type="button"
              className="btn-primary"
              style={{ width: '100%', marginTop: '10px', padding: '12px' }}
              onClick={() => setCelebrationData(null)}
            >
              太棒了，完成记录！
            </button>
          </div>
        </div>
      )}

      {/* ========================================================
          7. MODAL: EXERCISE PICKER (动作选择器)
          ======================================================== */}
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
                placeholder="搜索动作、部位、器械 (如杠铃卧推、高位下拉)..."
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

            {/* Equipment Filter Pills */}
            <div className="category-scroll-container" style={{ marginTop: '6px', marginBottom: '10px' }}>
              <button
                className={`pill-btn ${selectedEquipment === 'all' ? 'active' : ''}`}
                onClick={() => setSelectedEquipment('all')}
                style={{ fontSize: '0.76rem', padding: '4px 10px' }}
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
                    style={{ fontSize: '0.76rem', padding: '4px 10px' }}
                  >
                    <span>{info.icon}</span>
                    <span>{info.label}</span>
                    <span style={{ fontSize: '0.65rem', opacity: 0.7 }}>({count})</span>
                  </button>
                );
              })}
            </div>

            {/* Exercise List */}
            <div className="modal-body smooth-scroll">
              <div
                style={{
                  fontSize: '0.74rem',
                  color: 'var(--text-muted)',
                  marginBottom: '8px',
                  padding: '0 4px',
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <span>可选动作 ({filteredExercises.length})</span>
                {(selectedCategory !== 'all' || selectedEquipment !== 'all' || searchQuery) && (
                  <span
                    style={{ color: 'var(--accent-primary)', cursor: 'pointer' }}
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
              {filteredExercises.map((ex) => {
                const catInfo = MUSCLE_GROUP_LABELS[ex.category] || { label: '其他', icon: '⚡' };
                const eqInfo = EQUIPMENT_LABELS[ex.equipment] || { label: ex.equipment, icon: '⚙️' };
                const isPinned = pinnedExerciseIds.includes(ex.id);
                const isCardio = ex.category === 'cardio' || ex.isCardio;

                return (
                  <div
                    key={ex.id}
                    className="exercise-select-item"
                    style={{
                      borderLeft: isPinned
                        ? '3px solid var(--accent-warning)'
                        : isCardio
                        ? '3px solid var(--muscle-cardio)'
                        : undefined,
                      backgroundColor: isPinned ? 'rgba(245, 158, 11, 0.05)' : undefined,
                    }}
                    onClick={() => handleSelectExercise(ex)}
                  >
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: '0.95rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
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
                      <div
                        style={{
                          fontSize: '0.74rem',
                          color: 'var(--text-muted)',
                          marginTop: '3px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          flexWrap: 'wrap',
                        }}
                      >
                        <span>{catInfo.label}</span>
                        <span>·</span>
                        <span>
                          {eqInfo.icon} {eqInfo.label}
                        </span>
                        {ex.nameEn && <span style={{ opacity: 0.65 }}>· {ex.nameEn}</span>}
                      </div>
                      {ex.description && (
                        <div
                          style={{
                            fontSize: '0.72rem',
                            color: 'var(--text-secondary)',
                            marginTop: '4px',
                            opacity: 0.85,
                            lineHeight: 1.3,
                          }}
                        >
                          {ex.description}
                        </div>
                      )}
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

      {/* ========================================================
          8. NEW MODALS: WARMUP, SUBSTITUTE, TEMPLATES, POSTER
          ======================================================== */}
      {warmupTargetEx && (
        <WarmupCalculatorModal
          isOpen={true}
          exerciseName={warmupTargetEx.name}
          initialWeight={warmupTargetEx.weight}
          onClose={() => setWarmupTargetEx(null)}
          onApplyWarmupSets={handleApplyWarmupSets}
        />
      )}

      {substituteTargetEx && (
        <ExerciseSubstituteModal
          isOpen={true}
          currentExerciseName={substituteTargetEx.name}
          category={substituteTargetEx.category}
          allExercises={allExercises}
          onClose={() => setSubstituteTargetEx(null)}
          onSubstitute={handleSubstituteExercise}
        />
      )}

      <TemplateManagerModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        templates={templates}
        onApplyTemplate={handleApplyTemplate}
        onDeleteTemplate={(id) => {
          if (onDeleteTemplate) onDeleteTemplate(id);
        }}
        onSaveCurrentAsTemplate={handleSaveCurrentAsTemplate}
      />

      {lastSavedSession && (
        <WorkoutPosterModal
          isOpen={isPosterModalOpen}
          onClose={() => setIsPosterModalOpen(false)}
          workout={lastSavedSession}
        />
      )}
    </div>
  );
};
