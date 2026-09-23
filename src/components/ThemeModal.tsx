import React, { useState, useEffect } from 'react';
import { X, Palette, Sun, Moon, Check, Sparkles, Monitor } from 'lucide-react';
import { PRESET_THEMES, type ThemeId, type ThemeState } from '../types/theme';
import { themeService } from '../services/themeService';

interface ThemeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type FilterCategory = 'all' | 'dark' | 'light';

export const ThemeModal: React.FC<ThemeModalProps> = ({ isOpen, onClose }) => {
  const [themeState, setThemeState] = useState<ThemeState>(themeService.getState());
  const [filterCategory, setFilterCategory] = useState<FilterCategory>('all');

  useEffect(() => {
    // 订阅主题状态
    const unsubscribe = themeService.subscribe(setThemeState);
    return () => unsubscribe();
  }, []);

  if (!isOpen) return null;

  const handleToggleAutoMode = () => {
    if (themeState.mode === 'auto') {
      themeService.setMode('manual');
    } else {
      themeService.setMode('auto');
    }
  };

  const handleSelectTheme = (themeId: ThemeId) => {
    themeService.setTheme(themeId);
  };

  const filteredThemes = PRESET_THEMES.filter((t) => {
    if (filterCategory === 'dark') return t.isDark;
    if (filterCategory === 'light') return !t.isDark;
    return true;
  });

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 110 }}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '600px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <div
          className="modal-header"
          style={{ paddingBottom: '12px', borderBottom: '1px solid var(--border-subtle)' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '10px',
                background: 'var(--brand-icon-gradient)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--primary-text)',
                boxShadow: '0 0 12px var(--accent-primary-glow)',
              }}
            >
              <Palette size={19} />
            </div>
            <div>
              <h3 className="modal-title" style={{ fontSize: '1.1rem' }}>
                个性化皮肤方案
              </h3>
              <div style={{ fontSize: '0.73rem', color: 'var(--accent-primary)', fontWeight: 600 }}>
                7 套精雕细琢高质感配色 · 即刻实时呈现
              </div>
            </div>
          </div>

          <button
            className="icon-btn"
            style={{ width: '32px', height: '32px' }}
            onClick={onClose}
            title="关闭弹窗"
          >
            <X size={17} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body" style={{ marginTop: '14px' }}>
          <div className="theme-modal-container">
            {/* 1. 跟随系统颜色卡片 */}
            <div className="theme-system-box">
              <div className="theme-system-info">
                <div className="theme-system-title">
                  <Monitor size={17} style={{ color: 'var(--accent-cyan)' }} />
                  <span>跟随系统颜色</span>
                  <span className="theme-system-badge">
                    {themeState.systemColorScheme === 'dark' ? (
                      <>
                        <Moon size={11} /> 当前系统偏好: 深色
                      </>
                    ) : (
                      <>
                        <Sun size={11} /> 当前系统偏好: 浅色
                      </>
                    )}
                  </span>
                </div>
                <div className="theme-system-desc">
                  <span>根据系统深浅色偏好自动切换</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                    {themeState.systemColorScheme === 'dark' ? '「暗夜极客」' : '「纯净晨曦」'}
                  </span>
                </div>
              </div>

              {/* Toggle switch */}
              <div
                className={`theme-switch ${themeState.mode === 'auto' ? 'active' : ''}`}
                onClick={handleToggleAutoMode}
                title={themeState.mode === 'auto' ? '点击切换为自主选择模式' : '点击开启跟随系统'}
              >
                <div className="theme-switch-knob" />
              </div>
            </div>

            {/* 2. 分类标签栏 */}
            <div className="theme-filter-tabs">
              <div
                className={`theme-filter-tab ${filterCategory === 'all' ? 'active' : ''}`}
                onClick={() => setFilterCategory('all')}
              >
                全部皮肤 ({PRESET_THEMES.length})
              </div>
              <div
                className={`theme-filter-tab ${filterCategory === 'dark' ? 'active' : ''}`}
                onClick={() => setFilterCategory('dark')}
              >
                🌙 深色系 (4)
              </div>
              <div
                className={`theme-filter-tab ${filterCategory === 'light' ? 'active' : ''}`}
                onClick={() => setFilterCategory('light')}
              >
                ☀️ 浅色系 (3)
              </div>
            </div>

            {/* 3. 皮肤主题卡片列表 */}
            <div className="theme-grid">
              {filteredThemes.map((theme) => {
                const isActive = themeState.themeId === theme.id;
                return (
                  <div
                    key={theme.id}
                    className={`theme-card ${isActive ? 'active' : ''}`}
                    onClick={() => handleSelectTheme(theme.id)}
                  >
                    {/* Active Checkmark Pill */}
                    {isActive && (
                      <div className="theme-card-active-pill">
                        <Check size={11} strokeWidth={3} />
                        <span>{themeState.mode === 'auto' ? '系统匹配' : '已选用'}</span>
                      </div>
                    )}

                    {/* Card Header */}
                    <div className="theme-card-header">
                      <div className="theme-card-title-group">
                        <span className="theme-card-name">{theme.name}</span>
                        <span className="theme-card-en">{theme.enName}</span>
                      </div>
                      <span className="theme-card-mode-badge">
                        {theme.isDark ? <Moon size={11} /> : <Sun size={11} />}
                        <span>{theme.isDark ? '深色' : '浅色'}</span>
                      </span>
                    </div>

                    {/* Palette Swatch Preview */}
                    <div className="theme-palette-preview">
                      <div
                        className="theme-swatch-circle"
                        style={{ backgroundColor: theme.colors.bg }}
                        title={`背景色: ${theme.colors.bg}`}
                      />
                      <div
                        className="theme-swatch-circle"
                        style={{ backgroundColor: theme.colors.card }}
                        title={`卡片底色: ${theme.colors.card}`}
                      />
                      <div
                        className="theme-preview-gradient"
                        style={{ background: theme.previewGradient }}
                        title="核心强调渐变"
                      />
                      <div
                        className="theme-swatch-circle"
                        style={{ backgroundColor: theme.colors.accent }}
                        title={`强调点缀色: ${theme.colors.accent}`}
                      />
                      <div
                        className="theme-swatch-circle"
                        style={{ backgroundColor: theme.colors.text }}
                        title={`主文本色: ${theme.colors.text}`}
                      />
                    </div>

                    {/* Description */}
                    <div className="theme-card-desc">{theme.description}</div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Tip */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.72rem',
                color: 'var(--text-muted)',
                padding: '6px 4px',
                justifyContent: 'center',
              }}
            >
              <Sparkles size={13} style={{ color: 'var(--accent-primary)' }} />
              <span>所有皮肤设置均自动持久化保存，并在多端设备上无缝同步响应</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
