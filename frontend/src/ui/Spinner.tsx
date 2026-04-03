import type React from 'react';

type Size = 'sm' | 'md' | 'lg';

const SIZE_MAP: Record<Size, number> = { sm: 16, md: 24, lg: 36 };

interface SpinnerProps {
  size?: Size;
  color?: string;
  style?: React.CSSProperties;
}

export function Spinner({ size = 'md', color = 'var(--color-primary)', style }: SpinnerProps) {
  const px = SIZE_MAP[size];
  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 24 24"
      fill="none"
      aria-label="Loading"
      role="status"
      style={{
        animation: 'sf-spin 0.7s linear infinite',
        ...style,
      }}
    >
      <style>{`@keyframes sf-spin { to { transform: rotate(360deg); } }`}</style>
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke={color}
        strokeWidth="3"
        strokeDasharray="40 20"
        strokeLinecap="round"
        opacity="0.8"
      />
    </svg>
  );
}
