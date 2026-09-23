import type { WorkoutSession, WorkoutSet, ExerciseHistoryPoint, OverloadAnalysis, MuscleGroup } from '../types/workout';

export class AnalyticsService {
  /**
   * Epley 黄金 1RM 估算公式: 1RM = Weight * (1 + Reps / 30)
   */
  calculate1RM(weightKg: number, reps: number): number {
    if (weightKg <= 0 || reps <= 0) return 0;
    if (reps === 1) return weightKg;
    const rm = weightKg * (1 + reps / 30);
    return Math.round(rm * 10) / 10;
  }

  /**
   * 计算力量训练组的总容量 (Volume = Weight * Reps)
   */
  calculateSetVolume(set: WorkoutSet): number {
    if (!set.isCompleted) return 0;
    return (set.weightKg || 0) * (set.reps || 0);
  }

  calculateTotalVolume(sets: WorkoutSet[]): number {
    return sets.reduce((acc, s) => acc + this.calculateSetVolume(s), 0);
  }

  /**
   * 计算有氧单次总时长 (分钟)
   */
  calculateCardioDuration(sets: WorkoutSet[]): number {
    return sets.reduce((acc, s) => acc + (s.durationMinutes || 0), 0);
  }

  /**
   * 计算有氧单次总距离 (公里)
   */
  calculateCardioDistance(sets: WorkoutSet[]): number {
    const sum = sets.reduce((acc, s) => acc + (s.distanceKm || 0), 0);
    return Math.round(sum * 100) / 100;
  }

  /**
   * 计算有氧单次总消耗 (千卡)
   */
  calculateCardioCalories(sets: WorkoutSet[]): number {
    return sets.reduce((acc, s) => acc + (s.caloriesKcal || 0), 0);
  }

  /**
   * 提取某个动作的所有历史演化点（按时间正序排列）
   */
  getExerciseHistory(exerciseId: string, workouts: WorkoutSession[]): ExerciseHistoryPoint[] {
    const points: ExerciseHistoryPoint[] = [];

    const relevantWorkouts = [...workouts].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

    for (const session of relevantWorkouts) {
      const exerciseEntries = session.exercises.filter(e => e.exerciseId === exerciseId);
      if (exerciseEntries.length === 0) continue;

      const allSets = exerciseEntries.flatMap(e => e.sets).filter(s => s.isCompleted);
      if (allSets.length === 0) continue;

      const isCardio = exerciseEntries.some(e => e.category === 'cardio' || e.isCardio);

      let maxWeight = 0;
      let max1RM = 0;
      let bestSetText = '';
      let totalVol = 0;
      let totalDuration = 0;
      let totalDist = 0;
      let totalCals = 0;

      for (const set of allSets) {
        if (isCardio) {
          totalDuration += set.durationMinutes || 0;
          totalDist += set.distanceKm || 0;
          totalCals += set.caloriesKcal || 0;
        } else {
          if (set.weightKg > maxWeight) {
            maxWeight = set.weightKg;
          }
          const rm = this.calculate1RM(set.weightKg, set.reps);
          if (rm > max1RM) {
            max1RM = rm;
            bestSetText = `${set.weightKg}kg × ${set.reps}次`;
          }
          totalVol += this.calculateSetVolume(set);
        }
      }

      if (isCardio) {
        const pace = totalDist > 0 ? Math.round((totalDuration / totalDist) * 10) / 10 : undefined;
        bestSetText = `${totalDuration}分钟${totalDist > 0 ? ` · ${totalDist}km` : ''}${totalCals > 0 ? ` · ${totalCals}kcal` : ''}`;

        points.push({
          date: session.date,
          timestamp: session.createdAt,
          maxWeight: 0,
          estimated1RM: 0,
          totalVolume: 0,
          durationMinutes: totalDuration,
          distanceKm: Math.round(totalDist * 100) / 100,
          caloriesKcal: totalCals,
          paceMinPerKm: pace,
          bestSet: bestSetText,
          setsCount: allSets.length,
        });
      } else {
        points.push({
          date: session.date,
          timestamp: session.createdAt,
          maxWeight,
          estimated1RM: max1RM,
          totalVolume: totalVol,
          durationMinutes: 0,
          distanceKm: 0,
          caloriesKcal: 0,
          bestSet: bestSetText || `${maxWeight}kg`,
          setsCount: allSets.length,
        });
      }
    }

    return points;
  }

