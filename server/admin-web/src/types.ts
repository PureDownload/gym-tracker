export interface AuthUser {
  id: string;
  username: string;
  role: 'admin' | 'user';
  status?: string;
}

export interface KPIStats {
  totalUsers: number;
  activeUsers7d: number;
  totalWorkouts: number;
  totalVolumeKg: number;
  totalTonnage: number;
  totalCustomExercises: number;
  totalTemplates: number;
  totalBodyMetrics: number;
  todayWorkoutsCount: number;
}

export interface TrendDay {
  date: string;
  count: number;
  volume: number;
}

export interface MuscleItem {
  name: string;
  value: number;
}

export interface RecentWorkoutItem {
  id: string;
  userId: string;
  username: string;
  date: string;
  title: string;
  durationMinutes: number;
  exerciseCount: number;
  volumeKg: number;
  createdAt: number;
}

export interface StrengthRecord {
  exercise: string;
  max1RM: number;
  weight: number;
  reps: number;
  username: string;
  date: string;
}

export interface SystemInfo {
  dbSizeBytes: number;
  walSizeBytes: number;
  dbSizeFormatted: string;
  walSizeFormatted: string;
  serverUptimeSeconds: number;
  nodeVersion: string;
  memoryUsageMb: number;
}

export interface OverviewData {
  kpis: KPIStats;
  trend30Days: TrendDay[];
  muscleDistribution: MuscleItem[];
  recentWorkouts: RecentWorkoutItem[];
  strengthRecords: StrengthRecord[];
  systemInfo: SystemInfo;
}

export interface AdminUser {
  id: string;
  username: string;
  role: 'admin' | 'user';
  status: 'active' | 'disabled';
  lastLoginAt: number | null;
  createdAt: number;
  updatedAt: number;
  workoutCount: number;
  lastWorkoutDate: string | null;
  customExerciseCount: number;
  templateCount: number;
  bodyMetricCount: number;
  totalVolumeKg: number;
}

export interface WorkoutSet {
  weight: number;
  reps: number;
  completed?: boolean;
  rpe?: number;
}

export interface WorkoutExercise {
  name?: string;
  exerciseName?: string;
  muscle?: string;
  targetMuscle?: string;
  sets: WorkoutSet[];
}

export interface AdminWorkout {
  id: string;
  userId: string;
  username: string;
  date: string;
  title: string;
  durationMinutes: number;
  notes: string;
  totalSets: number;
  volumeKg: number;
  exercisesCount: number;
  exercises: WorkoutExercise[];
  createdAt: number;
  updatedAt: number;
}

export interface AdminBodyMetric {
  id: string;
  userId: string;
  username: string;
  date: string;
  weightKg: number | null;
  bodyFatPercent: number | null;
  measurements: Record<string, number>;
  notes: string | null;
  createdAt: number;
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}
