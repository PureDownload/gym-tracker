import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subValue?: string;
  icon: React.ReactNode;
  iconBg?: string;
  glowColor?: string;
  trendText?: string;
  trendPositive?: boolean;
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subValue,
  icon,
  iconBg = 'linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(6, 182, 212, 0.2))',
  glowColor = 'rgba(34, 197, 94, 0.15)',
  trendText,
  trendPositive = true,
  onClick,
}) => {
  return (
    <div
      className="card-elevated"
      onClick={onClick}
      style={{
        padding: '22px 24px',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      {/* Decorative ambient background blur */}
      <div
        style={{
          position: 'absolute',
          top: '-20px',
          right: '-20px',
          width: '100px',
          height: '100px',
          borderRadius: '50%',
          background: glowColor,
          filter: 'blur(30px)',
          pointerEvents: 'none',
        }}
      />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>
          {title}
        </span>
        <div
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: iconBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          {icon}
        </div>
      </div>

      <div>
        <div
          style={{
            fontSize: '32px',
            fontWeight: 800,
            fontFamily: 'var(--font-display)',
            color: '#fff',
            letterSpacing: '-0.5px',
            lineHeight: 1.1,
          }}
        >
          {value}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', minHeight: '20px' }}>
          {trendText && (
            <span
              style={{
                fontSize: '11.5px',
                fontWeight: 700,
                color: trendPositive ? '#22c55e' : '#f59e0b',
                background: trendPositive ? 'rgba(34, 197, 94, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                padding: '2px 7px',
                borderRadius: '4px',
              }}
            >
              {trendText}
            </span>
          )}
          {subValue && (
            <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
              {subValue}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
