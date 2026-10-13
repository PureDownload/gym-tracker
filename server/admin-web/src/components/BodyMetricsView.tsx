import React, { useState } from 'react';
import { Scale, Percent, Calendar } from 'lucide-react';
import type { AdminBodyMetric, Pagination, AdminUser } from '../types';

interface BodyMetricsViewProps {
  metrics: AdminBodyMetric[];
  users: AdminUser[];
  pagination: Pagination;
  onRefresh: () => void;
  onPageChange: (page: number) => void;
  onSelectUser: (userId: string) => void;
}

export const BodyMetricsView: React.FC<BodyMetricsViewProps> = ({
  metrics,
  users,
  pagination,
  onRefresh,
  onPageChange,
  onSelectUser,
}) => {
  const [selectedUserId, setSelectedUserId] = useState('');

  const handleUserChange = (val: string) => {
    setSelectedUserId(val);
    onSelectUser(val);
  };

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Filter */}
      <div className="card-elevated" style={{ padding: '18px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>筛选用户:</span>
          <select
            value={selectedUserId}
            onChange={(e) => handleUserChange(e.target.value)}
            className="select-custom"
            style={{ minWidth: '180px' }}
          >
            <option value="">全部健身用户</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.username} ({u.bodyMetricCount} 条体测)
              </option>
            ))}
          </select>
          <button type="button" onClick={onRefresh} className="btn btn-secondary" title="刷新体测数据">
            刷新
          </button>
        </div>
      </div>

      {/* Metrics Table */}
      <div className="card-elevated" style={{ overflow: 'hidden' }}>
        <div className="table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>打卡日期</th>
                <th>用户</th>
                <th>体重 (Weight)</th>
                <th>体脂率 (Body Fat)</th>
                <th>身体围度 (Measurements)</th>
                <th>备注与状态</th>
              </tr>
            </thead>
            <tbody>
              {metrics.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-dim)' }}>
                    暂无体测数据
                  </td>
                </tr>
              ) : (
                metrics.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                        <Calendar size={13} color="var(--text-dim)" />
                        {m.date}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#e2e8f0' }}>
                        {m.username}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: '#4ade80' }}>
                        <Scale size={14} />
                        {m.weightKg ? `${m.weightKg} kg` : '--'}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: '#22d3ee' }}>
                        <Percent size={14} />
                        {m.bodyFatPercent ? `${m.bodyFatPercent}%` : '--'}
                      </div>
                    </td>
                    <td>
                      {Object.keys(m.measurements || {}).length > 0 ? (
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {Object.entries(m.measurements).map(([k, v]) => (
                            <span
                              key={k}
                              style={{
                                fontSize: '11px',
                                background: 'rgba(255, 255, 255, 0.05)',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                color: 'var(--text-muted)',
                              }}
                            >
                              {k}: {v}cm
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-dim)', fontSize: '12px' }}>无围度记录</span>
                      )}
                    </td>
                    <td style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
                      {m.notes || '--'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderTop: '1px solid var(--border-subtle)',
            fontSize: '13px',
            color: 'var(--text-dim)',
          }}>
            <div>
              共 {pagination.total} 条体测，第 {pagination.page} / {pagination.totalPages} 页
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => onPageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="btn btn-secondary"
                style={{ padding: '6px 14px' }}
              >
                上一页
              </button>
              <button
                onClick={() => onPageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="btn btn-secondary"
                style={{ padding: '6px 14px' }}
              >
                下一页
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
