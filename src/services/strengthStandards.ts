import type { WorkoutSession, StrengthProfile, SingleLiftStandard, StrengthRank } from '../types/workout';

// Rank display metadata
export const STRENGTH_RANK_META: Record<
  StrengthRank,
  { label: string; color: string; badge: string; desc: string }
> = {
  novice: {
    label: '新手入门 (Novice)',
    color: '#3b82f6', // blue
    badge: '🥉 铜牌级',
    desc: '已掌握动作轨迹，力量正在快速神经募集期',
  },
  intermediate: {
    label: '中阶训练者 (Intermediate)',
    color: '#10b981', // green
    badge: '🥈 银牌级',
    desc: '超越大众健身房 70% 常客，力量与体格已见雏形',
  },
  advanced: {
    label: '高阶进阶 (Advanced)',
    color: '#f59e0b', // amber
    badge: '🥇 金牌级',
    desc: '健身房台柱级别，训练年限 > 2~3 年的硬核玩家',
  },
  elite: {
    label: '精英健力 (Elite)',
    color: '#ef4444', // crimson red
    badge: '👑 殿堂级',
    desc: '全国力量举比赛或健美顶峰水准，前 1% 力量天花板',
  },
};

// Standard multipliers for bodyweight ratio: [novice, intermediate, advanced, elite]
const STANDARDS_TABLE = {
  male: {
    bench: [0.75, 1.0, 1.35, 1.7],
    squat: [1.05, 1.45, 1.9, 2.4],
    deadlift: [1.25, 1.75, 2.25, 2.85],
    overhead_press: [0.45, 0.65, 0.85, 1.1],
  },
  female: {
    bench: [0.45, 0.65, 0.9, 1.15],
    squat: [0.65, 0.95, 1.35, 1.75],
    deadlift: [0.8, 1.2, 1.65, 2.15],
    overhead_press: [0.28, 0.42, 0.6, 0.8],
  },
};

const LIFT_NAMES = {
  bench: '平板杠铃卧推',
  squat: '杠铃后深蹲',
  deadlift: '传统杠铃硬拉',
  overhead_press: '站姿杠铃推举',
};

// Calculate 1RM via Epley Formula: Weight * (1 + Reps / 30)
export function calculate1RM(weightKg: number, reps: number): number {
  if (reps <= 1) return weightKg;
  return Math.round(weightKg * (1 + reps / 30) * 10) / 10;
}

