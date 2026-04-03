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

export const btnStyle: React.CSSProperties = {
  padding: '8px 18px',
  background: '#0f766e',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: '0.9rem',
};

export const btnSecondaryStyle: React.CSSProperties = {
  padding: '8px 18px',
  background: '#6b7280',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: '0.9rem',
};

export const btnSmallStyle: React.CSSProperties = {
  padding: '4px 10px',
  background: '#0f766e',
  color: '#fff',
  border: 'none',
  borderRadius: 4,
  cursor: 'pointer',
  fontWeight: 500,
  fontSize: '0.78rem',
};

export const btnDangerStyle: React.CSSProperties = {
  padding: '4px 10px',
  background: '#dc2626',
  color: '#fff',
  border: 'none',
  borderRadius: 4,
  cursor: 'pointer',
  fontWeight: 500,
  fontSize: '0.78rem',
};

export const errorStyle: React.CSSProperties = {
  background: '#fef2f2',
  border: '1px solid #fecaca',
  borderRadius: 6,
  padding: '10px 14px',
  color: '#dc2626',
  marginBottom: 12,
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
};

export const demoBannerStyle: React.CSSProperties = {
  background: '#f0fdfa',
  border: '1px solid #99f6e4',
  borderRadius: 6,
  padding: '8px 12px',
  color: '#0f766e',
  fontSize: '0.82rem',
  marginBottom: 16,
};

export const STATUS_BG: Record<string, string> = {
  idle: '#f3f4f6',
  running: '#eff6ff',
  paused: '#fefce8',
  completed: '#f0fdf4',
  failed: '#fef2f2',
};

export const STATUS_BORDER: Record<string, string> = {
  idle: '#d1d5db',
  running: '#bfdbfe',
  paused: '#fde68a',
  completed: '#86efac',
  failed: '#fecaca',
};

export const TASK_STATUS_BG: Record<string, string> = {
  pending: '#f3f4f6',
  running: '#eff6ff',
  success: '#f0fdf4',
  failure: '#fef2f2',
  skipped: '#fefce8',
};

export const VERDICT_BG: Record<string, string> = {
  pass: '#f0fdf4',
  fail: '#fef2f2',
  warning: '#fefce8',
};

export const VERDICT_BORDER: Record<string, string> = {
  pass: '#86efac',
  fail: '#fecaca',
  warning: '#fde68a',
};
