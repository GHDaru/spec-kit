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
  flex: 1,
  padding: '8px 12px',
  border: '1px solid #d1d5db',
  borderRadius: 6,
  fontSize: '0.95rem',
  outline: 'none',
  boxSizing: 'border-box',
  resize: 'vertical',
  fontFamily: 'inherit',
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

export const demoBannerStyle: React.CSSProperties = {
  background: '#fefce8',
  border: '1px solid #fde68a',
  borderRadius: 6,
  padding: '8px 12px',
  color: '#92400e',
  fontSize: '0.82rem',
  marginBottom: 16,
};

export const CATEGORY_COLOR: Record<string, string> = {
  language: '#2563eb',
  framework: '#7c3aed',
  database: '#059669',
  infrastructure: '#d97706',
  testing: '#dc2626',
};

export const CATEGORY_ICON: Record<string, string> = {
  language: '🖥️',
  framework: '⚙️',
  database: '🗄️',
  infrastructure: '🏗️',
  testing: '🧪',
};

export const RECOMMENDATION_COLOR: Record<string, string> = {
  recommended: '#15803d',
  alternative: '#d97706',
  avoid: '#dc2626',
};

export const RECOMMENDATION_ICON: Record<string, string> = {
  recommended: '✅',
  alternative: '⚠️',
  avoid: '❌',
};

export const METHOD_COLOR: Record<string, string> = {
  GET: '#2563eb',
  POST: '#059669',
  PUT: '#d97706',
  PATCH: '#7c3aed',
  DELETE: '#dc2626',
};
