import type React from 'react';

interface CardProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}

export function Card({ children, style, className }: CardProps) {
  return (
    <div
      className={className}
      style={{
        background: 'var(--color-surface)' as string,
        border: '1px solid var(--color-border)' as string,
        borderRadius: 'var(--radius-lg)' as string,
        padding: 16,
        boxShadow: 'var(--shadow-sm)' as string,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
