import type React from 'react';

type Color = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';

interface BadgeProps {
  color?: Color;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

const PALETTE: Record<Color, { background: string; color: string }> = {
  default: { background: '#e5e7eb', color: '#374151' },
  primary: { background: '#dbeafe', color: '#1e40af' },
  success: { background: '#dcfce7', color: '#15803d' },
  warning: { background: '#fef9c3', color: '#a16207' },
  danger:  { background: '#fee2e2', color: '#991b1b' },
  info:    { background: '#e0f2fe', color: '#075985' },
};

export function Badge({ color = 'default', children, style }: BadgeProps) {
  const palette = PALETTE[color];
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 9999,
        fontSize: '0.7rem',
        fontWeight: 700,
        background: palette.background,
        color: palette.color,
        ...style,
      }}
    >
      {children}
    </span>
  );
}
