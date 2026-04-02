import type React from 'react';

export const inputStyle: React.CSSProperties = {
  flex: 1,
  padding: '8px 12px',
  border: '1px solid #d1d5db',
  borderRadius: 6,
  fontSize: '0.95rem',
  outline: 'none',
  boxSizing: 'border-box',
};

export const textareaStyle: React.CSSProperties = {
  ...({
    flex: 1,
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: 6,
    fontSize: '0.95rem',
    outline: 'none',
    boxSizing: 'border-box',
    resize: 'vertical',
    fontFamily: 'inherit',
  } as React.CSSProperties),
};

export const btnStyle: React.CSSProperties = {
  padding: '8px 18px',
  background: '#2563eb',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: '0.9rem',
};

export const btnDangerStyle: React.CSSProperties = {
  ...({
    padding: '8px 18px',
    background: '#dc2626',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '0.9rem',
  } as React.CSSProperties),
};

export const btnGhostStyle: React.CSSProperties = {
  padding: '6px 14px',
  background: '#f3f4f6',
  color: '#374151',
  border: '1px dashed #d1d5db',
  borderRadius: 6,
  cursor: 'pointer',
  fontWeight: 500,
  fontSize: '0.85rem',
};

export const errorStyle: React.CSSProperties = {
  background: '#fef2f2',
  border: '1px solid #fecaca',
  borderRadius: 6,
  padding: '10px 14px',
  color: '#dc2626',
  marginBottom: 12,
};

export const successStyle: React.CSSProperties = {
  background: '#f0fdf4',
  border: '1px solid #86efac',
  borderRadius: 8,
  padding: '12px 16px',
  color: '#15803d',
  marginTop: 16,
};

export const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.8rem',
  fontWeight: 600,
  color: '#374151',
  marginBottom: 4,
};

export const cardStyle: React.CSSProperties = {
  border: '1px solid #e5e7eb',
  borderRadius: 8,
  padding: 14,
  marginBottom: 10,
  background: '#f9fafb',
  position: 'relative',
};

export const PRIORITY_COLOR: Record<string, string> = {
  P1: '#dc2626',
  P2: '#d97706',
  P3: '#16a34a',
};
