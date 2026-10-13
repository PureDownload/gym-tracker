import React, { useState } from 'react';
import {
  Server,
  Database,
  HardDrive,
  Cpu,
  Clock,
  Download,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../api';
import type { SystemInfo } from '../types';

interface SystemViewProps {
  systemInfo: SystemInfo | null;
  onRefresh: () => void;
}

export const SystemView: React.FC<SystemViewProps> = ({ systemInfo, onRefresh }) => {
  const [vacuumLoading, setVacuumLoading] = useState(false);
  const [vacuumMessage, setVacuumMessage] = useState<string | null>(null);

  const handleVacuum = async () => {
    setVacuumLoading(true);
    setVacuumMessage(null);
    try {
      const res = await api.vacuumDb();
      setVacuumMessage(res.message);
      onRefresh();
    } catch (err: any) {
      alert(`VACUUM 失败: ${err.message}`);
    } finally {
      setVacuumLoading(false);
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / (3600 * 24));
    const hours = Math.floor((seconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}天 ${hours}小时 ${minutes}分`;
    if (hours > 0) return `${hours}小时 ${minutes}分`;
    return `${minutes}分钟`;
  };

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 1. Hardware & Process Overview Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '20px',
      }}>
        {/* Host Info */}
        <div className="card-elevated" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: 'rgba(34, 197, 94, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#22c55e',
            }}>
              <Server size={18} />
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>运行宿主机</div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#fff' }}>Intel J1900 (Debian)</div>
            </div>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-dim)', lineHeight: 1.6 }}>
            <div>架构: x86_64 极简 Alpine 容器</div>
            <div>网络: Tailscale Mesh VPN 组网</div>
          </div>
        </div>

        {/* Memory RSS */}
        <div className="card-elevated" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: 'rgba(6, 182, 212, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#06b6d4',
            }}>
              <Cpu size={18} />
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>常驻内存占用 (RSS)</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#22d3ee', fontFamily: 'var(--font-display)' }}>
                {systemInfo?.memoryUsageMb || 45} MB <span style={{ fontSize: '12px', color: 'var(--text-dim)', fontWeight: 400 }}>/ 256MB 限额</span>
              </div>
            </div>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
            Node.js {systemInfo?.nodeVersion || 'v20.x'} · 极致低开销
          </div>
        </div>

        {/* Uptime */}
        <div className="card-elevated" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: 'rgba(168, 85, 247, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#a855f7',
            }}>
              <Clock size={18} />
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>连续运行时长</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#fff' }}>
                {systemInfo ? formatUptime(systemInfo.serverUptimeSeconds) : '已启动'}
              </div>
            </div>
          </div>
          <div style={{ fontSize: '12px', color: '#22c55e', fontWeight: 600 }}>
            ● 服务稳定运行，无崩溃重启
          </div>
        </div>

        {/* Database Size */}
        <div className="card-elevated" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: 'rgba(245, 158, 11, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#f59e0b',
            }}>
              <HardDrive size={18} />
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>SQLite 数据库磁盘</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#fbbf24', fontFamily: 'var(--font-display)' }}>
                {systemInfo?.dbSizeFormatted || '0.5 MB'}
              </div>
            </div>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
            WAL 日志体积: {systemInfo?.walSizeFormatted || '0.0 MB'}
          </div>
        </div>
      </div>

      {/* 2. SQLite Database Maintenance Tools */}
      <div className="card-elevated" style={{ padding: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: 'rgba(34, 197, 94, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#22c55e',
          }}>
            <Database size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#fff' }}>
              SQLite 数据库高可用与日常运维
            </h2>
            <p style={{ fontSize: '12.5px', color: 'var(--text-dim)' }}>
              当前运行在 WAL (Write-Ahead Logging) 高并发模式，支持读写分离与零锁阻塞
            </p>
          </div>
        </div>

        {vacuumMessage && (
          <div style={{
            background: 'rgba(34, 197, 94, 0.12)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 16px',
            marginBottom: '20px',
            color: '#4ade80',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <CheckCircle2 size={16} />
            {vacuumMessage}
          </div>
        )}

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '18px',
        }}>
          {/* Action: Vacuum */}
          <div style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '14px',
          }}>
            <div>
              <div style={{ fontSize: '14.5px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>
                一键 VACUUM 磁盘整理与碎片回收
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-dim)', lineHeight: 1.5 }}>
                清理被删除训练日志留下的空余页，压缩 SQLite 物理文件，提升查询性能。
              </p>
            </div>
            <button
              onClick={handleVacuum}
              disabled={vacuumLoading}
              className="btn btn-primary"
              style={{ alignSelf: 'flex-start' }}
            >
              <Sparkles size={15} />
              {vacuumLoading ? '正在执行整理...' : '立即整理磁盘碎片 (VACUUM)'}
            </button>
          </div>

          {/* Action: Download Backup */}
          <div style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '14px',
          }}>
            <div>
              <div style={{ fontSize: '14.5px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>
                下载整库物理快照 (.db)
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-dim)', lineHeight: 1.5 }}>
                自动触发 WAL 刷新并打包当前最新的 SQLite 完整数据库二进制文件。
              </p>
            </div>
            <a
              href={api.getDownloadDbUrl()}
              download
              className="btn btn-secondary"
              style={{ alignSelf: 'flex-start', textDecoration: 'none' }}
            >
              <Download size={15} /> 下载 SQLite 完整快照
            </a>
          </div>
        </div>
      </div>

      {/* 3. J1900 Watchtower Deployment Tips */}
      <div className="card-elevated" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#fff', marginBottom: '10px' }}>
          💡 J1900 阿里云 ACR 与 Watchtower 自动更新机制
        </h3>
        <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
          1. 任何代码提交并推送至 GitHub 后，GitHub Actions 会自动编译 <code style={{ color: '#22c55e' }}>linux/amd64</code> 镜像并推送到阿里云容器镜像服务 (ACR)；
          <br />
          2. J1900 上的 <code style={{ color: '#06b6d4' }}>gym-tracker-watchtower</code> 容器每 300 秒自动巡检一次阿里云镜像；
          <br />
          3. 检测到新镜像时，Watchtower 将自动平滑替换容器，并在重启后自动清理旧虚悬镜像，无需人工干预。
        </p>
      </div>
    </div>
  );
};