export function evaluateStrengthProfile(
  workouts: WorkoutSession[],
  bodyWeightKg = 70,
  gender: 'male' | 'female' = 'male'
): StrengthProfile {
  const safeBW = Math.max(35, bodyWeightKg);
  const table = STANDARDS_TABLE[gender] || STANDARDS_TABLE.male;

  // Track personal records for the 4 lifts
  const max1RMs: Record<'bench' | 'squat' | 'deadlift' | 'overhead_press', { maxWeight: number; best1RM: number }> = {
    bench: { maxWeight: 0, best1RM: 0 },
    squat: { maxWeight: 0, best1RM: 0 },
    deadlift: { maxWeight: 0, best1RM: 0 },
    overhead_press: { maxWeight: 0, best1RM: 0 },
  };

  for (const session of workouts) {
    for (const ex of session.exercises) {
      let key: 'bench' | 'squat' | 'deadlift' | 'overhead_press' | null = null;
      const id = ex.exerciseId.toLowerCase();
      const name = ex.exerciseName.toLowerCase();

      if (id.includes('bench_press') || name.includes('卧推')) {
        if (!name.includes('哑铃') && !name.includes('上斜') && !name.includes('下斜')) {
          key = 'bench';
        }
      } else if (id.includes('squat') || name.includes('深蹲')) {
        if (!name.includes('倒蹬') && !name.includes('高脚杯') && !name.includes('哈克')) {
          key = 'squat';
        }
      } else if (id.includes('deadlift') || name.includes('硬拉')) {
        if (!name.includes('直腿') && !name.includes('罗马尼亚') && !name.includes('rdl')) {
          key = 'deadlift';
        }
      } else if (id.includes('overhead_press') || id.includes('military') || (name.includes('推举') && name.includes('杠铃'))) {
        key = 'overhead_press';
      }

      if (key) {
        for (const s of ex.sets) {
          if (s.isCompleted && s.weightKg > 0 && s.reps > 0) {
            const e1rm = calculate1RM(s.weightKg, s.reps);
            if (s.weightKg > max1RMs[key].maxWeight) {
              max1RMs[key].maxWeight = s.weightKg;
            }
            if (e1rm > max1RMs[key].best1RM) {
              max1RMs[key].best1RM = e1rm;
            }
          }
        }
      }
    }
  }

  const liftKeys: Array<'bench' | 'squat' | 'deadlift' | 'overhead_press'> = [
    'bench',
    'squat',
    'deadlift',
    'overhead_press',
  ];

  const lifts: SingleLiftStandard[] = liftKeys.map((k) => {
    const best1RM = max1RMs[k].best1RM;
    const ratio = Math.round((best1RM / safeBW) * 100) / 100;
    const thresholds = table[k]; // [novice, intermediate, advanced, elite]

    let rank: StrengthRank = 'novice';
    let nextRankWeightKg = Math.round(thresholds[0] * safeBW);

    if (ratio >= thresholds[3]) {
      rank = 'elite';
      nextRankWeightKg = Math.round(thresholds[3] * safeBW * 1.1); // next stretch goal
    } else if (ratio >= thresholds[2]) {
      rank = 'advanced';
      nextRankWeightKg = Math.round(thresholds[3] * safeBW);
    } else if (ratio >= thresholds[1]) {
      rank = 'intermediate';
      nextRankWeightKg = Math.round(thresholds[2] * safeBW);
    } else if (ratio >= thresholds[0]) {
      rank = 'novice';
      nextRankWeightKg = Math.round(thresholds[1] * safeBW);
    } else {
      rank = 'novice';
      nextRankWeightKg = Math.round(thresholds[0] * safeBW);
    }

    const diffToNextKg = Math.max(0, Math.round((nextRankWeightKg - best1RM) * 10) / 10);
    const progressPercent =
      nextRankWeightKg > 0 ? Math.min(100, Math.round((best1RM / nextRankWeightKg) * 100)) : 100;

    return {
      exerciseKey: k,
      exerciseName: LIFT_NAMES[k],
      bestWeightKg: max1RMs[k].maxWeight,
      bestEstimated1RMKg: best1RM,
      ratio,
      rank,
      rankLabel: STRENGTH_RANK_META[rank].label,
      rankColor: STRENGTH_RANK_META[rank].color,
      nextRankWeightKg,
      diffToNextKg,
      progressPercent,
    };
  });

  const bigThree1RM =
    max1RMs.bench.best1RM + max1RMs.squat.best1RM + max1RMs.deadlift.best1RM;
  const totalRatio = Math.round((bigThree1RM / safeBW) * 100) / 100;

  // Overall Rank based on big three ratio
  let overallRank: StrengthRank = 'novice';
  const benchT = table.bench;
  const squatT = table.squat;
  const deadT = table.deadlift;
  const sumInter = benchT[1] + squatT[1] + deadT[1];
  const sumAdv = benchT[2] + squatT[2] + deadT[2];
  const sumElite = benchT[3] + squatT[3] + deadT[3];

  if (totalRatio >= sumElite) {
    overallRank = 'elite';
  } else if (totalRatio >= sumAdv) {
    overallRank = 'advanced';
  } else if (totalRatio >= sumInter) {
    overallRank = 'intermediate';
  } else {
    overallRank = 'novice';
  }

  return {
    bodyWeightKg: safeBW,
    gender,
    lifts,
    totalBigThree1RMKg: Math.round(bigThree1RM * 10) / 10,
    totalRatio,
    overallRank,
    overallRankLabel: STRENGTH_RANK_META[overallRank].label,
  };
}
