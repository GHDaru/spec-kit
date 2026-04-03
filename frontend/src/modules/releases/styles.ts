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
  background: '#7c3aed',
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
  background: '#7c3aed',
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
  background: '#f5f3ff',
  border: '1px solid #c4b5fd',
  borderRadius: 6,
  padding: '8px 12px',
  color: '#5b21b6',
  fontSize: '0.82rem',
  marginBottom: 16,
};

export const STATUS_BG: Record<string, string> = {
  draft: '#f3f4f6',
  published: '#f0fdf4',
  yanked: '#fef2f2',
};

export const STATUS_BORDER: Record<string, string> = {
  draft: '#d1d5db',
  published: '#86efac',
  yanked: '#fecaca',
};

export const CHANGE_TYPE_BG: Record<string, string> = {
  breaking: '#fef2f2',
  feat: '#eff6ff',
  fix: '#f0fdf4',
  refactor: '#fefce8',
  docs: '#f5f3ff',
  test: '#f0fdfa',
  chore: '#f9fafb',
};

export const CHANGE_TYPE_COLOR: Record<string, string> = {
  breaking: '#dc2626',
  feat: '#2563eb',
  fix: '#059669',
  refactor: '#ca8a04',
  docs: '#7c3aed',
  test: '#0d9488',
  chore: '#6b7280',
};
