import React, { useState } from 'react';
import { Zap, Lock, User, AlertCircle } from 'lucide-react';
import { api } from '../api';
import type { AuthUser } from '../types';

interface LoginModalProps {
  onLoginSuccess: (user: AuthUser) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.login(username.trim(), password);
      onLoginSuccess(res.user);
    } catch (err: any) {
      setError(err.message || '登录失败，请检查账号密码');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'radial-gradient(circle at 50% 30%, #151b28 0%, #080a0f 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      zIndex: 9999,
    }}>
      <div
        className="card-elevated"
        style={{
          width: '100%',
          maxWidth: '420px',
          padding: '36px 32px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          background: 'rgba(17, 22, 33, 0.88)',
          backdropFilter: 'blur(20px)',
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #22c55e, #06b6d4)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 24px rgba(34, 197, 94, 0.35)',
            marginBottom: '16px',
          }}>
            <Zap size={30} color="#052e16" strokeWidth={2.8} />
          </div>

          <h2 style={{
            fontSize: '22px',
            fontWeight: 800,
            fontFamily: 'var(--font-display)',
            color: '#fff',
            letterSpacing: '-0.3px',
          }}>
            IronTrack 铁脉管理后台
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-dim)', marginTop: '4px' }}>
            J1900 私有云多账号与全员训练数据控制台
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 14px',
            marginBottom: '18px',
            color: '#f87171',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>
              管理员账号
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                required
                autoFocus
                placeholder="输入管理员用户名"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input-text"
                style={{ width: '100%', paddingLeft: '38px' }}
              />
              <User size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-dim)' }} />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>
              登录密码
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                required
                placeholder="输入密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-text"
                style={{ width: '100%', paddingLeft: '38px' }}
              />
              <Lock size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-dim)' }} />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px', fontSize: '14.5px', marginTop: '10px' }}
          >
            {loading ? '正在验证身份...' : '登 录 控 制 台'}
          </button>
        </form>

        <div style={{
          marginTop: '22px',
          padding: '12px',
          borderRadius: '8px',
          background: 'rgba(255, 255, 255, 0.03)',
          fontSize: '11.5px',
          color: 'var(--text-dim)',
          lineHeight: '1.5',
          textAlign: 'center',
        }}>
          💡 提示：系统注册的首个用户会自动被提升为管理员。管理员账号同时支持直接在手机健身 App 中登录使用。
        </div>
      </div>
    </div>
  );
};
