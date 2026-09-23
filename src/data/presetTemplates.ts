import type { WorkoutTemplate } from '../types/workout';

export const PRESET_TEMPLATES: WorkoutTemplate[] = [
  {
    id: 'preset_ppl_push',
    name: '经典 PPL - 推胸肩三头 (Push Day)',
    category: 'ppl',
    description: '主打胸大肌、三角肌前中束与肱三头肌。复合动作大重量启动，孤立动作高泵感收尾。',
    isPreset: true,
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
    exercises: [
      {
        exerciseId: 'chest_barbell_bench_press',
        exerciseName: '平板杠铃卧推',
        category: 'chest',
        defaultSets: [
          { setNumber: 1, weightKg: 20, reps: 12, type: 'warmup' },
          { setNumber: 2, weightKg: 60, reps: 5, type: 'warmup' },
          { setNumber: 3, weightKg: 80, reps: 8, type: 'normal', rpe: 8 },
          { setNumber: 4, weightKg: 80, reps: 8, type: 'normal', rpe: 8.5 },
          { setNumber: 5, weightKg: 80, reps: 6, type: 'normal', rpe: 9 },
        ],
      },
      {
        exerciseId: 'chest_incline_dumbbell_press',
        exerciseName: '上斜哑铃卧推',
        category: 'chest',
        defaultSets: [
          { setNumber: 1, weightKg: 22.5, reps: 10, type: 'normal', rpe: 8 },
          { setNumber: 2, weightKg: 22.5, reps: 10, type: 'normal', rpe: 8.5 },
          { setNumber: 3, weightKg: 22.5, reps: 8, type: 'normal', rpe: 9 },
        ],
      },
      {
        exerciseId: 'shoulders_seated_dumbbell_press',
        exerciseName: '坐姿哑铃推举',
        category: 'shoulders',
        defaultSets: [
          { setNumber: 1, weightKg: 17.5, reps: 10, type: 'normal', rpe: 8 },
          { setNumber: 2, weightKg: 17.5, reps: 10, type: 'normal', rpe: 8.5 },
          { setNumber: 3, weightKg: 17.5, reps: 8, type: 'normal', rpe: 9 },
        ],
      },
      {
        exerciseId: 'shoulders_dumbbell_lateral_raise',
        exerciseName: '哑铃侧平举',
        category: 'shoulders',
        defaultSets: [
          { setNumber: 1, weightKg: 7.5, reps: 15, type: 'normal', rpe: 8 },
          { setNumber: 2, weightKg: 7.5, reps: 12, type: 'normal', rpe: 8.5 },
          { setNumber: 3, weightKg: 7.5, reps: 12, type: 'drop', rpe: 10 },
        ],
      },
      {
        exerciseId: 'arms_cable_rope_pushdown',
        exerciseName: '绳索三头下压',
        category: 'arms',
        defaultSets: [
          { setNumber: 1, weightKg: 25, reps: 12, type: 'normal', rpe: 8 },
          { setNumber: 2, weightKg: 25, reps: 12, type: 'normal', rpe: 8.5 },
          { setNumber: 3, weightKg: 25, reps: 10, type: 'failure', rpe: 10 },
        ],
      },
    ],
  },
  {
    id: 'preset_ppl_pull',
    name: '经典 PPL - 拉背二头后束 (Pull Day)',
    category: 'ppl',
    description: '强化背阔肌、斜方肌、三角肌后束与肱二头肌，打造宽厚倒三角体魄。',
    isPreset: true,
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
    exercises: [
      {
        exerciseId: 'back_pull_up',
        exerciseName: '正握引体向上',
        category: 'back',
        defaultSets: [
          { setNumber: 1, weightKg: 0, reps: 10, type: 'normal', rpe: 8 },
          { setNumber: 2, weightKg: 0, reps: 8, type: 'normal', rpe: 8.5 },
          { setNumber: 3, weightKg: 0, reps: 8, type: 'normal', rpe: 9 },
        ],
      },
      {
        exerciseId: 'back_barbell_bent_over_row',
        exerciseName: '俯身杠铃划船',
        category: 'back',
        defaultSets: [
          { setNumber: 1, weightKg: 40, reps: 10, type: 'warmup' },
          { setNumber: 2, weightKg: 60, reps: 8, type: 'normal', rpe: 8 },
          { setNumber: 3, weightKg: 60, reps: 8, type: 'normal', rpe: 8.5 },
          { setNumber: 4, weightKg: 60, reps: 8, type: 'normal', rpe: 9 },
        ],
      },
      {
        exerciseId: 'back_lat_pulldown',
        exerciseName: '高位下拉',
        category: 'back',
        defaultSets: [
          { setNumber: 1, weightKg: 45, reps: 10, type: 'normal', rpe: 8 },
          { setNumber: 2, weightKg: 45, reps: 10, type: 'normal', rpe: 8.5 },
          { setNumber: 3, weightKg: 45, reps: 8, type: 'normal', rpe: 9 },
        ],
      },
      {
        exerciseId: 'shoulders_face_pull',
        exerciseName: '绳索面拉',
        category: 'shoulders',
        defaultSets: [
          { setNumber: 1, weightKg: 20, reps: 15, type: 'normal', rpe: 8 },
          { setNumber: 2, weightKg: 20, reps: 15, type: 'normal', rpe: 8.5 },
          { setNumber: 3, weightKg: 20, reps: 15, type: 'normal', rpe: 9 },
        ],
      },
      {
        exerciseId: 'arms_barbell_biceps_curl',
        exerciseName: '杠铃二头弯举',
        category: 'arms',
        defaultSets: [
          { setNumber: 1, weightKg: 25, reps: 10, type: 'normal', rpe: 8 },
          { setNumber: 2, weightKg: 25, reps: 10, type: 'normal', rpe: 8.5 },
          { setNumber: 3, weightKg: 25, reps: 8, type: 'failure', rpe: 10 },
        ],
      },
    ],
  },
  {
    id: 'preset_ppl_legs',
    name: '经典 PPL - 下肢力量与爆发 (Legs Day)',
    category: 'ppl',
    description: '股四头肌、腘绳肌、臀大肌与小腿全覆盖。高能耗与力量基石。',
    isPreset: true,
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
    exercises: [
      {
        exerciseId: 'legs_barbell_back_squat',
        exerciseName: '杠铃后深蹲',
        category: 'legs',
        defaultSets: [
          { setNumber: 1, weightKg: 20, reps: 10, type: 'warmup' },
          { setNumber: 2, weightKg: 60, reps: 5, type: 'warmup' },
          { setNumber: 3, weightKg: 90, reps: 6, type: 'normal', rpe: 8 },
          { setNumber: 4, weightKg: 90, reps: 6, type: 'normal', rpe: 8.5 },
          { setNumber: 5, weightKg: 90, reps: 6, type: 'normal', rpe: 9 },
        ],
      },
      {
        exerciseId: 'legs_romanian_deadlift',
        exerciseName: '罗马尼亚硬拉 (RDL)',
        category: 'legs',
        defaultSets: [
          { setNumber: 1, weightKg: 60, reps: 10, type: 'normal', rpe: 8 },
          { setNumber: 2, weightKg: 70, reps: 8, type: 'normal', rpe: 8.5 },
          { setNumber: 3, weightKg: 70, reps: 8, type: 'normal', rpe: 9 },
        ],
      },
      {
        exerciseId: 'legs_leg_press',
        exerciseName: '45°倒蹬机 (Leg Press)',
        category: 'legs',
        defaultSets: [
          { setNumber: 1, weightKg: 120, reps: 12, type: 'normal', rpe: 8 },
          { setNumber: 2, weightKg: 140, reps: 10, type: 'normal', rpe: 8.5 },
          { setNumber: 3, weightKg: 140, reps: 10, type: 'normal', rpe: 9 },
        ],
      },
      {
        exerciseId: 'legs_seated_leg_curl',
        exerciseName: '坐姿腿弯举',
        category: 'legs',
        defaultSets: [
          { setNumber: 1, weightKg: 35, reps: 12, type: 'normal', rpe: 8 },
          { setNumber: 2, weightKg: 35, reps: 12, type: 'normal', rpe: 8.5 },
          { setNumber: 3, weightKg: 35, reps: 10, type: 'drop', rpe: 10 },
        ],
      },
    ],
  },
  {
    id: 'preset_upper_power',
    name: '上下肢分化 - 上肢力量日 (Upper Body)',
    category: 'upper_lower',
    description: '卧推、推举与划船等高强度水平/垂直推拉组合，兼顾力量与围度。',
    isPreset: true,
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
    exercises: [
      {
        exerciseId: 'chest_barbell_bench_press',
        exerciseName: '平板杠铃卧推',
        category: 'chest',
        defaultSets: [
          { setNumber: 1, weightKg: 20, reps: 12, type: 'warmup' },
          { setNumber: 2, weightKg: 75, reps: 6, type: 'normal', rpe: 8 },
          { setNumber: 3, weightKg: 75, reps: 6, type: 'normal', rpe: 8.5 },
          { setNumber: 4, weightKg: 75, reps: 5, type: 'normal', rpe: 9 },
        ],
      },
      {
        exerciseId: 'back_bent_over_dumbbell_row',
        exerciseName: '单臂哑铃划船',
        category: 'back',
        defaultSets: [
          { setNumber: 1, weightKg: 26, reps: 10, type: 'normal', rpe: 8 },
          { setNumber: 2, weightKg: 28, reps: 8, type: 'normal', rpe: 8.5 },
          { setNumber: 3, weightKg: 28, reps: 8, type: 'normal', rpe: 9 },
        ],
      },
      {
        exerciseId: 'shoulders_standing_overhead_press',
        exerciseName: '站姿杠铃推举 (OHP)',
        category: 'shoulders',
        defaultSets: [
          { setNumber: 1, weightKg: 40, reps: 8, type: 'normal', rpe: 8 },
          { setNumber: 2, weightKg: 45, reps: 6, type: 'normal', rpe: 8.5 },
          { setNumber: 3, weightKg: 45, reps: 6, type: 'normal', rpe: 9 },
        ],
      },
      {
        exerciseId: 'back_close_grip_seated_row',
        exerciseName: '坐姿绳索划船',
        category: 'back',
        defaultSets: [
          { setNumber: 1, weightKg: 50, reps: 10, type: 'normal', rpe: 8 },
          { setNumber: 2, weightKg: 50, reps: 10, type: 'normal', rpe: 8.5 },
          { setNumber: 3, weightKg: 50, reps: 10, type: 'normal', rpe: 9 },
        ],
      },
    ],
  },
  {
    id: 'preset_arnold_chest_back',
    name: '阿诺德分化 - 胸背对抗超级组 (Chest & Back)',
    category: 'arnold',
    description: '阿诺德施瓦辛格最推崇的胸背拮抗肌超级组，极速泵感与血液充盈。',
    isPreset: true,
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
    exercises: [
      {
        exerciseId: 'chest_barbell_bench_press',
        exerciseName: '平板杠铃卧推',
        category: 'chest',
        defaultSets: [
          { setNumber: 1, weightKg: 70, reps: 10, type: 'normal', rpe: 8 },
          { setNumber: 2, weightKg: 75, reps: 8, type: 'normal', rpe: 8.5 },
          { setNumber: 3, weightKg: 80, reps: 6, type: 'normal', rpe: 9 },
        ],
      },
      {
        exerciseId: 'back_pull_up',
        exerciseName: '正握引体向上',
        category: 'back',
        defaultSets: [
          { setNumber: 1, weightKg: 0, reps: 8, type: 'normal', rpe: 8 },
          { setNumber: 2, weightKg: 0, reps: 8, type: 'normal', rpe: 8.5 },
          { setNumber: 3, weightKg: 0, reps: 6, type: 'normal', rpe: 9 },
        ],
      },
      {
        exerciseId: 'chest_incline_dumbbell_press',
        exerciseName: '上斜哑铃卧推',
        category: 'chest',
        defaultSets: [
          { setNumber: 1, weightKg: 24, reps: 10, type: 'normal', rpe: 8 },
          { setNumber: 2, weightKg: 24, reps: 8, type: 'normal', rpe: 8.5 },
          { setNumber: 3, weightKg: 24, reps: 8, type: 'normal', rpe: 9 },
        ],
      },
      {
        exerciseId: 'back_t_bar_row',
        exerciseName: 'T杠划船',
        category: 'back',
        defaultSets: [
          { setNumber: 1, weightKg: 40, reps: 10, type: 'normal', rpe: 8 },
          { setNumber: 2, weightKg: 45, reps: 8, type: 'normal', rpe: 8.5 },
          { setNumber: 3, weightKg: 45, reps: 8, type: 'normal', rpe: 9 },
        ],
      },
    ],
  },
];
