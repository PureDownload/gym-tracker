export type MuscleGroup = 'chest' | 'back' | 'legs' | 'shoulders' | 'arms' | 'core' | 'cardio';

export type EquipmentType = 'barbell' | 'dumbbell' | 'cable' | 'machine' | 'bodyweight' | 'other';

export type SetType = 'normal' | 'warmup' | 'drop' | 'failure';

export interface Exercise {
  id: string;
  name: string;
  nameEn?: string;
  category: MuscleGroup;
  equipment: EquipmentType;
  description?: string;
  isCustom?: boolean;
  isCardio?: boolean;
}

export interface WorkoutSet {
  id: string;
  setNumber: number;
  // Strength metrics
  weightKg: number;
  reps: number;
  type: SetType;
  rpe?: number; // 6-10 自感用力度

  // Cardio metrics (有氧专用参数)
  durationMinutes?: number;    // 时长 (分钟)
  distanceKm?: number;         // 距离 (公里)
  caloriesKcal?: number;       // 消耗热量 (千卡)
  heartRateBpm?: number;       // 平均心率 (bpm)
  inclineOrResistance?: number;// 坡度 / 阻力档位

  isCompleted: boolean;
  notes?: string;
}

export interface WorkoutExercise {
  id: string;
  exerciseId: string;
  exerciseName: string;
  category: MuscleGroup;
  isCardio?: boolean;
  sets: WorkoutSet[];
  notes?: string;
}

export interface WorkoutSession {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  exercises: WorkoutExercise[];
  durationMinutes?: number;
  createdAt: number;
  notes?: string;
}

export interface ExerciseHistoryPoint {
  date: string;
  timestamp: number;
  // Strength metrics
  maxWeight: number;
  estimated1RM: number;
  totalVolume: number;
  // Cardio metrics
  durationMinutes: number;
  distanceKm: number;
  caloriesKcal: number;
  paceMinPerKm?: number; // 配速: 分钟/公里
  bestSet: string;
  setsCount: number;
}

export interface OverloadAnalysis {
  exerciseId: string;
  exerciseName: string;
  category: MuscleGroup;
  isCardio: boolean;
  currentMaxWeight: number;
  currentEstimated1RM: number;
  currentVolume: number;
  currentDurationMinutes: number;
  currentDistanceKm: number;
  previousMaxWeight?: number;
  previousEstimated1RM?: number;
  previousVolume?: number;
  previousDurationMinutes?: number;
  previousDistanceKm?: number;
  weightDelta: number;
  rmDelta: number;
  volumeDeltaPercent: number;
  status: 'increase' | 'maintain' | 'decrease' | 'first_time';
  statusBadge: string;
  statusColor: string;
  recommendationTitle: string;
  recommendationDetail: string;
  targetNextWeight: number;
  historyPoints: ExerciseHistoryPoint[];
}
