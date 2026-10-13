import React, { useEffect, useState } from 'react';
import {
  X,
  Trophy,
  Dumbbell,
  Calendar,
  Flame,
  Download,
  ExternalLink,
  Activity,
  Weight,
  Clock,
  Sparkles,
} from 'lucide-react';
import { api } from '../api';
import type { MemberProfileData } from '../types';

interface MemberProfileModalProps {
  userId: string | null;
  username?: string;
  onClose: () => void;
  onFilterWorkouts?: (userId: string) => void;
}

export const MemberProfileModal: React.FC<MemberProfileModalProps> = ({
  userId,
  username,
  onClose,
  onFilterWorkouts,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [profile, setProfile] = useState<MemberProfileData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    api
      .getUserProfile(userId)
      .then((data) => {
        if (isMounted) {
          setProfile(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || '获取组员画像失败');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [userId]);

  if (!userId) return null;

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
      }}
    >
      <div
        className="modal-content animate-fade-in"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '820px',
          maxHeight: '90vh',
          backgroundColor: '#111317',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 30px rgba(34, 197, 94, 0.1)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '18px 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            backgroundColor: '#16191f',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #22c55e, #06b6d4)',
                color: '#000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '16px',
              }}
            >
              {(username || profile?.user.username || 'U').substring(0, 2).toUpperCase()}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#fff' }}>
                  {username || profile?.user.username}
                </h3>
                {profile?.user.role === 'admin' ? (
                  <span
                    style={{
                      fontSize: '11px',
                      background: 'rgba(168, 85, 247, 0.2)',
                      color: '#c084fc',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      border: '1px solid rgba(168, 85, 247, 0.3)',
                    }}
                  >
                    系统管理员
                  </span>
                ) : (
                  <span
                    style={{
                      fontSize: '11px',
                      background: 'rgba(34, 197, 94, 0.15)',
                      color: '#4ade80',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      border: '1px solid rgba(34, 197, 94, 0.25)',
                    }}
                  >
                    健身组员
                  </span>
                )}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '2px' }}>
                组员全景训练数据与科学成长画像
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <a
              href={api.getExportUserUrl(userId)}
              download
              className="btn btn-secondary"
              style={{ padding: '6px 12px', fontSize: '12px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}
              title="导出该组员全量训练数据 JSON"
            >
              <Download size={14} /> 导出数据
            </a>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.06)',
                border: 'none',
                color: 'var(--text-dim)',
                cursor: 'pointer',
                borderRadius: '8px',
                padding: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
              }}
              title="关闭弹窗"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div
          style={{
            padding: '24px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
          }}
        >
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '14px' }}>正在聚合分析该组员的训练数据...</div>
            </div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#ef4444' }}>
              <div>{error}</div>
            </div>
          ) : !profile ? null : (
            <>
              {/* 1. KPIs */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                  gap: '12px',
                }}
              >
                <div
                  style={{
                    backgroundColor: '#181b22',
                    padding: '16px',
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#22c55e', fontSize: '12px' }}>
                    <Weight size={15} /> 累计举铁负荷
                  </div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: '#fff', marginTop: '6px', fontFamily: 'var(--font-display)' }}>
                    {profile.kpis.tonnage} <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-dim)' }}>吨</span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>
                    约 {profile.kpis.totalVolumeKg.toLocaleString()} kg
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: '#181b22',
                    padding: '16px',
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#06b6d4', fontSize: '12px' }}>
                    <Calendar size={15} /> 总训练打卡
                  </div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: '#fff', marginTop: '6px', fontFamily: 'var(--font-display)' }}>
                    {profile.kpis.totalWorkouts} <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-dim)' }}>次</span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>
                    {profile.kpis.lastWorkoutDate ? `最近 ${profile.kpis.lastWorkoutDate}` : '暂无打卡'}
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: '#181b22',
                    padding: '16px',
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f59e0b', fontSize: '12px' }}>
                    <Flame size={15} /> 近30天活跃度
                  </div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: '#fff', marginTop: '6px', fontFamily: 'var(--font-display)' }}>
                    {profile.kpis.recent30dWorkouts} <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-dim)' }}>场</span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>
                    月活跃率 {(Math.min(100, Math.round((profile.kpis.recent30dWorkouts / 30) * 100)))}%
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: '#181b22',
                    padding: '16px',
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#a855f7', fontSize: '12px' }}>
                    <Activity size={15} /> 最新身体体测
                  </div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: '#fff', marginTop: '6px', fontFamily: 'var(--font-display)' }}>
                    {profile.latestMetric?.weightKg ? `${profile.latestMetric.weightKg} kg` : '未记录'}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>
                    {profile.latestMetric?.bodyFatPercent ? `体脂率 ${profile.latestMetric.bodyFatPercent}%` : '体脂待记录'}
                  </div>
                </div>
              </div>

              {/* 2. Muscle Group Distribution & PR Records */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px' }}>
                {/* Muscle Distribution */}
                <div
                  style={{
                    backgroundColor: '#16191f',
                    padding: '18px',
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <Dumbbell size={16} color="#22c55e" />
                    <span style={{ fontWeight: 700, fontSize: '14px', color: '#fff' }}>训练肌群偏好分布</span>
                  </div>

                  {profile.muscleDistribution.length === 0 ? (
                    <div style={{ color: 'var(--text-dim)', fontSize: '12px', textAlign: 'center', padding: '20px 0' }}>
                      暂无肌群训练记录
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {profile.muscleDistribution.map((m) => {
                        const totalSets = profile.muscleDistribution.reduce((acc, curr) => acc + curr.value, 0) || 1;
                        const pct = Math.round((m.value / totalSets) * 100);
                        return (
                          <div key={m.name}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                              <span style={{ color: '#fff' }}>{m.name}</span>
                              <span style={{ color: 'var(--text-dim)' }}>
                                {m.value} 动作 ({pct}%)
                              </span>
                            </div>
                            <div
                              style={{
                                height: '6px',
                                backgroundColor: 'rgba(255, 255, 255, 0.06)',
                                borderRadius: '3px',
                                overflow: 'hidden',
                              }}
                            >
                              <div
                                style={{
                                  height: '100%',
                                  width: `${pct}%`,
                                  background: 'linear-gradient(90deg, #22c55e, #06b6d4)',
                                  borderRadius: '3px',
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Personal Records */}
                <div
                  style={{
                    backgroundColor: '#16191f',
                    padding: '18px',
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <Trophy size={16} color="#f59e0b" />
                    <span style={{ fontWeight: 700, fontSize: '14px', color: '#fff' }}>单动作极限力量 (PR / 1RM)</span>
                  </div>

                  {profile.prRecords.length === 0 ? (
                    <div style={{ color: 'var(--text-dim)', fontSize: '12px', textAlign: 'center', padding: '20px 0' }}>
                      暂无力量记录
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {profile.prRecords.map((pr) => (
                        <div
                          key={pr.exercise}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 12px',
                            backgroundColor: '#1a1e26',
                            borderRadius: '8px',
                            border: '1px solid rgba(255, 255, 255, 0.04)',
                          }}
                        >
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>{pr.exercise}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>单组极限重: {pr.maxWeight} kg</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: '#f59e0b', fontFamily: 'var(--font-display)' }}>
                              {pr.estimated1RM} kg
                            </div>
                            <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>估算 1RM</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 3. Recent Workouts Timeline */}
              <div
                style={{
                  backgroundColor: '#16191f',
                  padding: '18px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Clock size={16} color="#06b6d4" />
                    <span style={{ fontWeight: 700, fontSize: '14px', color: '#fff' }}>最近训练记录流水 (近 10 场)</span>
                  </div>

                  {onFilterWorkouts && (
                    <button
                      onClick={() => {
                        onFilterWorkouts(userId);
                        onClose();
                      }}
                      className="btn btn-secondary"
                      style={{ padding: '4px 10px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <ExternalLink size={12} /> 查看全部流水
                    </button>
                  )}
                </div>

                {profile.recentWorkouts.length === 0 ? (
                  <div style={{ color: 'var(--text-dim)', fontSize: '12px', textAlign: 'center', padding: '20px 0' }}>
                    该组员暂未记录任何训练
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {profile.recentWorkouts.map((rw) => (
                      <div
                        key={rw.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 14px',
                          backgroundColor: '#1b1f27',
                          borderRadius: '8px',
                          border: '1px solid rgba(255, 255, 255, 0.04)',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: 600, fontSize: '13px', color: '#fff' }}>{rw.title || '力量训练'}</span>
                            <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{rw.date}</span>
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '3px' }}>
                            {rw.exerciseNames.slice(0, 4).join(' · ')}
                            {rw.exerciseNames.length > 4 ? ` 等 ${rw.exerciseNames.length} 个动作` : ''}
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: '#4ade80', fontFamily: 'var(--font-display)' }}>
                            {rw.volumeKg.toLocaleString()} kg
                          </div>
                          <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>
                            {rw.durationMinutes > 0 ? `${rw.durationMinutes} 分钟` : `${rw.exerciseCount} 个动作`}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
