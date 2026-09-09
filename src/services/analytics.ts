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
        statusColor: '#38bdf8',
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
          statusColor: '#06b6d4',
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
          statusColor: '#22c55e',
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
          statusBadge: '📉 有氧量有所缩减',
          statusColor: '#ef4444',
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
          statusBadge: '⚖️ 稳定巡航燃脂中',
          statusColor: '#eab308',
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
        statusColor: '#06b6d4',
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
        statusColor: '#22c55e',
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
        statusColor: '#ef4444',
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
        statusColor: '#eab308',
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
}

export const analyticsService = new AnalyticsService();