  /**
   * 渐进超负荷 (Progressive Overload) 智能加重 / 减重 / 有氧耐力分析算法
   */
  analyzeProgressiveOverload(
    exerciseId: string,
    exerciseName: string,
    category: MuscleGroup,
    workouts: WorkoutSession[]
  ): OverloadAnalysis {
    const history = this.getExerciseHistory(exerciseId, workouts);
    const isCardio = category === 'cardio';

    if (history.length === 0) {
      return {
        exerciseId,
        exerciseName,
        category,
        isCardio,
        currentMaxWeight: 0,
        currentEstimated1RM: 0,
        currentVolume: 0,
        currentDurationMinutes: 0,
        currentDistanceKm: 0,
        weightDelta: 0,
        rmDelta: 0,
        volumeDeltaPercent: 0,
        status: 'first_time',
        statusBadge: isCardio ? '🏃 首次有氧打卡' : '🆕 首次记录',
        statusColor: 'var(--accent-cyan)',
        recommendationTitle: isCardio ? '建立您的基础有氧耐力' : '开始建立你的力量基准线',
        recommendationDetail: isCardio
          ? '该有氧项目暂无历史数据。建议以舒服的心率（能正常说整句话）完成 20~30 分钟，建立心肺适应。'
          : '该动作暂无历史数据。建议选择能标准完成 8~12 次的适中重量，专注动作轨迹与离心控制。',
        targetNextWeight: isCardio ? 0 : 20,
        historyPoints: [],
      };
    }

    const latest = history[history.length - 1];
    const prev = history.length > 1 ? history[history.length - 2] : undefined;

    // --- 有氧运动专属分析逻辑 ---
    if (isCardio) {
      if (!prev) {
        return {
          exerciseId,
          exerciseName,
          category,
          isCardio: true,
          currentMaxWeight: 0,
          currentEstimated1RM: 0,
          currentVolume: 0,
          currentDurationMinutes: latest.durationMinutes,
          currentDistanceKm: latest.distanceKm,
          weightDelta: 0,
          rmDelta: 0,
          volumeDeltaPercent: 0,
          status: 'first_time',
          statusBadge: '🌱 基础耐力积累中',
          statusColor: 'var(--accent-cyan)',
          recommendationTitle: `已记录基准数据: ${latest.bestSet}`,
          recommendationDetail: `首次记录表现良好！下次训练建议维持当前时长或延长 3~5 分钟，让心率持续处于有氧减脂区间 (Zone 2)。`,
          targetNextWeight: 0,
          historyPoints: history,
        };
      }

      const distDelta = Math.round((latest.distanceKm - prev.distanceKm) * 100) / 100;
      const timeDelta = latest.durationMinutes - prev.durationMinutes;

      if (distDelta > 0.2 || timeDelta >= 5) {
        return {
          exerciseId,
          exerciseName,
          category,
          isCardio: true,
          currentMaxWeight: 0,
          currentEstimated1RM: 0,
          currentVolume: 0,
          currentDurationMinutes: latest.durationMinutes,
          currentDistanceKm: latest.distanceKm,
          previousDurationMinutes: prev.durationMinutes,
          previousDistanceKm: prev.distanceKm,
          weightDelta: 0,
          rmDelta: 0,
          volumeDeltaPercent: 0,
          status: 'increase',
          statusBadge: `🏃 有氧耐力提升 (+${timeDelta > 0 ? timeDelta + '分' : distDelta + 'km'})`,
          statusColor: 'var(--accent-primary)',
          recommendationTitle: '心肺耐力提升！建议稳步巩固或增加坡度/阻力',
          recommendationDetail: `太棒了！相比上次 (${prev.durationMinutes}分 / ${prev.distanceKm}km)，本次时长/距离稳步提升。建议：下次可尝试略微提升 1 档坡度或阻力，进一步提升心肺耐力与燃脂效率！`,
          targetNextWeight: 0,
          historyPoints: history,
        };
      } else if (distDelta < -0.3 || timeDelta <= -8) {
        return {
          exerciseId,
          exerciseName,
          category,
          isCardio: true,
          currentMaxWeight: 0,
          currentEstimated1RM: 0,
          currentVolume: 0,
          currentDurationMinutes: latest.durationMinutes,
          currentDistanceKm: latest.distanceKm,
          previousDurationMinutes: prev.durationMinutes,
          previousDistanceKm: prev.distanceKm,
          weightDelta: 0,
          rmDelta: 0,
          volumeDeltaPercent: 0,
          status: 'decrease',
          statusBadge: `⚠️ 心肺状态疲劳回落`,
          statusColor: 'var(--accent-danger)',
          recommendationTitle: '本次有氧运动量有所回落',
          recommendationDetail: `相比前次训练，本次完成的时长或距离有所减少。如果是力量训练后安排的轻度有氧则很合理；若是专项有氧日，请注意是否有下肢疲劳或能量储备不足，下次可先从较慢配速起步慢跑热身。`,
          targetNextWeight: 0,
          historyPoints: history,
        };
      } else {
        return {
          exerciseId,
          exerciseName,
          category,
          isCardio: true,
          currentMaxWeight: 0,
          currentEstimated1RM: 0,
          currentVolume: 0,
          currentDurationMinutes: latest.durationMinutes,
          currentDistanceKm: latest.distanceKm,
          previousDurationMinutes: prev.durationMinutes,
          previousDistanceKm: prev.distanceKm,
          weightDelta: 0,
          rmDelta: 0,
          volumeDeltaPercent: 0,
          status: 'maintain',
          statusBadge: '⚖️ 稳定巡航期',
          statusColor: 'var(--accent-warning)',
          recommendationTitle: `时长维持在 ${latest.durationMinutes} 分钟，燃脂效率理想`,
          recommendationDetail: `有氧运动强调长期持续性。当前保持的配速与时长非常适合维持脂肪氧化代谢。如需突破，可在末尾尝试 2 组 30 秒的冲刺间歇 (HIIT)！`,
          targetNextWeight: 0,
          historyPoints: history,
        };
      }
    }

    // --- 力量训练专属分析逻辑 ---
    if (!prev) {
      return {
        exerciseId,
        exerciseName,
        category,
        isCardio: false,
        currentMaxWeight: latest.maxWeight,
        currentEstimated1RM: latest.estimated1RM,
        currentVolume: latest.totalVolume,
        currentDurationMinutes: 0,
        currentDistanceKm: 0,
        weightDelta: 0,
        rmDelta: 0,
        volumeDeltaPercent: 0,
        status: 'first_time',
        statusBadge: '🌱 积累期 (第 1 次训练)',
        statusColor: 'var(--accent-cyan)',
        recommendationTitle: '已记录基准数据，建议巩固当前重量',
        recommendationDetail: `当前最好组为 ${latest.bestSet}，估算 1RM 约为 ${latest.estimated1RM}kg。下次训练建议维持 ${latest.maxWeight}kg，争取每组多做 1~2 次或提高动作质量。`,
        targetNextWeight: latest.maxWeight,
        historyPoints: history,
      };
    }

    const weightDelta = Math.round((latest.maxWeight - prev.maxWeight) * 10) / 10;
    const rmDelta = Math.round((latest.estimated1RM - prev.estimated1RM) * 10) / 10;
    const volDelta = prev.totalVolume > 0
      ? Math.round(((latest.totalVolume - prev.totalVolume) / prev.totalVolume) * 100)
      : 0;

    const microIncrement = category === 'legs' || category === 'back' ? 5 : 2.5;
    const suggestedNextWeight = latest.maxWeight + microIncrement;

    if (weightDelta > 0 || (rmDelta >= 2 && volDelta >= 0)) {
      return {
        exerciseId,
        exerciseName,
        category,
        isCardio: false,
        currentMaxWeight: latest.maxWeight,
        currentEstimated1RM: latest.estimated1RM,
        currentVolume: latest.totalVolume,
        currentDurationMinutes: 0,
        currentDistanceKm: 0,
        previousMaxWeight: prev.maxWeight,
        previousEstimated1RM: prev.estimated1RM,
        previousVolume: prev.totalVolume,
        weightDelta,
        rmDelta,
        volumeDeltaPercent: volDelta,
        status: 'increase',
        statusBadge: `🚀 力量显著上升 (1RM +${rmDelta}kg)`,
        statusColor: 'var(--accent-primary)',
        recommendationTitle: `达成超负荷！建议下次上调至 ${suggestedNextWeight}kg`,
        recommendationDetail: `太棒了！估算 1RM 从 ${prev.estimated1RM}kg 跃升至 ${latest.estimated1RM}kg（净增 ${rmDelta}kg），总容量亦提升 ${volDelta}%。下次第一正式组可大胆尝试增加 ${microIncrement}kg (即 ${suggestedNextWeight}kg) 冲击 6~8 次！`,
        targetNextWeight: suggestedNextWeight,
        historyPoints: history,
      };
    } else if (weightDelta < 0 || rmDelta <= -3 || volDelta <= -15) {
      return {
        exerciseId,
        exerciseName,
        category,
        isCardio: false,
        currentMaxWeight: latest.maxWeight,
        currentEstimated1RM: latest.estimated1RM,
        currentVolume: latest.totalVolume,
        currentDurationMinutes: 0,
        currentDistanceKm: 0,
        previousMaxWeight: prev.maxWeight,
        previousEstimated1RM: prev.estimated1RM,
        previousVolume: prev.totalVolume,
        weightDelta,
        rmDelta,
        volumeDeltaPercent: volDelta,
        status: 'decrease',
        statusBadge: `📉 重量/容量下滑 (${weightDelta < 0 ? weightDelta + 'kg' : volDelta + '%'})`,
        statusColor: 'var(--accent-danger)',
        recommendationTitle: '力量有所下降，建议暂缓加重排查状态',
        recommendationDetail: `相比上次训练 (${prev.maxWeight}kg / 估算1RM ${prev.estimated1RM}kg)，本次极限表现回落了 ${Math.abs(rmDelta)}kg。建议：下次不要强行冲重，回退至 ${Math.max(latest.maxWeight - microIncrement, 10)}kg 专注动作顶峰收缩，或安排一次减载训练。`,
        targetNextWeight: Math.max(latest.maxWeight - microIncrement, 10),
        historyPoints: history,
      };
    } else {
      return {
        exerciseId,
        exerciseName,
        category,
        isCardio: false,
        currentMaxWeight: latest.maxWeight,
        currentEstimated1RM: latest.estimated1RM,
        currentVolume: latest.totalVolume,
        currentDurationMinutes: 0,
        currentDistanceKm: 0,
        previousMaxWeight: prev.maxWeight,
        previousEstimated1RM: prev.estimated1RM,
        previousVolume: prev.totalVolume,
        weightDelta,
        rmDelta,
        volumeDeltaPercent: volDelta,
        status: 'maintain',
        statusBadge: '⚖️ 重量平稳维持中',
        statusColor: 'var(--accent-warning)',
        recommendationTitle: `维持当前 ${latest.maxWeight}kg，尝试增加次数或组数`,
        recommendationDetail: `最大重量与 1RM 与前次保持一致。可以尝试增加做组次数，一旦所有组均能轻松达标 10 次以上，即可平稳进阶至 ${suggestedNextWeight}kg。`,
        targetNextWeight: latest.maxWeight,
        historyPoints: history,
      };
    }
  }

