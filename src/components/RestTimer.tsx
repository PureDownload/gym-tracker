import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, X, Bell } from 'lucide-react';

interface RestTimerProps {
  initialSeconds?: number;
  onClose?: () => void;
}

export const RestTimer: React.FC<RestTimerProps> = ({
  initialSeconds = 90,
  onClose,
}) => {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(true);
  const timerRef = useRef<any>(null);

  // Play beep sound using Web Audio API
  const playBeep = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);

      if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
      }
    } catch (e) {
      console.warn('Audio play error', e);
    }
  };

  useEffect(() => {
    if (isRunning && secondsLeft > 0) {
      timerRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            setIsRunning(false);
            playBeep();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }

    return () => clearInterval(timerRef.current);
  }, [isRunning, secondsLeft]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const setTimerPreset = (secs: number) => {
    setSecondsLeft(secs);
    setIsRunning(true);
  };

  return (
    <div className="rest-timer-bar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Bell size={18} color="var(--accent-primary)" />
        <div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>组间休息</div>
          <div className="timer-digits">{formatTime(secondsLeft)}</div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <button
          className="step-chip"
          onClick={() => setTimerPreset(60)}
          style={{ padding: '4px 6px', fontSize: '0.7rem' }}
        >
          60s
        </button>
        <button
          className="step-chip"
          onClick={() => setTimerPreset(90)}
          style={{ padding: '4px 6px', fontSize: '0.7rem' }}
        >
          90s
        </button>
        <button
          className="step-chip"
          onClick={() => setTimerPreset(120)}
          style={{ padding: '4px 6px', fontSize: '0.7rem' }}
        >
          120s
        </button>

        <button
          className="icon-btn"
          style={{ width: '32px', height: '32px' }}
          onClick={() => setIsRunning(!isRunning)}
          title={isRunning ? '暂停' : '继续'}
        >
          {isRunning ? <Pause size={15} /> : <Play size={15} />}
        </button>

        <button
          className="icon-btn"
          style={{ width: '32px', height: '32px' }}
          onClick={() => {
            setSecondsLeft(initialSeconds);
            setIsRunning(false);
          }}
          title="重置"
        >
          <RotateCcw size={15} />
        </button>

        {onClose && (
          <button
            className="icon-btn"
            style={{ width: '32px', height: '32px', marginLeft: '4px' }}
            onClick={onClose}
            title="关闭计时器"
          >
            <X size={15} />
          </button>
        )}
      </div>
    </div>
  );
};
