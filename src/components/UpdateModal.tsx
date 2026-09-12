import React, { useState } from 'react';
import {
  Sparkles,
  Download,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  X,
  HardDrive,
  Calendar,
  Tag,
  Zap,
} from 'lucide-react';
import type { UpdateCheckResult } from '../types/update';
import { updateService, DOWNLOAD_MIRRORS } from '../services/updateService';

interface UpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  updateData: UpdateCheckResult | null;
  isChecking: boolean;
  onRefreshCheck: () => Promise<void>;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({
  isOpen,
  onClose,
  updateData,
  isChecking,
  onRefreshCheck,
}) => {
  const [selectedMirrorId, setSelectedMirrorId] = useState<string>('ghproxy');
  const [isDownloading, setIsDownloading] = useState<boolean>(false);

  if (!isOpen) return null;

  const currentVersion = updateService.getCurrentVersion();
  const hasUpdate = updateData?.hasUpdate;
  const isError = Boolean(updateData?.error);
  const selectedMirror =
    DOWNLOAD_MIRRORS.find((m) => m.id === selectedMirrorId) || DOWNLOAD_MIRRORS[0];

  // 计算最终下载直链
  const rawDownloadUrl = updateData?.downloadUrl || '';
  const finalDownloadUrl = rawDownloadUrl ? selectedMirror.transform(rawDownloadUrl) : '';

  const handleDownload = () => {
    if (!finalDownloadUrl) return;
    setIsDownloading(true);

    try {
      // 触发外部浏览器或系统下载器打开
      const a = document.createElement('a');
      a.href = finalDownloadUrl;
      a.download = updateData?.assetName || 'IronTrack.apk';
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      window.open(finalDownloadUrl, '_blank');
    }

    setTimeout(() => setIsDownloading(false), 3000);
  };

  const handleIgnoreVersion = () => {
    if (updateData?.latestVersion) {
      updateService.ignoreVersion(updateData.latestVersion);
    }
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 120 }}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* Modal Header */}
        <div
          className="modal-header"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: '14px',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: hasUpdate
                  ? 'linear-gradient(135deg, #10b981, #06b6d4)'
                  : 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: hasUpdate ? '#090d16' : 'var(--text-secondary)',
                boxShadow: hasUpdate ? '0 0 15px rgba(16, 185, 129, 0.4)' : 'none',
              }}
            >
              <Sparkles size={20} />
            </div>
            <div>
              <h3 className="modal-title" style={{ fontSize: '1.08rem', margin: 0 }}>
                应用版本与更新
              </h3>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                GitHub Actions 自动化发布系统
              </div>
            </div>
          </div>

          <button
            className="icon-btn"
            style={{ width: '32px', height: '32px' }}
            onClick={onClose}
            aria-label="关闭"
          >
            <X size={16} />
          </button>
        </div>

        {/* Version Compare Banner */}
        <div
          style={{
            margin: '16px 0 12px 0',
            padding: '12px 14px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>当前版本</div>
            <div
              style={{
                fontSize: '0.96rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              v{currentVersion}
            </div>
          </div>

          <div
            style={{
              padding: '4px 10px',
              borderRadius: '20px',
              fontSize: '0.75rem',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: hasUpdate
                ? 'rgba(16, 185, 129, 0.15)'
                : 'rgba(255, 255, 255, 0.06)',
              color: hasUpdate ? 'var(--accent-primary)' : 'var(--text-secondary)',
              border: `1px solid ${hasUpdate ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-subtle)'}`,
            }}
          >
            {hasUpdate ? (
              <>
                <Zap size={13} /> 发现新版本 {updateData?.latestVersion}
              </>
            ) : isChecking ? (
              <>
                <RefreshCw size={13} className="spin-slow" /> 正在检测...
              </>
            ) : (
              <>
                <CheckCircle2 size={13} style={{ color: 'var(--accent-primary)' }} /> 已是最新版本
              </>
            )}
          </div>
        </div>

        {/* Content Body: Checking / Error / HasUpdate / UpToDate */}
        <div style={{ minHeight: '120px', display: 'flex', flexDirection: 'column' }}>
          {isChecking ? (
            <div
              style={{
                padding: '40px 20px',
                textAlign: 'center',
                color: 'var(--text-secondary)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <RefreshCw size={28} className="spin-slow" style={{ color: 'var(--accent-cyan)' }} />
              <div style={{ fontSize: '0.88rem' }}>正在连接 GitHub API 检索最新 Release...</div>
            </div>
          ) : isError ? (
            <div
              style={{
                padding: '18px 14px',
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                borderRadius: '10px',
                color: 'var(--accent-danger)',
                fontSize: '0.84rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                margin: '8px 0',
              }}
            >
              <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <div style={{ fontWeight: 600 }}>检查更新遇到问题</div>
                <div style={{ fontSize: '0.78rem', marginTop: '4px', opacity: 0.9 }}>
                  {updateData?.error}
                </div>
              </div>
            </div>
          ) : hasUpdate && updateData ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Release Metadata Card */}
              <div
                style={{
                  background: 'var(--bg-input)',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  fontSize: '0.78rem',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '16px',
                  color: 'var(--text-secondary)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Tag size={14} style={{ color: 'var(--accent-cyan)' }} />
                  <span>{updateData.releaseName || updateData.latestVersion}</span>
                </div>
                {updateData.publishedAt && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Calendar size={14} />
                    <span>{updateService.formatDate(updateData.publishedAt)}</span>
                  </div>
                )}
                {updateData.assetSize > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <HardDrive size={14} />
                    <span>{updateService.formatBytes(updateData.assetSize)}</span>
                  </div>
                )}
              </div>

              {/* Release Notes */}
              <div>
                <div
                  style={{
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    marginBottom: '6px',
                  }}
                >
                  更新内容详情：
                </div>
                <div
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '10px',
                    padding: '12px 14px',
                    fontSize: '0.82rem',
                    lineHeight: '1.5',
                    color: 'var(--text-secondary)',
                    maxHeight: '150px',
                    overflowY: 'auto',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {updateData.releaseNotes}
                </div>
              </div>

              {/* Download Mirror Channel Selector */}
              <div>
                <div
                  style={{
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    marginBottom: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>下载加速通道选择：</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--accent-primary)' }}>
                    国内环境推荐镜像
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {DOWNLOAD_MIRRORS.map((m) => {
                    const isSelected = m.id === selectedMirrorId;
                    return (
                      <div
                        key={m.id}
                        onClick={() => setSelectedMirrorId(m.id)}
                        style={{
                          padding: '8px 12px',
                          borderRadius: '8px',
                          background: isSelected
                            ? 'rgba(16, 185, 129, 0.1)'
                            : 'var(--bg-input)',
                          border: `1px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontSize: '0.82rem',
                              fontWeight: 600,
                              color: isSelected ? 'var(--accent-primary)' : 'var(--text-primary)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                            }}
                          >
                            {m.name}
                            {m.recommended && (
                              <span
                                style={{
                                  fontSize: '0.66rem',
                                  padding: '1px 5px',
                                  borderRadius: '4px',
                                  background: 'var(--accent-primary)',
                                  color: '#090d16',
                                  fontWeight: 700,
                                }}
                              >
                                推荐
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            {m.desc}
                          </div>
                        </div>

                        <div
                          style={{
                            width: '16px',
                            height: '16px',
                            borderRadius: '50%',
                            border: `2px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border-medium)'}`,
                            background: isSelected ? 'var(--accent-primary)' : 'transparent',
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* Up-to-date State */
            <div
              style={{
                padding: '24px 16px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: 'var(--accent-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CheckCircle2 size={24} />
              </div>
              <div
                style={{
                  fontSize: '0.94rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                }}
              >
                当前已是最新版本
              </div>
              <div
                style={{
                  fontSize: '0.78rem',
                  color: 'var(--text-secondary)',
                  maxWidth: '320px',
                  lineHeight: '1.4',
                }}
              >
                您当前使用的是 IronTrack 铁脉健身最新发布版本。所有科学渐进超负荷、离线数据持久化与动作库均为最新特性。
              </div>
            </div>
          )}
        </div>

        {/* Modal Actions Footer */}
        <div
          style={{
            marginTop: '18px',
            paddingTop: '14px',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          {hasUpdate ? (
            <>
              <button
                className="btn btn-primary"
                onClick={handleDownload}
                disabled={isDownloading || !finalDownloadUrl}
                style={{
                  width: '100%',
                  padding: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  fontSize: '0.92rem',
                  fontWeight: 700,
                }}
              >
                <Download size={18} />
                {isDownloading ? '正在调起下载...' : '立即下载更新 APK'}
              </button>

              <div style={{ display: 'flex', gap: '8px' }}>
                <a
                  href={updateData?.htmlUrl || 'https://github.com/PureDownload/gym-tracker/releases'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn"
                  style={{
                    flex: 1,
                    padding: '8px',
                    fontSize: '0.78rem',
                    background: 'var(--bg-input)',
                    color: 'var(--text-secondary)',
                    textAlign: 'center',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    borderRadius: '8px',
                  }}
                >
                  <ExternalLink size={13} />
                  在 GitHub 查看
                </a>

                <button
                  type="button"
                  onClick={handleIgnoreVersion}
                  className="btn"
                  style={{
                    flex: 1,
                    padding: '8px',
                    fontSize: '0.78rem',
                    background: 'var(--bg-input)',
                    color: 'var(--text-muted)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                  }}
                >
                  跳过此版本
                </button>
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="btn btn-primary"
                onClick={() => onRefreshCheck()}
                disabled={isChecking}
                style={{
                  flex: 1,
                  padding: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  fontSize: '0.84rem',
                }}
              >
                <RefreshCw size={15} className={isChecking ? 'spin-slow' : ''} />
                {isChecking ? '检查中...' : '再次检测更新'}
              </button>

              <a
                href="https://github.com/PureDownload/gym-tracker/releases"
                target="_blank"
                rel="noopener noreferrer"
                className="btn"
                style={{
                  padding: '10px 14px',
                  fontSize: '0.84rem',
                  background: 'var(--bg-input)',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  borderRadius: '8px',
                  textDecoration: 'none',
                }}
              >
                <ExternalLink size={14} />
                Releases 列表
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
