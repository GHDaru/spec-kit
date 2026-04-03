import type React from 'react';

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export function Input({ style, ...rest }: InputProps) {
  return (
    <input
      style={{
        padding: '8px 12px',
        border: '1px solid var(--color-border)' as string,
        borderRadius: 'var(--radius-md)' as unknown as number,
        fontSize: '0.95rem',
        outline: 'none',
        width: '100%',
        fontFamily: 'inherit',
        color: 'var(--color-text)' as string,
        background: 'var(--color-surface)' as string,
        ...style,
      }}
      {...rest}
    />
  );
}
