import type React from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const BASE: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  fontWeight: 600,
  border: 'none',
  borderRadius: 'var(--radius-md)' as unknown as number,
  cursor: 'pointer',
  transition: 'background 0.12s, opacity 0.12s',
  fontFamily: 'inherit',
  lineHeight: 1,
  whiteSpace: 'nowrap',
};

const VARIANTS: Record<Variant, React.CSSProperties> = {
  primary: {
    background: 'var(--color-primary)' as string,
    color: '#fff',
  },
  secondary: {
    background: 'var(--color-background)' as string,
    color: 'var(--color-text)' as string,
    border: '1px solid var(--color-border)' as string,
  },
  danger: {
    background: 'var(--color-danger)' as string,
    color: '#fff',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--color-primary)' as string,
    border: '1px dashed var(--color-border)' as string,
  },
};

const SIZES: Record<Size, React.CSSProperties> = {
  sm: { padding: '5px 12px', fontSize: '0.8rem' },
  md: { padding: '8px 18px', fontSize: '0.9rem' },
  lg: { padding: '11px 24px', fontSize: '1rem' },
};

export function Button({
  variant = 'primary',
  size = 'md',
  style,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      style={{ ...BASE, ...VARIANTS[variant], ...SIZES[size], ...style }}
      {...rest}
    >
      {children}
    </button>
  );
}
