import type React from 'react';

// Re-use the same base style tokens as other modules
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
  color: '#115e59',
  fontSize: '0.82rem',
  marginBottom: 16,
};

export const PHASE_COLOR: Record<string, string> = {
  setup: '#6366f1',
  foundational: '#8b5cf6',
  us1: '#0284c7',
  us2: '#0891b2',
  us3: '#0d9488',
  polish: '#16a34a',
};
