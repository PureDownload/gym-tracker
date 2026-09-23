import React, { useState, useEffect } from 'react';
import {
  Cloud,
  HardDrive,
  Server,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  LogOut,
  UploadCloud,
  X,
  ShieldCheck,
  Activity,
  User,
  KeyRound,
  Globe,
} from 'lucide-react';
import { cloudAuthService } from '../services/cloudAuthService';
import { cloudSyncService } from '../services/cloudSyncService';
import type { CloudConfig, SyncStatusInfo } from '../types/cloud';

interface CloudSyncModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  onDataChanged: () => void;
  isSubPage?: boolean;
}

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({
  isOpen = true,
  onClose,
  onDataChanged,
  isSubPage = false,
}) => {
  const [config, setConfig] = useState<CloudConfig>(cloudAuthService.getConfig());
  const [syncStatus, setSyncStatus] = useState<SyncStatusInfo>(cloudSyncService.getStatus());

  // Form states
  const [serverUrl, setServerUrl] = useState(config.serverUrl || '');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  // Async action states
  const [isTestingPing, setIsTestingPing] = useState(false);
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);
  const [isSyncingNow, setIsSyncingNow] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);

  // Feedback notifications
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const showFeedback = (type: 'success' | 'error' | 'info', text: string) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 4500);
  };

  useEffect(() => {
    if (!isSubPage && !isOpen) return;

    // Refresh states when modal opens
    const currentCfg = cloudAuthService.getConfig();
    setConfig(currentCfg);
    setServerUrl(currentCfg.serverUrl || '');

    const unsubscribe = cloudSyncService.subscribe((status) => {
      setSyncStatus(status);
    });

    // Check connectivity if in cloud mode
    if (currentCfg.mode === 'cloud_sync' && currentCfg.token) {
      cloudSyncService.checkConnection();
    }

    return () => unsubscribe();
  }, [isOpen, isSubPage]);

  if (!isSubPage && !isOpen) return null;

  // Test Ping
  const handleTestPing = async () => {
    if (!serverUrl.trim()) {
      showFeedback('error', '请先输入小主机服务器地址');
      return;
    }
    setIsTestingPing(true);
    try {
      const res = await cloudAuthService.pingServer(serverUrl);
      if (res.success) {
        showFeedback('success', `连通正常！网络延迟约 ${res.latencyMs}ms`);
      } else {
        showFeedback('error', `连通失败: ${res.error}`);
      }
    } finally {
      setIsTestingPing(false);
    }
  };

  // Submit Login / Register
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serverUrl.trim() || !username.trim() || !password.trim()) {
      showFeedback('error', '请完整填写服务器地址、用户名及密码');
      return;
    }

    setIsSubmittingAuth(true);
    try {
      if (isRegisterMode) {
        await cloudAuthService.register(serverUrl, username, password);
        showFeedback('success', '账号注册成功，已接入小主机私有云！');
      } else {
        await cloudAuthService.login(serverUrl, username, password);
        showFeedback('success', '登录成功，已接入小主机私有云！');
      }

      const updatedCfg = cloudAuthService.getConfig();
      setConfig(updatedCfg);
      setPassword('');

      // Auto trigger sync after login
      await cloudSyncService.sync();
      onDataChanged();
    } catch (err: any) {
      showFeedback('error', err.message || '操作失败');
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  // Switch back to local mode / Logout
  const handleLogout = () => {
    if (window.confirm('确定断开与小主机的连接并切回纯本地模式吗？本地已有的健身数据将完好保留。')) {
      cloudAuthService.logout();
      const updated = cloudAuthService.getConfig();
      setConfig(updated);
      cloudSyncService.checkConnection();
      showFeedback('info', '已切回本地模式，所有数据保存在手机 IndexedDB 中');
    }
  };

  // Trigger manual sync
  const handleManualSync = async () => {
    setIsSyncingNow(true);
    try {
      const res = await cloudSyncService.sync();
      if (res.success) {
        showFeedback(
          'success',
          `同步成功！远端拉取 ${res.pulledWorkouts} 条，向小主机推送 ${res.pushedWorkouts} 条`
        );
        onDataChanged();
      } else {
        showFeedback('error', `同步失败: ${res.error}`);
      }
    } finally {
      setIsSyncingNow(false);
    }
  };

  // Migrate local IndexedDB data to server
  const handleMigrateLocal = async () => {
    if (
      !window.confirm(
        '此操作将把当前手机本地所有的训练记录与自定义动作完整合并上传至小主机。是否继续？'
      )
    ) {
      return;
    }

    setIsMigrating(true);
    try {
      const res = await cloudSyncService.migrateLocalToServer();
      if (res.success) {
        showFeedback('success', `数据合并成功！已成功上传 ${res.count} 条记录到小主机`);
        onDataChanged();
      } else {
        showFeedback('error', `上传合并失败: ${res.error}`);
      }
    } finally {
      setIsMigrating(false);
    }
  };

  const isConnected = config.mode === 'cloud_sync' && Boolean(config.token);

  const renderBody = () => (
    <>
      {/* Feedback Alert */}
      {feedback && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              marginBottom: '14px',
              fontSize: '0.84rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor:
                feedback.type === 'success'
                  ? 'rgba(16, 185, 129, 0.15)'
                  : feedback.type === 'error'
                  ? 'rgba(239, 68, 68, 0.15)'
                  : 'rgba(59, 130, 246, 0.15)',
              border: `1px solid ${
                feedback.type === 'success'
                  ? 'var(--accent-primary)'
                  : feedback.type === 'error'
                  ? 'var(--accent-danger)'
                  : 'var(--accent-cyan)'
              }`,
              color:
                feedback.type === 'success'
                  ? 'var(--accent-primary)'
                  : feedback.type === 'error'
                  ? 'var(--accent-danger)'
                  : 'var(--accent-cyan)',
            }}
          >
            {feedback.type === 'success' ? (
              <CheckCircle size={16} />
            ) : feedback.type === 'error' ? (
              <AlertCircle size={16} />
            ) : (
              <Activity size={16} />
            )}
            <span>{feedback.text}</span>
          </div>
        )}

        {/* Mode Introduction Banner */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '10px',
            marginBottom: '16px',
          }}
        >
          {/* Local Mode Card */}
          <div
            style={{
              padding: '12px',
              borderRadius: '10px',
              border: !isConnected
                ? '2px solid var(--accent-primary)'
                : '1px solid var(--border-color)',
              backgroundColor: !isConnected ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-secondary)',
              cursor: 'default',
              transition: 'all 0.2s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <HardDrive size={16} color={!isConnected ? 'var(--accent-primary)' : 'var(--text-muted)'} />
              <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>本地存储</span>
              {!isConnected && (
                <span
                  style={{
                    fontSize: '0.68rem',
                    padding: '1px 5px',
                    borderRadius: '4px',
                    backgroundColor: 'var(--accent-primary)',
                    color: 'var(--text-inverse)',
                    fontWeight: 700,
                  }}
                >
                  当前
                </span>
              )}
            </div>
            <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.35 }}>
              默认模式。数据存在手机 IndexedDB，极端断网秒开。
            </p>
          </div>

          {/* J1900 Cloud Mode Card */}
          <div
            style={{
              padding: '12px',
              borderRadius: '10px',
              border: isConnected
                ? '2px solid var(--accent-cyan)'
                : '1px solid var(--border-color)',
              backgroundColor: isConnected ? 'rgba(6, 182, 212, 0.08)' : 'var(--bg-secondary)',
              cursor: 'default',
              transition: 'all 0.2s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <Cloud size={16} color={isConnected ? 'var(--accent-cyan)' : 'var(--text-muted)'} />
              <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>J1900 私有云</span>
              {isConnected && (
                <span
                  style={{
                    fontSize: '0.68rem',
                    padding: '1px 5px',
                    borderRadius: '4px',
                    backgroundColor: 'var(--accent-cyan)',
                    color: 'var(--text-inverse)',
                    fontWeight: 700,
                  }}
                >
                  已连接
                </span>
              )}
            </div>
            <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.35 }}>
              Tailscale 组网连接，自动双向同步与跨设备漫游。
            </p>
          </div>
        </div>

        {/* View Branch A: Already Connected & Logged in */}
        {isConnected ? (
          <div>
            {/* Server Status Dashboard Card */}
            <div
              style={{
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: '10px',
                padding: '14px',
                marginBottom: '16px',
                border: '1px solid var(--border-color)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      backgroundColor:
                        syncStatus.state === 'online'
                          ? 'var(--accent-primary)'
                          : syncStatus.state === 'syncing'
                          ? 'var(--accent-cyan)'
                          : 'var(--accent-warning)',
                      boxShadow: `0 0 8px ${
                        syncStatus.state === 'online'
                          ? 'var(--accent-primary)'
                          : 'var(--accent-warning)'
                      }`,
                    }}
                  />
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                    {syncStatus.state === 'online'
                      ? '小主机在线 (Tailscale 畅通)'
                      : syncStatus.state === 'syncing'
                      ? '正在同步数据...'
                      : syncStatus.state === 'connecting'
                      ? '正在探测连接...'
                      : '离线暂存模式 (连网自动同步)'}
                  </span>
                </div>
                {syncStatus.pingMs !== null && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--accent-primary)' }}>
                    延迟: {syncStatus.pingMs}ms
                  </span>
                )}
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '8px',
                  fontSize: '0.8rem',
                  color: 'var(--text-secondary)',
                }}
              >
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>登录用户: </span>
                  <strong style={{ color: 'var(--text-main)' }}>{config.user?.username}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>上次同步: </span>
                  <strong style={{ color: 'var(--text-main)' }}>
                    {config.lastSyncTime
                      ? new Date(config.lastSyncTime).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })
                      : '未同步'}
                  </strong>
                </div>
                <div style={{ gridColumn: 'span 2', wordBreak: 'break-all' }}>
                  <span style={{ color: 'var(--text-muted)' }}>节点地址: </span>
                  <span style={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>
                    {config.serverUrl}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons Area */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Trigger Manual Sync */}
              <button
                className="btn-primary"
                onClick={handleManualSync}
                disabled={isSyncingNow}
                style={{ width: '100%', justifyContent: 'center', height: '42px' }}
              >
                <RefreshCw
                  size={18}
                  style={{ animation: isSyncingNow ? 'spin 1s linear infinite' : 'none' }}
                />
                <span>{isSyncingNow ? '正在双向同步...' : '立即与小主机双向同步'}</span>
              </button>

              {/* One-click Migration: Local to Server */}
              <button
                className="btn-secondary"
                onClick={handleMigrateLocal}
                disabled={isMigrating}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <UploadCloud size={18} color="var(--accent-cyan)" />
                <span>
                  {isMigrating ? '正在上传迁移...' : '合并上传本地全量数据至小主机'}
                </span>
              </button>

              {/* Auto Sync Toggle */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  backgroundColor: 'var(--bg-secondary)',
                  borderRadius: '8px',
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                }}
              >
                <span>保存训练日志时自动在后台静默同步</span>
                <input
                  type="checkbox"
                  checked={config.autoSyncOnSave}
                  onChange={(e) => {
                    const updated = cloudAuthService.saveConfig({ autoSyncOnSave: e.target.checked });
                    setConfig(updated);
                  }}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--accent-primary)' }}
                />
              </label>

              {/* Logout button */}
              <button
                className="btn-secondary"
                onClick={handleLogout}
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  color: 'var(--accent-danger)',
                  marginTop: '6px',
                }}
              >
                <LogOut size={16} />
                <span>断开小主机 (退出登录并切回本地模式)</span>
              </button>
            </div>
          </div>
        ) : (
          /* View Branch B: Not Connected -> Show Setup & Login Form */
          <div>
            <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Server URL field */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.82rem',
                    color: 'var(--text-secondary)',
                    marginBottom: '5px',
                  }}
                >
                  <Globe size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '4px' }} />
                  J1900 小主机地址 (Tailscale 内网 IP 或 MagicDNS 域名)
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="如 http://100.86.100.12:3001 或 https://j1900.ts.net"
                    value={serverUrl}
                    onChange={(e) => setServerUrl(e.target.value)}
                    style={{ flex: 1, padding: '10px 12px', fontSize: '0.86rem' }}
                    required
                  />
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={handleTestPing}
                    disabled={isTestingPing}
                    style={{ padding: '0 12px', fontSize: '0.82rem', whiteSpace: 'nowrap' }}
                  >
                    {isTestingPing ? (
                      <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
                    ) : (
                      <Activity size={14} />
                    )}
                    <span>测试连通</span>
                  </button>
                </div>
                <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  💡 提示：请确保手机已开启 Tailscale 客户端，可直接填小主机 100.x.y.z IP。
                </div>
              </div>

              {/* Username field */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.82rem',
                    color: 'var(--text-secondary)',
                    marginBottom: '5px',
                  }}
                >
                  <User size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '4px' }} />
                  用户名
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="请输入您的用户名"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', fontSize: '0.86rem' }}
                  required
                />
              </div>

              {/* Password field */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.82rem',
                    color: 'var(--text-secondary)',
                    marginBottom: '5px',
                  }}
                >
                  <KeyRound size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '4px' }} />
                  密码
                </label>
                <input
                  type="password"
                  className="input-field"
                  placeholder="请输入密码"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', fontSize: '0.86rem' }}
                  required
                />
              </div>

              {/* Submit Buttons */}
              <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isSubmittingAuth}
                  style={{ width: '100%', justifyContent: 'center', height: '42px' }}
                >
                  <ShieldCheck size={18} />
                  <span>
                    {isSubmittingAuth
                      ? '正在验证...'
                      : isRegisterMode
                      ? '注册并开启小主机同步'
                      : '登录并开启小主机同步'}
                  </span>
                </button>

                <button
                  type="button"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--accent-cyan)',
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    padding: '6px',
                    textAlign: 'center',
                  }}
                  onClick={() => setIsRegisterMode(!isRegisterMode)}
                >
                  {isRegisterMode
                    ? '已有小主机账号？点击直接登录'
                    : '小主机上首次使用？点击注册新账号'}
                </button>
              </div>
            </form>
          </div>
        )}
    </>
  );

  if (isSubPage) {
    return (
      <div className="subpage-body-container animate-fade-in" style={{ padding: '4px 0 24px' }}>
        {renderBody()}
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '520px' }}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Server size={20} color="var(--accent-cyan)" />
            <h3 className="modal-title">私有云与双模存储</h3>
          </div>
          <button className="icon-btn" style={{ width: '32px', height: '32px' }} onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-body smooth-scroll" style={{ paddingRight: '4px' }}>
          {renderBody()}
        </div>
      </div>
    </div>
  );
};
