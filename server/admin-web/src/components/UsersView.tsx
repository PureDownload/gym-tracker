import React, { useState, useEffect } from 'react';
import {
  Search,
  UserPlus,
  Shield,
  KeyRound,
  Download,
  Trash2,
  AlertTriangle,
  Trophy,
  Activity,
  Flame,
  Weight,
  TrendingUp,
} from 'lucide-react';
import { api } from '../api';
import type { AdminUser, Pagination, AuthUser, LeaderboardData } from '../types';
import { MemberProfileModal } from './MemberProfileModal';

interface UsersViewProps {
  users: AdminUser[];
  pagination: Pagination;
  currentUser: AuthUser | null;
  onRefresh: () => void;
  onPageChange: (page: number) => void;
  onSearch: (keyword: string, role: string, status: string) => void;
  onNavigateToUserWorkouts?: (userId: string) => void;
}

export const UsersView: React.FC<UsersViewProps> = ({
  users,
  pagination,
  currentUser,
  onRefresh,
  onPageChange,
  onSearch,
  onNavigateToUserWorkouts,
}) => {
  const [subTab, setSubTab] = useState<'list' | 'leaderboard'>('list');
  const [leaderboard, setLeaderboard] = useState<LeaderboardData | null>(null);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [profileTargetUserId, setProfileTargetUserId] = useState<string | null>(null);
  const [profileTargetUsername, setProfileTargetUsername] = useState<string | undefined>();

  const [keyword, setKeyword] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'user'>('user');
  const [actionLoading, setActionLoading] = useState(false);

  const loadLeaderboardData = () => {
    setLeaderboardLoading(true);
    api.getLeaderboard()
      .then((data) => {
        setLeaderboard(data);
      })
      .catch((err) => {
        console.warn('Failed to load leaderboard:', err);
      })
      .finally(() => {
        setLeaderboardLoading(false);
      });
  };

  useEffect(() => {
    if (subTab === 'leaderboard' && !leaderboard) {
      loadLeaderboardData();
    }
  }, [subTab, leaderboard]);


  // Password reset modal
  const [resetTargetUser, setResetTargetUser] = useState<AdminUser | null>(null);
  const [resetNewPassword, setResetNewPassword] = useState('');

  // Delete modal
  const [deleteTargetUser, setDeleteTargetUser] = useState<AdminUser | null>(null);

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(keyword, roleFilter, statusFilter);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newPassword) return;

    setActionLoading(true);
    try {
      await api.createUser({
        username: newUsername.trim(),
        password: newPassword,
        role: newRole,
      });
      alert(`🎉 用户【${newUsername.trim()}】创建成功！`);
      setIsCreateModalOpen(false);
      setNewUsername('');
      setNewPassword('');
      onRefresh();
    } catch (err: any) {
      alert(`创建失败: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleRole = async (user: AdminUser) => {
    const nextRole = user.role === 'admin' ? 'user' : 'admin';
    const confirmMsg = nextRole === 'admin' 
      ? `确定要将用户【${user.username}】提升为管理员吗？其将拥有访问后台控制台的全部权限。`
      : `确定要将管理员【${user.username}】降级为普通健身用户吗？`;
    
    if (!window.confirm(confirmMsg)) return;

    try {
      await api.updateUserRole(user.id, nextRole);
      onRefresh();
    } catch (err: any) {
      alert(`变更角色失败: ${err.message}`);
    }
  };

  const handleToggleStatus = async (user: AdminUser) => {
    const nextStatus = user.status === 'active' ? 'disabled' : 'active';
    const confirmMsg = nextStatus === 'disabled'
      ? `确定要停用账号【${user.username}】吗？停用后该用户将无法登录 App 和同步数据。`
      : `确定要恢复启用账号【${user.username}】吗？`;

    if (!window.confirm(confirmMsg)) return;

    try {
      await api.updateUserStatus(user.id, nextStatus);
      onRefresh();
    } catch (err: any) {
      alert(`变更状态失败: ${err.message}`);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTargetUser || !resetNewPassword) return;

    setActionLoading(true);
    try {
      await api.resetPassword(resetTargetUser.id, resetNewPassword);
      alert(`✅ 已为用户【${resetTargetUser.username}】设置新密码`);
      setResetTargetUser(null);
      setResetNewPassword('');
    } catch (err: any) {
      alert(`重置密码失败: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteTargetUser) return;
    setActionLoading(true);
    try {
      await api.deleteUser(deleteTargetUser.id);
      alert(`已删除用户【${deleteTargetUser.username}】及其全部训练数据`);
      setDeleteTargetUser(null);
      onRefresh();
    } catch (err: any) {
      alert(`删除失败: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const formatTimestamp = (ts: number | null) => {
    if (!ts) return '从未登录';
    const d = new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top View Mode Switcher */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
        <div style={{ display: 'flex', gap: '8px', background: 'rgba(255, 255, 255, 0.04)', padding: '4px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
          <button
            type="button"
            onClick={() => setSubTab('list')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: subTab === 'list' ? 'var(--accent-primary)' : 'transparent',
              color: subTab === 'list' ? '#000' : 'var(--text-muted)',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s',
            }}
          >
            <Activity size={15} /> 组员数据与账号治理
          </button>
          <button
            type="button"
            onClick={() => setSubTab('leaderboard')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: subTab === 'leaderboard' ? 'var(--accent-primary)' : 'transparent',
              color: subTab === 'leaderboard' ? '#000' : 'var(--text-muted)',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s',
            }}
          >
            <Trophy size={15} /> 团队排行榜 (Leaderboards)
          </button>
        </div>

        {subTab === 'list' && (
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="btn btn-primary"
          >
            <UserPlus size={16} /> 新建账号
          </button>
        )}
      </div>

      {subTab === 'list' ? (
        <>
          {/* Top Filter and Actions Toolbar */}
          <div className="card-elevated" style={{ padding: '18px 24px' }}>
            <form onSubmit={handleFilterSubmit} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                {/* Search Input */}
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    placeholder="搜索用户名..."
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    className="input-text"
                    style={{ paddingLeft: '34px', width: '220px' }}
                  />
                  <Search size={15} style={{ position: 'absolute', left: '11px', top: '12px', color: 'var(--text-dim)' }} />
                </div>

                {/* Role Filter */}
                <select
                  value={roleFilter}
                  onChange={(e) => {
                    setRoleFilter(e.target.value);
                    onSearch(keyword, e.target.value, statusFilter);
                  }}
                  className="select-custom"
                >
                  <option value="">全部角色</option>
                  <option value="admin">系统管理员 (Admin)</option>
                  <option value="user">健身用户 (User)</option>
                </select>

                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    onSearch(keyword, roleFilter, e.target.value);
                  }}
                  className="select-custom"
                >
                  <option value="">全部状态</option>
                  <option value="active">正常</option>
                  <option value="disabled">已停用</option>
                </select>

                <button type="submit" className="btn btn-secondary">
                  筛选
                </button>
              </div>
            </form>
          </div>

          {/* Users Data Table */}
          <div className="card-elevated" style={{ overflow: 'hidden' }}>
            <div className="table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>用户名 / 身份</th>
                    <th>角色与权限</th>
                    <th>状态</th>
                    <th>训练统计</th>
                    <th>总举铁容量</th>
                    <th>最后活跃时间</th>
                    <th style={{ textAlign: 'right' }}>操作</th>
                  </tr>
                </thead>
                <tbody>

              {users.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-dim)' }}>
                    暂无匹配的用户记录
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isCurrent = currentUser?.id === u.id;
                  return (
                    <tr key={u.id}>
                      {/* Username */}
                      <td>
                        <div
                          style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
                          onClick={() => {
                            setProfileTargetUserId(u.id);
                            setProfileTargetUsername(u.username);
                          }}
                          title="点击查看该组员的训练画像"
                        >
                          <div style={{
                            width: '34px',
                            height: '34px',
                            borderRadius: '50%',
                            background: u.role === 'admin' ? 'linear-gradient(135deg, #a855f7, #6366f1)' : 'rgba(255, 255, 255, 0.08)',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '13px',
                          }}>
                            {u.username.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ borderBottom: '1px dashed rgba(255, 255, 255, 0.3)' }}>{u.username}</span>
                              {isCurrent && (
                                <span style={{ fontSize: '10px', color: '#22c55e', background: 'rgba(34, 197, 94, 0.15)', padding: '1px 5px', borderRadius: '4px' }}>
                                  当前操作者
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                              注册于 {formatTimestamp(u.createdAt).split(' ')[0]}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td>
                        <button
                          onClick={() => handleToggleRole(u)}
                          title="点击切换角色"
                          style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            padding: 0,
                          }}
                        >
                          {u.role === 'admin' ? (
                            <span className="badge badge-admin">
                              <Shield size={12} /> 管理员
                            </span>
                          ) : (
                            <span className="badge badge-user">
                              健身用户
                            </span>
                          )}
                        </button>
                      </td>

                      {/* Status */}
                      <td>
                        <button
                          onClick={() => handleToggleStatus(u)}
                          disabled={isCurrent}
                          title={isCurrent ? '不能停用自己' : '点击切换启用/停用状态'}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: isCurrent ? 'not-allowed' : 'pointer',
                            padding: 0,
                          }}
                        >
                          {u.status === 'active' ? (
                            <span className="badge badge-active">● 正常</span>
                          ) : (
                            <span className="badge badge-disabled">● 已停用</span>
                          )}
                        </button>
                      </td>

                      {/* Workout stats */}
                      <td>
                        <div style={{ fontSize: '13px', fontWeight: 600 }}>
                          {u.workoutCount} 次打卡
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                          {u.lastWorkoutDate ? `最近: ${u.lastWorkoutDate}` : '尚无训练记录'}
                        </div>
                      </td>

                      {/* Total volume */}
                      <td>
                        <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#4ade80', fontFamily: 'var(--font-display)' }}>
                          {(u.totalVolumeKg / 1000).toFixed(1)} 吨
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                          {u.totalVolumeKg.toLocaleString()} kg
                        </div>
                      </td>

                      {/* Last login */}
                      <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {formatTimestamp(u.lastLoginAt)}
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          {/* Inspect Profile */}
                          <button
                            onClick={() => {
                              setProfileTargetUserId(u.id);
                              setProfileTargetUsername(u.username);
                            }}
                            className="btn btn-secondary btn-icon"
                            title="查看该组员可视化训练画像与力量记录"
                          >
                            <Activity size={14} color="#22c55e" />
                          </button>

                          {/* Export data */}
                          <a
                            href={api.getExportUserUrl(u.id)}
                            download
                            className="btn btn-secondary btn-icon"
                            title="导出全量训练数据 (JSON 备份)"
                            style={{ textDecoration: 'none' }}
                          >
                            <Download size={14} />
                          </a>

                          {/* Reset Password */}
                          <button
                            onClick={() => {
                              setResetTargetUser(u);
                              setResetNewPassword('');
                            }}
                            className="btn btn-secondary btn-icon"
                            title="重置登录密码"
                          >
                            <KeyRound size={14} />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => setDeleteTargetUser(u)}
                            disabled={isCurrent}
                            className="btn btn-danger btn-icon"
                            title={isCurrent ? '无法删除当前账号' : '永久删除用户及数据'}
                            style={{ opacity: isCurrent ? 0.3 : 1 }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {pagination.totalPages > 1 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 24px',
            borderTop: '1px solid var(--border-subtle)',
            fontSize: '13px',
            color: 'var(--text-dim)',
          }}>
            <div>
              共 {pagination.total} 位用户，第 {pagination.page} / {pagination.totalPages} 页
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                onClick={() => onPageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="btn btn-secondary"
                style={{ padding: '5px 12px', fontSize: '12.5px' }}
              >
                上一页
              </button>
              <button
                onClick={() => onPageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="btn btn-secondary"
                style={{ padding: '5px 12px', fontSize: '12.5px' }}
              >
                下一页
              </button>
            </div>
          </div>
        )}
      </div>
        </>
      ) : (
        /* Leaderboards View */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#fff', margin: 0 }}>
                团队力量与活跃度排行榜
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-dim)', margin: '4px 0 0 0' }}>
                点击任意组员卡片，可直接查看其训练画像与单动作力量记录
              </p>
            </div>
            <button
              type="button"
              onClick={loadLeaderboardData}
              disabled={leaderboardLoading}
              className="btn btn-secondary"
              style={{ fontSize: '12px' }}
            >
              {leaderboardLoading ? '正在计算中...' : '刷新榜单数据'}
            </button>
          </div>

          {leaderboardLoading && !leaderboard ? (
            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-dim)' }}>
              正在聚合全员举铁数据...
            </div>
          ) : !leaderboard ? null : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
              {/* 1. Tonnage Ranking */}
              <div className="card-elevated" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <Trophy size={18} color="#eab308" />
                  <span style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>
                    全员累计举铁总吨位榜 (Top 10)
                  </span>
                </div>

                {leaderboard.tonnageRanking.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-dim)', fontSize: '13px' }}>
                    暂无举铁数据
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {leaderboard.tonnageRanking.map((item) => (
                      <div
                        key={item.userId}
                        onClick={() => {
                          setProfileTargetUserId(item.userId);
                          setProfileTargetUsername(item.username);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 14px',
                          backgroundColor: 'rgba(255, 255, 255, 0.03)',
                          borderRadius: '10px',
                          border: '1px solid rgba(255, 255, 255, 0.05)',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.07)';
                          e.currentTarget.style.borderColor = 'rgba(34, 197, 94, 0.3)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
                          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '8px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: '12px',
                              backgroundColor:
                                item.rank === 1
                                  ? 'rgba(234, 179, 8, 0.2)'
                                  : item.rank === 2
                                  ? 'rgba(148, 163, 184, 0.2)'
                                  : item.rank === 3
                                  ? 'rgba(180, 83, 9, 0.2)'
                                  : 'rgba(255, 255, 255, 0.05)',
                              color:
                                item.rank === 1
                                  ? '#facc15'
                                  : item.rank === 2
                                  ? '#cbd5e1'
                                  : item.rank === 3
                                  ? '#f97316'
                                  : 'var(--text-dim)',
                            }}
                          >
                            {item.rank}
                          </div>
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {item.username}
                              {item.role === 'admin' && (
                                <span style={{ fontSize: '10px', color: '#a855f7' }}>[管]</span>
                              )}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                              累计打卡 {item.totalWorkouts} 场
                            </div>
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '16px', fontWeight: 800, color: '#4ade80', fontFamily: 'var(--font-display)' }}>
                            {item.tonnage} <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>吨</span>
                          </div>
                          <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>
                            {item.totalVolumeKg.toLocaleString()} kg
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 2. Activity Ranking */}
              <div className="card-elevated" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <Flame size={18} color="#06b6d4" />
                  <span style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>
                    近 30 天打卡活跃度榜 (Top 10)
                  </span>
                </div>

                {leaderboard.activityRanking.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-dim)', fontSize: '13px' }}>
                    暂无活跃记录
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {leaderboard.activityRanking.map((item) => (
                      <div
                        key={item.userId}
                        onClick={() => {
                          setProfileTargetUserId(item.userId);
                          setProfileTargetUsername(item.username);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 14px',
                          backgroundColor: 'rgba(255, 255, 255, 0.03)',
                          borderRadius: '10px',
                          border: '1px solid rgba(255, 255, 255, 0.05)',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.07)';
                          e.currentTarget.style.borderColor = 'rgba(6, 182, 212, 0.3)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
                          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '8px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: '12px',
                              backgroundColor:
                                item.rank === 1
                                  ? 'rgba(6, 182, 212, 0.2)'
                                  : item.rank === 2
                                  ? 'rgba(148, 163, 184, 0.2)'
                                  : item.rank === 3
                                  ? 'rgba(180, 83, 9, 0.2)'
                                  : 'rgba(255, 255, 255, 0.05)',
                              color:
                                item.rank === 1
                                  ? '#22d3ee'
                                  : item.rank === 2
                                  ? '#cbd5e1'
                                  : item.rank === 3
                                  ? '#f97316'
                                  : 'var(--text-dim)',
                            }}
                          >
                            {item.rank}
                          </div>
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {item.username}
                              {item.role === 'admin' && (
                                <span style={{ fontSize: '10px', color: '#a855f7' }}>[管]</span>
                              )}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                              最近训练: {item.lastWorkoutDate || '未知'}
                            </div>
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '16px', fontWeight: 800, color: '#22d3ee', fontFamily: 'var(--font-display)' }}>
                            {item.recentWorkouts30d} <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>场</span>
                          </div>
                          <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>
                            月活跃率 {Math.min(100, Math.round((item.recentWorkouts30d / 30) * 100))}%
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}


      {/* Modal: Create User */}
      {isCreateModalOpen && (
        <div className="modal-overlay" onClick={() => setIsCreateModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ padding: '28px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#fff', marginBottom: '6px' }}>
              新建健身/管理员账号
            </h3>
            <p style={{ fontSize: '12.5px', color: 'var(--text-dim)', marginBottom: '20px' }}>
              新创建的账号可立即在手机 App 端登录同步，或在 PC 后台登录。
            </p>

            <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                  用户名
                </label>
                <input
                  type="text"
                  required
                  placeholder="至少 2 个字符"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="input-text"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                  初始登录密码
                </label>
                <input
                  type="password"
                  required
                  placeholder="至少 4 个字符"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input-text"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                  角色权限设定
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as 'admin' | 'user')}
                  className="select-custom"
                  style={{ width: '100%' }}
                >
                  <option value="user">普通健身用户 (仅允许 App 记录与同步)</option>
                  <option value="admin">系统管理员 (允许登录 PC 后台与 App)</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="btn btn-secondary"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="btn btn-primary"
                >
                  {actionLoading ? '正在创建...' : '确认创建'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Reset Password */}
      {resetTargetUser && (
        <div className="modal-overlay" onClick={() => setResetTargetUser(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ padding: '28px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#fff', marginBottom: '6px' }}>
              重置用户密码 · {resetTargetUser.username}
            </h3>
            <p style={{ fontSize: '12.5px', color: 'var(--text-dim)', marginBottom: '20px' }}>
              管理员可直接为忘记密码的用户重置并设定新密码。
            </p>

            <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                  输入新密码
                </label>
                <input
                  type="password"
                  required
                  placeholder="至少 4 个字符"
                  value={resetNewPassword}
                  onChange={(e) => setResetNewPassword(e.target.value)}
                  className="input-text"
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setResetTargetUser(null)}
                  className="btn btn-secondary"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="btn btn-primary"
                >
                  {actionLoading ? '正在重置...' : '确认重置'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Delete User Confirmation */}
      {deleteTargetUser && (
        <div className="modal-overlay" onClick={() => setDeleteTargetUser(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ padding: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'rgba(239, 68, 68, 0.15)',
                color: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#fff' }}>
                  危险操作：删除用户
                </h3>
                <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                  将级联清除该用户的所有关联记录
                </div>
              </div>
            </div>

            <p style={{ fontSize: '13.5px', color: '#cbd5e1', lineHeight: '1.6', marginBottom: '22px' }}>
              你确定要永久删除用户 <strong style={{ color: '#fff' }}>【{deleteTargetUser.username}】</strong> 吗？
              <br />
              <span style={{ color: '#f87171', fontSize: '12px' }}>
                ⚠️ 此操作不可撤销！该用户的全部训练日志、动作模板及体测数据将被永久擦除。
              </span>
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setDeleteTargetUser(null)}
                className="btn btn-secondary"
              >
                取消
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleDeleteUser}
                className="btn btn-danger"
              >
                {actionLoading ? '正在删除...' : '确认永久删除'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Member Visual Training Profile */}
      <MemberProfileModal
        userId={profileTargetUserId}
        username={profileTargetUsername}
        onClose={() => {
          setProfileTargetUserId(null);
          setProfileTargetUsername(undefined);
        }}
        onFilterWorkouts={onNavigateToUserWorkouts}
      />
    </div>
  );
};

