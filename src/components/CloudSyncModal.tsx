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
  Eye,
  EyeOff,
  LogIn,
  UserPlus,
  Check,
  Zap,
} from 'lucide-react';
import { cloudAuthService } from '../services/cloudAuthService';
import { cloudSyncService } from '../services/cloudSyncService';
import type { CloudConfig, SyncStatusInfo } from '../types/cloud';

const LS_LAST_SERVER_URL = 'irontrack_last_server_url';
const LS_LAST_USERNAME = 'irontrack_last_username';

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
  const [config, setConfig] = useState<CloudConfig>(() => cloudAuthService.getConfig());
  const [syncStatus, setSyncStatus] = useState<SyncStatusInfo>(() => cloudSyncService.getStatus());

  // Form states with persistent defaults to prevent accidental input resetting
  const [serverUrl, setServerUrl] = useState<string>(() => {
    const cfg = cloudAuthService.getConfig();
    return cfg.serverUrl || localStorage.getItem(LS_LAST_SERVER_URL) || '';
  });
  const [username, setUsername] = useState<string>(() => {
    const cfg = cloudAuthService.getConfig();
    return cfg.user?.username || localStorage.getItem(LS_LAST_USERNAME) || '';
  });
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  // Connectivity & ping result state
  const [pingResult, setPingResult] = useState<{ success: boolean; latencyMs?: number; error?: string } | null>(null);

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

    // Only update form if active config has non-empty values (never overwrite user typed drafts with empty strings)
    if (currentCfg.serverUrl) {
      setServerUrl(currentCfg.serverUrl);
    }
    if (currentCfg.user?.username) {
      setUsername(currentCfg.user.username);
    }

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

  // Realtime persistence handlers
  const handleServerUrlChange = (val: string) => {
    setServerUrl(val);
    setPingResult(null);
    try {
      localStorage.setItem(LS_LAST_SERVER_URL, val);
    } catch {}
  };

  const handleUsernameChange = (val: string) => {
    setUsername(val);
    try {
      localStorage.setItem(LS_LAST_USERNAME, val);
    } catch {}
  };

  // Quick URL helpers for mobile users
  const handleAppendPort = () => {
    let clean = serverUrl.trim();
    if (!clean) {
      clean = 'http://100.64.0.10:3001';
    } else if (!/:\d+$/.test(clean) && !/:\d+\//.test(clean)) {
      clean = clean.replace(/\/+$/, '') + ':3001';
    }
    handleServerUrlChange(clean);
  };

  const handlePrependHttp = () => {
    let clean = serverUrl.trim();
    if (!clean) {
      clean = 'http://';
    } else if (!/^https?:\/\//i.test(clean)) {
      clean = 'http://' + clean;
    }
    handleServerUrlChange(clean);
  };

  // Mobile keyboard scroll into view handler
  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    const target = e.currentTarget;
    setTimeout(() => {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 280);
  };

  // Test Ping
  const handleTestPing = async () => {
    if (!serverUrl.trim()) {
      showFeedback('error', '请先输入小主机服务器地址');
      return;
    }
    setIsTestingPing(true);
    setPingResult(null);
    try {
      const res = await cloudAuthService.pingServer(serverUrl);
      if (res.success) {
        setPingResult({ success: true, latencyMs: res.latencyMs });
        showFeedback('success', `连通正常！网络延迟约 ${res.latencyMs}ms`);
      } else {
        setPingResult({ success: false, error: res.error });
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

      // Persist latest inputs
      try {
        localStorage.setItem(LS_LAST_SERVER_URL, serverUrl.trim());
        localStorage.setItem(LS_LAST_USERNAME, username.trim());
      } catch {}

      const updatedCfg = cloudAuthService.getConfig();
      setConfig(updatedCfg);
      setPassword('');

      // Auto trigger sync after login
      await cloudSyncService.sync();
      onDataChanged();
    } catch (err: any) {
      showFeedback('error', err.message || '操作失败');
      // Intentionally DO NOT clear password or username so the user doesn't have to re-type
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
            borderRadius: '10px',
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

      {/* View Branch A: Already Connected & Logged in */}
      {isConnected ? (
        <div>
          {/* Mode Summary Indicator */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '10px',
              marginBottom: '16px',
            }}
          >
            <div
              style={{
                padding: '12px',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-secondary)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <HardDrive size={16} color="var(--text-muted)" />
                <span style={{ fontWeight: 600, fontSize: '0.86rem' }}>本地存储</span>
              </div>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.35 }}>
                手机 IndexedDB 离线秒开保障
              </p>
            </div>

            <div
              style={{
                padding: '12px',
                borderRadius: '10px',
                border: '2px solid var(--accent-cyan)',
                backgroundColor: 'rgba(6, 182, 212, 0.08)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <Cloud size={16} color="var(--accent-cyan)" />
                <span style={{ fontWeight: 600, fontSize: '0.86rem' }}>J1900 私有云</span>
                <span
                  style={{
                    fontSize: '0.65rem',
                    padding: '1px 5px',
                    borderRadius: '4px',
                    backgroundColor: 'var(--accent-cyan)',
                    color: 'var(--text-inverse)',
                    fontWeight: 700,
                  }}
                >
                  已连接
                </span>
              </div>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.35 }}>
                Tailscale 实时双向增量同步中
              </p>
            </div>
          </div>

          {/* Server Status Dashboard Card */}
          <div
            style={{
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: '12px',
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
                <span style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', fontWeight: 600 }}>
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
              style={{ width: '100%', justifyContent: 'center', height: '44px' }}
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
        /* View Branch B: Not Connected -> Show Sleek, Keyboard-Friendly Login & Setup Card at TOP */
        <div>
          {/* Main Focused Authentication Card */}
          <div className="cloud-auth-card animate-fade-in">
            {/* Top Segmented Mode Control (登录 / 注册) */}
            <div className="cloud-auth-segmented">
              <button
                type="button"
                className={`cloud-auth-seg-btn ${!isRegisterMode ? 'active' : ''}`}
                onClick={() => setIsRegisterMode(false)}
              >
                <LogIn size={15} />
                <span>账号登录</span>
              </button>
              <button
                type="button"
                className={`cloud-auth-seg-btn ${isRegisterMode ? 'active' : ''}`}
                onClick={() => setIsRegisterMode(true)}
              >
                <UserPlus size={15} />
                <span>注册新账号</span>
              </button>
            </div>

            {/* Mode Title & Subtext */}
            <div className="cloud-auth-header-info">
              <div className="cloud-auth-header-title">
                <Cloud size={18} color="var(--accent-cyan)" />
                <span>{isRegisterMode ? '在小主机上注册新账号' : '连接 J1900 私有云'}</span>
              </div>
              <div className="cloud-auth-header-sub">
                {isRegisterMode
                  ? '注册后将自动在您的小主机建立专属健身体系并开启多端双向漫游同步。'
                  : '请输入小主机地址与登录凭证，开启离线优先、私密无羁绊的云端漫游。'}
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleAuthSubmit} className="cloud-auth-form">
              {/* Field 1: Server URL */}
              <div className="cloud-auth-field">
                <div className="cloud-auth-field-label">
                  <span className="cloud-auth-field-label-left">
                    <Globe size={14} color="var(--accent-cyan)" />
                    <span>小主机服务器地址 (Tailscale / 局域网)</span>
                  </span>
                  {pingResult?.success && (
                    <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 600 }}>
                      ✓ 延迟 {pingResult.latencyMs}ms
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <div className="cloud-auth-input-wrapper cyan" style={{ flex: 1 }}>
                    <span className="cloud-auth-input-icon">
                      <Server size={15} />
                    </span>
                    <input
                      type="text"
                      className="cloud-auth-input"
                      placeholder="如 http://100.64.0.10:3001"
                      value={serverUrl}
                      onChange={(e) => handleServerUrlChange(e.target.value)}
                      onFocus={handleInputFocus}
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      required
                    />
                  </div>

                  <button
                    type="button"
                    className={`cloud-auth-ping-btn ${pingResult?.success ? 'success' : ''}`}
                    onClick={handleTestPing}
                    disabled={isTestingPing}
                    title="探测小主机网络连通性及延迟"
                  >
                    {isTestingPing ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : pingResult?.success ? (
                      <Check size={14} />
                    ) : (
                      <Activity size={14} />
                    )}
                    <span>
                      {isTestingPing
                        ? '测试中'
                        : pingResult?.success
                        ? `${pingResult.latencyMs}ms`
                        : '测试连通'}
                    </span>
                  </button>
                </div>

                {/* Quick Helper Chips for Mobile */}
                <div className="cloud-url-quick-row">
                  {!/:\d+/.test(serverUrl) && (
                    <button
                      type="button"
                      className="cloud-url-chip"
                      onClick={handleAppendPort}
                      title="点击快速追加小主机默认端口 :3001"
                    >
                      <Zap size={11} color="var(--accent-cyan)" />
                      <span>快捷补全 :3001</span>
                    </button>
                  )}
                  {!/^https?:\/\//i.test(serverUrl.trim()) && (
                    <button
                      type="button"
                      className="cloud-url-chip"
                      onClick={handlePrependHttp}
                      title="点击快速补全 http:// 前缀"
                    >
                      <span>补全 http://</span>
                    </button>
                  )}
                  <span className="cloud-url-tip">
                    💡 提示：开启手机 Tailscale，可直接填小主机 100.x.y.z IP。
                  </span>
                </div>
              </div>

              {/* Field 2: Username */}
              <div className="cloud-auth-field">
                <div className="cloud-auth-field-label">
                  <span className="cloud-auth-field-label-left">
                    <User size={14} color="var(--accent-primary)" />
                    <span>用户名</span>
                  </span>
                </div>
                <div className="cloud-auth-input-wrapper">
                  <span className="cloud-auth-input-icon">
                    <User size={15} />
                  </span>
                  <input
                    type="text"
                    className="cloud-auth-input"
                    placeholder="请输入用户名"
                    value={username}
                    onChange={(e) => handleUsernameChange(e.target.value)}
                    onFocus={handleInputFocus}
                    autoComplete="username"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    required
                  />
                </div>
              </div>

              {/* Field 3: Password with Eye Toggle */}
              <div className="cloud-auth-field">
                <div className="cloud-auth-field-label">
                  <span className="cloud-auth-field-label-left">
                    <KeyRound size={14} color="var(--accent-primary)" />
                    <span>{isRegisterMode ? '设置密码 (至少4位)' : '登录密码'}</span>
                  </span>
                </div>
                <div className="cloud-auth-input-wrapper">
                  <span className="cloud-auth-input-icon">
                    <KeyRound size={15} />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="cloud-auth-input has-eye"
                    placeholder={isRegisterMode ? '请设置登录密码' : '请输入密码'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={handleInputFocus}
                    autoComplete={isRegisterMode ? 'new-password' : 'current-password'}
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    required
                  />
                  <button
                    type="button"
                    className="cloud-auth-eye-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    title={showPassword ? '隐藏密码' : '显示密码'}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="btn-primary cloud-auth-submit-btn"
                disabled={isSubmittingAuth}
              >
                {isSubmittingAuth ? (
                  <>
                    <RefreshCw size={18} className="animate-spin" />
                    <span>正在验证连接...</span>
                  </>
                ) : isRegisterMode ? (
                  <>
                    <UserPlus size={18} />
                    <span>注册并开启小主机同步</span>
                  </>
                ) : (
                  <>
                    <LogIn size={18} />
                    <span>登录并开启小主机同步</span>
                  </>
                )}
              </button>

              {/* Toggle Mode Link */}
              <button
                type="button"
                className="cloud-auth-switch-link"
                onClick={() => setIsRegisterMode(!isRegisterMode)}
              >
                {isRegisterMode
                  ? '已有小主机账号？点击直接登录'
                  : '小主机上首次使用？点击注册新账号'}
              </button>
            </form>
          </div>

          {/* Storage Architecture Overview (Placed BELOW the login form) */}
          <div
            style={{
              padding: '14px',
              borderRadius: '12px',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              marginBottom: '14px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.82rem',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                marginBottom: '8px',
              }}
            >
              <ShieldCheck size={16} color="var(--accent-primary)" />
              <span>双模架构：离线优先与私有云无缝共存</span>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px',
                fontSize: '0.74rem',
                color: 'var(--text-muted)',
                lineHeight: 1.4,
              }}
            >
              <div
                style={{
                  padding: '8px 10px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                }}
              >
                <div style={{ color: 'var(--accent-primary)', fontWeight: 600, marginBottom: '2px' }}>
                  ● 本地模式 (当前生效)
                </div>
                所有训练记录保存在手机本地 IndexedDB 中，断网秒开，私密安全。
              </div>

              <div
                style={{
                  padding: '8px 10px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(6, 182, 212, 0.08)',
                  border: '1px solid rgba(6, 182, 212, 0.2)',
                }}
              >
                <div style={{ color: 'var(--accent-cyan)', fontWeight: 600, marginBottom: '2px' }}>
                  ● J1900 私有云 (登录开启)
                </div>
                通过 Tailscale 建立隧道，训练保存时后台静默同步，支持跨设备漫游。
              </div>
            </div>
          </div>

          {/* Keyboard clearance spacer */}
          <div className="cloud-keyboard-spacer" />
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
