import type React from 'react';

type Color = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';

interface BadgeProps {
  color?: Color;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

const PALETTE: Record<Color, { background: string; color: string }> = {
  default: { background: '#e5e7eb',                          color: '#374151' },
  primary: { background: 'var(--color-primary-light)',        color: 'var(--color-primary)' },
  success: { background: '#dcfce7',                          color: 'var(--color-success)' },
  warning: { background: '#fef9c3',                          color: 'var(--color-warning)' },
  danger:  { background: '#fee2e2',                          color: 'var(--color-danger)' },
  info:    { background: '#e0f2fe',                          color: 'var(--color-info)' },
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
