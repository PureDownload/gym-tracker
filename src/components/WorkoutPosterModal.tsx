import React, { useRef, useEffect, useState } from 'react';
import { X, Download, Share2, Trophy, Check } from 'lucide-react';
import type { WorkoutSession } from '../types/workout';

interface WorkoutPosterModalProps {
  workout: WorkoutSession;
  isOpen: boolean;
  onClose: () => void;
  prCount?: number;
}

export const WorkoutPosterModal: React.FC<WorkoutPosterModalProps> = ({
  workout,
  isOpen,
  onClose,
  prCount = 0,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // Compute summary stats
  const totalVolume = workout.exercises.reduce((sum, ex) => {
    return (
      sum +
      ex.sets.reduce((sSum, s) => {
        return s.isCompleted ? sSum + (s.weightKg || 0) * (s.reps || 0) : sSum;
      }, 0)
    );
  }, 0);

  const completedSetsCount = workout.exercises.reduce((sum, ex) => {
    return sum + ex.sets.filter((s) => s.isCompleted).length;
  }, 0);

  // Render high-res Canvas poster
  useEffect(() => {
    if (!isOpen) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Poster dimensions: 800 x 1200 (2:3 high-res vertical poster)
    const W = 800;
    const H = 1200;
    canvas.width = W;
    canvas.height = H;

    // 1. Background Gradient (Deep cyber / iron dark theme)
    const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, '#0d1117');
    bgGrad.addColorStop(0.4, '#161b22');
    bgGrad.addColorStop(1, '#0a0d12');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // Decorative ambient glow circles
    const glow1 = ctx.createRadialGradient(150, 150, 10, 150, 150, 300);
    glow1.addColorStop(0, 'rgba(59, 130, 246, 0.18)');
    glow1.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glow1;
    ctx.fillRect(0, 0, W, H);

    const glow2 = ctx.createRadialGradient(W - 150, 450, 10, W - 150, 450, 350);
    glow2.addColorStop(0, 'rgba(16, 185, 129, 0.15)');
    glow2.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glow2;
    ctx.fillRect(0, 0, W, H);

    // Top border accent line
    const topAccent = ctx.createLinearGradient(60, 0, W - 60, 0);
    topAccent.addColorStop(0, '#3b82f6');
    topAccent.addColorStop(0.5, '#10b981');
    topAccent.addColorStop(1, '#8b5cf6');
    ctx.fillStyle = topAccent;
    ctx.fillRect(60, 40, W - 120, 3);

    // 2. Header Brand
    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 16px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.letterSpacing = '3px';
    ctx.fillText('IRONTRACK · DAILY WORKOUT REPORT', 60, 80);

    // Date
    ctx.fillStyle = '#64748b';
    ctx.font = '400 15px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText(workout.date || new Date().toISOString().split('T')[0], W - 180, 80);

    // 3. Title & Duration Hero
    ctx.fillStyle = '#f8fafc';
    ctx.font = '800 38px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText(workout.title || '今日训练打卡', 60, 135);

    const durationText = workout.durationMinutes ? `⏱️ 训练用时 ${workout.durationMinutes} 分钟` : '🔥 力量拉满，状态极佳';
    ctx.fillStyle = '#38bdf8';
    ctx.font = '500 17px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText(durationText, 60, 172);

    // 4. Highlight Stats Card Banner
    const cardY = 210;
    const cardH = 135;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(60, cardY, W - 120, cardH, 16);
    ctx.fill();
    ctx.stroke();

    // 3 Stat Columns inside Card
    const colW = (W - 120) / 3;

    // Col 1: Total Volume
    ctx.fillStyle = '#94a3b8';
    ctx.font = '500 14px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText('举铁总容量', 80, cardY + 40);
    ctx.fillStyle = '#f59e0b';
    ctx.font = '800 32px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText(`${totalVolume.toLocaleString()}`, 80, cardY + 85);
    ctx.fillStyle = '#64748b';
    ctx.font = '500 13px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText('KG', 80 + ctx.measureText(`${totalVolume.toLocaleString()}`).width + 6, cardY + 83);

    // Col 2: Sets Completed
    ctx.fillStyle = '#94a3b8';
    ctx.font = '500 14px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText('完成正式组', 60 + colW + 20, cardY + 40);
    ctx.fillStyle = '#10b981';
    ctx.font = '800 32px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText(`${completedSetsCount}`, 60 + colW + 20, cardY + 85);
    ctx.fillStyle = '#64748b';
    ctx.font = '500 13px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText('组', 60 + colW + 20 + ctx.measureText(`${completedSetsCount}`).width + 6, cardY + 83);

    // Col 3: PR Breakthrough
    ctx.fillStyle = '#94a3b8';
    ctx.font = '500 14px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText('新纪录突破 (PR)', 60 + colW * 2 + 20, cardY + 40);
    ctx.fillStyle = prCount > 0 ? '#38bdf8' : '#cbd5e1';
    ctx.font = '800 32px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText(prCount > 0 ? `+${prCount}` : '稳定', 60 + colW * 2 + 20, cardY + 85);
    if (prCount > 0) {
      ctx.fillStyle = '#f59e0b';
      ctx.fillText(' 🏆', 60 + colW * 2 + 20 + ctx.measureText(`+${prCount}`).width + 2, cardY + 85);
    }

    // 5. Exercise Breakdown Section
    ctx.fillStyle = '#f8fafc';
    ctx.font = '700 20px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText('训练动作明细', 60, 390);

    let startY = 425;
    const maxExercisesToShow = 6;
    const exercisesToShow = workout.exercises.slice(0, maxExercisesToShow);

    exercisesToShow.forEach((ex, idx) => {
      // Background row strip
      ctx.fillStyle = idx % 2 === 0 ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.04)';
      ctx.beginPath();
      ctx.roundRect(60, startY, W - 120, 68, 12);
      ctx.fill();

      // Number badge
      ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
      ctx.beginPath();
      ctx.roundRect(75, startY + 16, 32, 32, 8);
      ctx.fill();
      ctx.fillStyle = '#60a5fa';
      ctx.font = '700 15px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillText(`${idx + 1}`, 87, startY + 38);

      // Exercise Name
      ctx.fillStyle = '#f1f5f9';
      ctx.font = '600 18px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillText(ex.exerciseName, 120, startY + 33);

      // Category Tag
      ctx.fillStyle = '#94a3b8';
      ctx.font = '400 13px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillText(`${ex.sets.filter((s) => s.isCompleted).length} 组完成`, 120, startY + 54);

      // Top Set / Best performance
      const topSet = ex.sets.reduce((max, s) => {
        return (s.weightKg || 0) > (max?.weightKg || 0) ? s : max;
      }, ex.sets[0]);

      if (ex.isCardio) {
        const totalMin = ex.sets.reduce((s, c) => s + (c.durationMinutes || 0), 0);
        const totalKm = ex.sets.reduce((s, c) => s + (c.distanceKm || 0), 0);
        ctx.fillStyle = '#10b981';
        ctx.font = '700 16px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.fillText(`${totalMin} min · ${totalKm.toFixed(1)} km`, W - 240, startY + 40);
      } else if (topSet) {
        ctx.fillStyle = '#f59e0b';
        ctx.font = '700 18px -apple-system, BlinkMacSystemFont, sans-serif';
        const setSpec = `最高 ${topSet.weightKg} kg × ${topSet.reps} 次`;
        const textW = ctx.measureText(setSpec).width;
        ctx.fillText(setSpec, W - 80 - textW, startY + 41);
      }

      startY += 78;
    });

    if (workout.exercises.length > maxExercisesToShow) {
      ctx.fillStyle = '#64748b';
      ctx.font = '500 14px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillText(
        `... 以及其他 ${workout.exercises.length - maxExercisesToShow} 个动作训练`,
        60,
        startY + 15
      );
      startY += 30;
    }

    // 6. Motivational Footer Box
    const quoteY = 960;
    ctx.fillStyle = 'rgba(59, 130, 246, 0.07)';
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.2)';
    ctx.beginPath();
    ctx.roundRect(60, quoteY, W - 120, 110, 14);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'italic 500 17px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText('“ 肌肉是自律最忠诚的勋章，每一滴汗水都在重塑自我。 ”', 90, quoteY + 45);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '400 14px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText('持之以恒，见证蜕变 · IronTrack Gym Tracker', 90, quoteY + 75);

    // 7. Footer Watermark & Barcode
    ctx.fillStyle = '#475569';
    ctx.font = '600 12px monospace';
    ctx.fillText('POWERED BY IRONTRACK · PURE STRENGTH EXPERIENCE', 60, 1140);
    ctx.fillText(`#ID-${workout.id.slice(-8).toUpperCase()}`, W - 180, 1140);

    // Generate blob URL for download
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        setDownloadUrl(url);
      }
    }, 'image/png');
  }, [isOpen, workout, prCount, totalVolume, completedSetsCount]);

  if (!isOpen) return null;

  const handleDownload = () => {
    if (!downloadUrl) return;
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `IronTrack-战报-${workout.date || '今日'}.png`;
    a.click();
  };

  const handleCopyImage = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      canvas.toBlob(async (blob) => {
        if (blob && (navigator.clipboard as any)?.write) {
          await (navigator.clipboard as any).write([
            new ClipboardItem({ 'image/png': blob }),
          ]);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } else {
          handleDownload();
        }
      });
    } catch (e) {
      handleDownload();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <div
        className="modal-content poster-modal-content"
        style={{ maxWidth: '460px', maxHeight: '92vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Trophy size={20} color="#f59e0b" />
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>
              训练战报打卡海报
            </h3>
          </div>
          <button className="icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div
          className="modal-body smooth-scroll"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '12px',
            overflowY: 'auto',
            overscrollBehavior: 'contain',
            WebkitOverflowScrolling: 'touch',
            minHeight: 0,
            flex: 1,
          }}
        >
          {/* Canvas Preview Container */}
          <div
            style={{
              width: '100%',
              borderRadius: '12px',
              overflow: 'hidden',
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.5)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <canvas
              ref={canvasRef}
              style={{
                width: '100%',
                height: 'auto',
                display: 'block',
              }}
            />
          </div>
        </div>

        <div
          className="modal-footer"
          style={{ display: 'flex', gap: '8px', padding: '12px 16px' }}
        >
          <button
            className="btn-secondary"
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            onClick={handleCopyImage}
          >
            {copied ? <Check size={16} color="#10b981" /> : <Share2 size={16} />}
            <span>{copied ? '已复制海报' : '复制图片'}</span>
          </button>

          <button
            className="btn-primary"
            style={{ flex: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            onClick={handleDownload}
          >
            <Download size={16} />
            <span>保存海报至相册</span>
          </button>
        </div>
      </div>
    </div>
  );
};