  /**
   * 整体肌肉部位与有氧分布统计
   */
  getMuscleGroupDistribution(workouts: WorkoutSession[]): Record<MuscleGroup, { count: number; volume: number }> {
    const dist: Record<MuscleGroup, { count: number; volume: number }> = {
      chest: { count: 0, volume: 0 },
      back: { count: 0, volume: 0 },
      legs: { count: 0, volume: 0 },
      shoulders: { count: 0, volume: 0 },
      arms: { count: 0, volume: 0 },
      core: { count: 0, volume: 0 },
      cardio: { count: 0, volume: 0 },
    };

    for (const w of workouts) {
      for (const ex of w.exercises) {
        if (dist[ex.category]) {
          dist[ex.category].count += ex.sets.length;
          dist[ex.category].volume += this.calculateTotalVolume(ex.sets);
        }
      }
    }

    return dist;
  }

  /**
   * 1. 全身肌群恢复就绪状态算法 (Muscle Recovery & Readiness)
   * 科学恢复周期:
   * - 大肌群 (胸部、背部、腿部): 72小时 (3天) 超量恢复
   * - 小肌群 (肩部、手臂): 48小时 (2天)
   * - 核心 / 有氧: 36小时 (1.5天)
   */
  getMuscleRecoveryStatus(workouts: WorkoutSession[]): {
    recoveryList: MuscleRecoveryInfo[];
    overallReadiness: number; // 0 - 100
    recommendedMuscles: MuscleGroup[];
    recommendationAdvice: string;
  } {
    const RECOVERY_HOURS_MAP: Record<MuscleGroup, number> = {
      chest: 72,
      back: 72,
      legs: 72,
      shoulders: 48,
      arms: 48,
      core: 36,
      cardio: 36,
    };

    const now = Date.now();
    const muscleLatestTimes: Record<MuscleGroup, { timestamp: number; date: string } | null> = {
      chest: null,
      back: null,
      legs: null,
      shoulders: null,
      arms: null,
      core: null,
      cardio: null,
    };

    // Scan workouts descending by timestamp/date
    const sortedWorkouts = [...workouts].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    for (const session of sortedWorkouts) {
      const sessionTime = session.createdAt || new Date(session.date).getTime() || now;
      for (const ex of session.exercises) {
        const cat = ex.category;
        if (muscleLatestTimes[cat] === null && ex.sets.some((s) => s.isCompleted)) {
          muscleLatestTimes[cat] = {
            timestamp: sessionTime,
            date: session.date,
          };
        }
      }
    }

    const muscleKeys: MuscleGroup[] = ['chest', 'back', 'legs', 'shoulders', 'arms', 'core', 'cardio'];
    const recoveryList: MuscleRecoveryInfo[] = [];
    const readyMuscles: MuscleGroup[] = [];

    for (const m of muscleKeys) {
      const latest = muscleLatestTimes[m];
      const reqHours = RECOVERY_HOURS_MAP[m];

      if (!latest) {
        // Never trained: 100% recovered and ready
        recoveryList.push({
          muscle: m,
          lastTrainedDate: null,
          hoursElapsed: 999,
          recoveryPercentage: 100,
          status: 'ready',
          statusText: '完全就绪',
          hoursRemaining: 0,
        });
        readyMuscles.push(m);
      } else {
        const elapsedHours = Math.max(0, (now - latest.timestamp) / 3600000);
        const pct = Math.min(100, Math.round((elapsedHours / reqHours) * 100));
        const remHours = Math.max(0, Math.round(reqHours - elapsedHours));

        let status: 'ready' | 'recovering' | 'fatigued' = 'ready';
        let statusText = '完全就绪';

        if (pct < 50) {
          status = 'fatigued';
          statusText = '深度恢复中';
        } else if (pct < 95) {
          status = 'recovering';
          statusText = '大致恢复';
        } else {
          status = 'ready';
          statusText = '完全就绪';
          readyMuscles.push(m);
        }

        recoveryList.push({
          muscle: m,
          lastTrainedDate: latest.date,
          hoursElapsed: Math.round(elapsedHours),
          recoveryPercentage: pct,
          status,
          statusText,
          hoursRemaining: remHours,
        });
      }
    }

    const totalPct = recoveryList.reduce((acc, cur) => acc + cur.recoveryPercentage, 0);
    const overallReadiness = Math.round(totalPct / recoveryList.length);

    // Smart training advice
    let advice = '全身各部位肌肉均已充分恢复，可自由安排推力或拉力训练！';
    if (readyMuscles.includes('chest') && readyMuscles.includes('shoulders') && !readyMuscles.includes('back')) {
      advice = '💡 今日背部仍处于深度超量恢复中，胸部与三角肌已完全就绪，强烈建议：进行「推力/胸肩日」！';
    } else if (readyMuscles.includes('legs') && (!readyMuscles.includes('chest') || !readyMuscles.includes('back'))) {
      advice = '💡 上肢肌群正在重塑生长，下肢完全恢复，今日黄金推荐：进行「深蹲与腿部力量训练」！';
    } else if (readyMuscles.includes('back') && !readyMuscles.includes('chest')) {
      advice = '💡 胸部已充分疲劳，背部与手臂拉力链完全恢复，今日推荐：进行「引体与划船拉力日」！';
    } else if (readyMuscles.length <= 2) {
      advice = '💡 多数肌群处于深度恢复疲劳期，今日建议安排「低强度有氧放松」或彻底休息给肌肉时间生长！';
    }

    return {
      recoveryList,
      overallReadiness,
      recommendedMuscles: readyMuscles.slice(0, 3),
      recommendationAdvice: advice,
    };
  }

