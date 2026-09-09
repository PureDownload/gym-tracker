import React, { useRef, useState } from 'react';
import { Download, Upload, RotateCcw, Trash2, X, CheckCircle, AlertCircle } from 'lucide-react';
import { storageService } from '../services/storage';

interface DataBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataChanged: () => void;
}

export const DataBackupModal: React.FC<DataBackupModalProps> = ({
  isOpen,
  onClose,
  onDataChanged,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">本地数据与备份管理</h3>
          <button className="icon-btn" style={{ width: '30px', height: '30px' }} onClick={onClose}>
            <X size={16} />
          </button>
        </div>

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
              backgroundColor: feedbackMsg.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              border: `1px solid ${feedbackMsg.type === 'success' ? 'var(--accent-primary)' : 'var(--accent-danger)'}`,
              color: feedbackMsg.type === 'success' ? 'var(--accent-primary)' : 'var(--accent-danger)',
            }}
          >
            {feedbackMsg.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            {feedbackMsg.text}
          </div>
        )}

        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.5 }}>
          IronTrack 是一个纯前端运行的独立应用，数据完全保存在您的设备本地（IndexedDB + LocalStorage）。为了防止浏览器清除缓存，建议定期导出备份。
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Export Button */}
          <button className="btn-secondary" onClick={handleExport} style={{ justifyContent: 'flex-start' }}>
            <Download size={18} color="var(--accent-cyan)" />
            <span>导出全部数据 (JSON 文件下载)</span>
          </button>

          {/* Import Button */}
          <button
            className="btn-secondary"
            onClick={() => fileInputRef.current?.click()}
            style={{ justifyContent: 'flex-start' }}
          >
            <Upload size={18} color="var(--accent-primary)" />
            <span>导入备份文件 (恢复之前备份的 JSON)</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />

          {/* Reset Demo Data Button */}
          <button className="btn-secondary" onClick={handleResetSample} style={{ justifyContent: 'flex-start' }}>
            <RotateCcw size={18} color="var(--accent-warning)" />
            <span>载入示例数据 (体验连续进阶图表)</span>
          </button>

          {/* Clear All Data Button */}
          <button
            className="btn-secondary"
            onClick={handleClearAll}
            style={{ justifyContent: 'flex-start', color: 'var(--accent-danger)' }}
          >
            <Trash2 size={18} />
            <span>清空所有本地数据</span>
          </button>
        </div>
      </div>
    </div>
  );
};
