import React, { useRef, useState } from 'react';
import { Download, Upload, RotateCcw, Trash2, X, CheckCircle, AlertCircle } from 'lucide-react';
import { storageService } from '../services/storage';

interface DataBackupModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  onDataChanged: () => void;
  isSubPage?: boolean;
}

export const DataBackupModal: React.FC<DataBackupModalProps> = ({
  isOpen = true,
  onClose,
  onDataChanged,
  isSubPage = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isSubPage && !isOpen) return null;

  const showMsg = (type: 'success' | 'error', text: string) => {
    setFeedbackMsg({ type, text });
    setTimeout(() => setFeedbackMsg(null), 3500);
  };

  const handleExport = async () => {
    try {
      const jsonStr = await storageService.exportJSON();
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `IronTrack_Backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showMsg('success', '备份文件已成功导出并下载！');
    } catch (e: any) {
      showMsg('error', '导出失败: ' + e.message);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const res = await storageService.importJSON(text);
        if (res.success) {
          showMsg('success', `成功导入 ${res.count} 条训练记录！`);
          onDataChanged();
        } else {
          showMsg('error', res.error || '导入失败');
        }
      } catch (err: any) {
        showMsg('error', '读取文件失败: ' + err.message);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleResetSample = async () => {
    if (window.confirm('确定重置为演示示例数据吗？这会载入包含卧推、硬拉等多周力量进阶记录。')) {
      await storageService.resetToSampleData();
      showMsg('success', '已恢复演示示例数据！');
      onDataChanged();
    }
  };

  const handleClearAll = async () => {
    if (window.confirm('警告：确定清空所有本地训练记录和自定义动作吗？此操作无法撤销，建议先导出备份！')) {
      await storageService.clearAllData();
      showMsg('success', '所有本地数据已清空。');
      onDataChanged();
    }
  };

  const renderBody = () => (
    <>
      {feedbackMsg && (
        <div
          style={{
            padding: '10px 12px',
            borderRadius: '8px',
            marginBottom: '14px',
            fontSize: '0.84rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor:
              feedbackMsg.type === 'success'
                ? 'rgba(16, 185, 129, 0.15)'
                : 'rgba(239, 68, 68, 0.15)',
            border: `1px solid ${
              feedbackMsg.type === 'success' ? 'var(--accent-primary)' : 'var(--accent-danger)'
            }`,
            color:
              feedbackMsg.type === 'success' ? 'var(--accent-primary)' : 'var(--accent-danger)',
          }}
        >
          {feedbackMsg.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {feedbackMsg.text}
        </div>
      )}

      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '14px 16px',
          marginBottom: '16px',
          fontSize: '0.84rem',
          color: 'var(--text-secondary)',
          lineHeight: 1.6,
        }}
      >
        <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>
          💡 本地优先存储保护机制
        </strong>
        IronTrack 是纯端侧运行的独立应用，数据完全保存在设备本地（IndexedDB + LocalStorage）。在清理浏览器或重装系统前，强烈建议导出 JSON 离线备份文件。
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Export Button */}
        <button
          className="btn-secondary"
          onClick={handleExport}
          style={{
            justifyContent: 'flex-start',
            padding: '12px 14px',
            borderRadius: '10px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
          }}
        >
          <div
            style={{
              padding: '8px',
              borderRadius: '8px',
              background: 'rgba(56, 189, 248, 0.15)',
              marginRight: '6px',
            }}
          >
            <Download size={18} color="var(--accent-cyan)" />
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>导出全部数据 (JSON)</div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              包含所有训练记录、动作库、体测指标及分化模版
            </div>
          </div>
        </button>

        {/* Import Button */}
        <button
          className="btn-secondary"
          onClick={() => fileInputRef.current?.click()}
          style={{
            justifyContent: 'flex-start',
            padding: '12px 14px',
            borderRadius: '10px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
          }}
        >
          <div
            style={{
              padding: '8px',
              borderRadius: '8px',
              background: 'rgba(16, 185, 129, 0.15)',
              marginRight: '6px',
            }}
          >
            <Upload size={18} color="var(--accent-primary)" />
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>导入备份文件 (恢复 JSON)</div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              从先前导出的备份中恢复数据并自动合并
            </div>
          </div>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />

        {/* Reset Demo Data Button */}
        <button
          className="btn-secondary"
          onClick={handleResetSample}
          style={{
            justifyContent: 'flex-start',
            padding: '12px 14px',
            borderRadius: '10px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
          }}
        >
          <div
            style={{
              padding: '8px',
              borderRadius: '8px',
              background: 'rgba(245, 158, 11, 0.15)',
              marginRight: '6px',
            }}
          >
            <RotateCcw size={18} color="var(--accent-warning)" />
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>载入官方示例演示数据</div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              体验多周卧推深蹲超负荷进阶图表与模版
            </div>
          </div>
        </button>

        {/* Clear All Data Button */}
        <button
          className="btn-secondary"
          onClick={handleClearAll}
          style={{
            justifyContent: 'flex-start',
            padding: '12px 14px',
            borderRadius: '10px',
            background: 'rgba(239, 68, 68, 0.06)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: 'var(--accent-danger)',
            marginTop: '12px',
          }}
        >
          <div
            style={{
              padding: '8px',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.15)',
              marginRight: '6px',
            }}
          >
            <Trash2 size={18} color="var(--accent-danger)" />
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>危险区：清空所有本地数据</div>
            <div style={{ fontSize: '0.74rem', opacity: 0.8 }}>
              永久重置所有历史训练和设置（操作不可撤销）
            </div>
          </div>
        </button>
      </div>
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
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">本地数据与备份管理</h3>
          <button className="icon-btn" style={{ width: '30px', height: '30px' }} onClick={onClose}>
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