  /**
   * 2. 每周各部位有效组数科学平衡分析 (Weekly Effective Sets Balance)
   * 目标标准: 每个肌群每周 10 ~ 20 组为黄金增肌区间
   */
  getWeeklyEffectiveSets(workouts: WorkoutSession[]): {
    weeklySets: WeeklyMuscleSets[];
    totalSetsThisWeek: number;
    weekRangeText: string;
    isBalanced: boolean;
  } {
    const now = new Date();
    // Calculate start of current week (Monday)
    const currentDay = now.getDay(); // 0 is Sun, 1 is Mon...
    const diffToMonday = (currentDay + 6) % 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() - diffToMonday);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const monStr = monday.toISOString().split('T')[0];
    const sunStr = sunday.toISOString().split('T')[0];
    const weekRangeText = `${monStr.slice(5)} ~ ${sunStr.slice(5)}`;

    const setsCounter: Record<MuscleGroup, number> = {
      chest: 0,
      back: 0,
      legs: 0,
      shoulders: 0,
      arms: 0,
      core: 0,
      cardio: 0,
    };

    let totalSetsThisWeek = 0;

    for (const session of workouts) {
      const sDate = session.date;
      if (sDate >= monStr && sDate <= sunStr) {
        for (const ex of session.exercises) {
          const completed = ex.sets.filter((s) => s.isCompleted).length;
          if (setsCounter[ex.category] !== undefined) {
            setsCounter[ex.category] += completed;
            totalSetsThisWeek += completed;
          }
        }
      }
    }

    const muscleKeys: MuscleGroup[] = ['chest', 'back', 'legs', 'shoulders', 'arms', 'core', 'cardio'];
    const weeklySets: WeeklyMuscleSets[] = muscleKeys.map((m) => {
      const count = setsCounter[m];
      const targetMin = m === 'core' || m === 'cardio' ? 6 : 10;
      const targetMax = m === 'core' || m === 'cardio' ? 15 : 20;

      let status: 'under' | 'optimal' | 'high' = 'optimal';
      let statusText = '黄金增肌区间';

      if (count < targetMin) {
        status = 'under';
        statusText = count === 0 ? '尚未刺激' : `偏低 (欠${targetMin - count}组)`;
      } else if (count > targetMax) {
        status = 'high';
        statusText = '容量偏高注意过度';
      }

      return {
        muscle: m,
        completedSets: count,
        targetMin,
        targetMax,
        status,
        statusText,
      };
    });

    const majorMuscles = weeklySets.filter((s) => ['chest', 'back', 'legs'].includes(s.muscle));
    const isBalanced = majorMuscles.every((s) => s.completedSets >= 6);

    return {
      weeklySets,
      totalSetsThisWeek,
      weekRangeText,
      isBalanced,
    };
  }

  /**
   * 3. 个人最好成绩 PR 荣誉殿堂 (Personal Records Wall)
   * 扫描三大项 (卧推、深蹲、硬拉) 及其他已练动作的历史极值与段位
   */
  getPersonalRecords(workouts: WorkoutSession[]): PersonalRecordItem[] {
    const recordsMap = new Map<string, PersonalRecordItem>();

    const sortedAsc = [...workouts].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    const latestSession = sortedAsc[sortedAsc.length - 1];
    const latestDate = latestSession?.date || '';

    for (const session of sortedAsc) {
      for (const ex of session.exercises) {
        const completedSets = ex.sets.filter((s) => s.isCompleted);
        if (completedSets.length === 0) continue;

        let maxW = 0;
        let max1RM = 0;
        let bestR = 0;
        let totalVol = 0;

        for (const s of completedSets) {
          const w = s.weightKg || 0;
          const r = s.reps || 0;
          if (w > maxW) {
            maxW = w;
            bestR = r;
          }
          const rm = this.calculate1RM(w, r);
          if (rm > max1RM) {
            max1RM = rm;
          }
          totalVol += w * r;
        }

        const isBig3 =
          ex.exerciseName.includes('卧推') ||
          ex.exerciseName.includes('深蹲') ||
          ex.exerciseName.includes('硬拉');

        const existing = recordsMap.get(ex.exerciseId);

        if (!existing) {
          recordsMap.set(ex.exerciseId, {
            exerciseId: ex.exerciseId,
            exerciseName: ex.exerciseName,
            category: ex.category,
            isBig3,
            maxWeightKg: maxW,
            estimated1RM: max1RM,
            bestReps: bestR,
            maxVolumeKg: totalVol,
            dateAchieved: session.date,
            isRecentPR: session.date === latestDate,
            strengthLevel: this.evaluateStrengthLevel(ex.exerciseName, maxW),
          });
        } else {
          let updated = false;
          if (maxW > existing.maxWeightKg) {
            existing.maxWeightKg = maxW;
            existing.bestReps = bestR;
            existing.dateAchieved = session.date;
            existing.isRecentPR = session.date === latestDate;
            existing.strengthLevel = this.evaluateStrengthLevel(ex.exerciseName, maxW);
            updated = true;
          }
          if (max1RM > existing.estimated1RM) {
            existing.estimated1RM = max1RM;
            updated = true;
          }
          if (totalVol > existing.maxVolumeKg) {
            existing.maxVolumeKg = totalVol;
            updated = true;
          }
          if (updated && session.date === latestDate) {
            existing.isRecentPR = true;
          }
        }
      }
    }

    return Array.from(recordsMap.values()).sort((a, b) => {
      if (a.isBig3 && !b.isBig3) return -1;
      if (!a.isBig3 && b.isBig3) return 1;
      return b.maxWeightKg - a.maxWeightKg;
    });
  }

  private evaluateStrengthLevel(name: string, weightKg: number): string {
    if (name.includes('卧推')) {
      if (weightKg >= 100) return '🏆 力量大师';
      if (weightKg >= 80) return '🥇 黄金熟手';
      if (weightKg >= 60) return '🥈 进阶先锋';
      if (weightKg >= 40) return '🥉 潜力新手';
      return '🌱 基础起步';
    }
    if (name.includes('深蹲') || name.includes('硬拉')) {
      if (weightKg >= 140) return '🏆 力量大师';
      if (weightKg >= 110) return '🥇 黄金熟手';
      if (weightKg >= 80) return '🥈 进阶先锋';
      if (weightKg >= 50) return '🥉 潜力新手';
      return '🌱 基础起步';
    }
    if (weightKg >= 60) return '🥇 黄金水准';
    if (weightKg >= 35) return '🥈 进阶水准';
    return '🥉 稳健提升';
  }

  /**
   * 4. 训练一致性打卡热力方块墙 (Consistency Heatmap)
   * 统计近 16 周 (112天) 的每日训练热力与连续打卡天数
   */
  getConsistencyHeatmap(workouts: WorkoutSession[], weeksCount = 16): ConsistencyStats {
    const totalDays = weeksCount * 7;
    const now = new Date();
    // End date is upcoming Sunday or today
    const currentDay = now.getDay();
    const daysToSunday = (7 - currentDay) % 7;
    const endDate = new Date(now);
    endDate.setDate(now.getDate() + daysToSunday);
    endDate.setHours(23, 59, 59, 999);

    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - totalDays + 1);
    startDate.setHours(0, 0, 0, 0);

    // Map workouts by date string
    const workoutByDate = new Map<string, { sets: number; volume: number; title: string }>();
    let totalAllSets = 0;
    let totalAllVolume = 0;

    for (const w of workouts) {
      let sets = 0;
      let vol = 0;
      for (const ex of w.exercises) {
        for (const s of ex.sets) {
          if (s.isCompleted) {
            sets++;
            vol += (s.weightKg || 0) * (s.reps || 0);
          }
        }
      }
      totalAllSets += sets;
      totalAllVolume += vol;

      const cur = workoutByDate.get(w.date) || { sets: 0, volume: 0, title: w.title };
      workoutByDate.set(w.date, {
        sets: cur.sets + sets,
        volume: cur.volume + vol,
        title: cur.title || w.title,
      });
    }

    const days: HeatmapDay[] = [];
    const iter = new Date(startDate);

    while (iter <= endDate) {
      const dStr = iter.toISOString().split('T')[0];
      const dow = iter.getDay(); // 0 = Sun
      const data = workoutByDate.get(dStr);

      const sets = data?.sets || 0;
      let level = 0;
      if (sets >= 16) level = 4;
      else if (sets >= 10) level = 3;
      else if (sets >= 5) level = 2;
      else if (sets > 0) level = 1;

      days.push({
        date: dStr,
        dayOfWeek: (dow + 6) % 7, // 0 = Mon, 6 = Sun
        setsCount: sets,
        totalVolume: data?.volume || 0,
        level,
        sessionTitle: data?.title,
      });

      iter.setDate(iter.getDate() + 1);
    }

    // Calculate streaks
    const uniqueDates = Array.from(new Set(workouts.map((w) => w.date))).sort();
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    const todayStr = now.toISOString().split('T')[0];
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    // Check if streak is active today or yesterday
    let checkDate = new Date(now);
    if (!workoutByDate.has(todayStr) && workoutByDate.has(yesterdayStr)) {
      checkDate = yesterday;
    }

    while (true) {
      const dStr = checkDate.toISOString().split('T')[0];
      if (workoutByDate.has(dStr)) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    // Longest streak across history
    let prevD: Date | null = null;
    for (const dStr of uniqueDates) {
      const d = new Date(dStr);
      if (prevD) {
        const diffDays = Math.round((d.getTime() - prevD.getTime()) / (1000 * 3600 * 24));
        if (diffDays === 1) {
          tempStreak++;
        } else {
          tempStreak = 1;
        }
      } else {
        tempStreak = 1;
      }
      if (tempStreak > longestStreak) {
        longestStreak = tempStreak;
      }
      prevD = d;
    }

    return {
      days,
      totalWorkouts: workouts.length,
      totalSets: totalAllSets,
      totalVolumeKg: totalAllVolume,
      currentStreakDays: currentStreak,
      longestStreakDays: Math.max(longestStreak, currentStreak),
    };
  }
}

// Interfaces
export interface MuscleRecoveryInfo {
  muscle: MuscleGroup;
  lastTrainedDate: string | null;
  hoursElapsed: number;
  recoveryPercentage: number;
  status: 'ready' | 'recovering' | 'fatigued';
  statusText: string;
  hoursRemaining: number;
}

export interface WeeklyMuscleSets {
  muscle: MuscleGroup;
  completedSets: number;
  targetMin: number;
  targetMax: number;
  status: 'under' | 'optimal' | 'high';
  statusText: string;
}

export interface PersonalRecordItem {
  exerciseId: string;
  exerciseName: string;
  category: MuscleGroup;
  isBig3: boolean;
  maxWeightKg: number;
  estimated1RM: number;
  bestReps: number;
  maxVolumeKg: number;
  dateAchieved: string;
  isRecentPR: boolean;
  strengthLevel: string;
}

export interface HeatmapDay {
  date: string;
  dayOfWeek: number;
  setsCount: number;
  totalVolume: number;
  level: number;
  sessionTitle?: string;
}

export interface ConsistencyStats {
  days: HeatmapDay[];
  totalWorkouts: number;
  totalSets: number;
  totalVolumeKg: number;
  currentStreakDays: number;
  longestStreakDays: number;
}

export const analyticsService = new AnalyticsService();

