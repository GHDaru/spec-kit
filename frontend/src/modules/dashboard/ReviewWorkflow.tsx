import { useState } from 'react';
import {
  listReviews,
  createReview,
  getDemoReviews,
  type ReviewThread,
  type ReviewListResponse,
  REVIEW_STATUS_COLOR,
  REVIEW_STATUS_ICON,
} from '../../api/dashboard';
import {
  btnStyle,
  btnSecondaryStyle,
  btnSmallStyle,
  cardStyle,
  demoBannerStyle,
  errorStyle,
  inputStyle,
  labelStyle,
  accentColor,
  accentLight,
  accentBorder,
} from './styles';

export function ReviewWorkflow() {
  const [projectId, setProjectId] = useState('');
  const [data, setData] = useState<ReviewListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [expandedThread, setExpandedThread] = useState<string | null>(null);

  // Create review form
  const [showForm, setShowForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newAuthor, setNewAuthor] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  async function handleLoad() {
    if (!projectId.trim()) return;
    setLoading(true);
    setError(null);
    setIsDemo(false);
    try {
      const result = await listReviews(projectId.trim());
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  function handleLoadDemo() {
    setData(getDemoReviews());
    setIsDemo(true);
    setError(null);
  }

  async function handleCreateReview() {
    if (!data || !newTitle.trim() || !newAuthor.trim()) return;
    setCreateLoading(true);
    try {
      const created = await createReview(data.project_id, {
        title: newTitle.trim(),
        author: newAuthor.trim(),
      });
      setData({ ...data, reviews: [created, ...data.reviews] });
      setNewTitle('');
      setNewAuthor('');
      setShowForm(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Create failed');
    } finally {
      setCreateLoading(false);
    }
  }

  function handleCreateDemoReview() {
    if (!data) return;
    const mock: ReviewThread = {
      thread_id: `rev-demo-${Date.now()}`,
      project_id: data.project_id,
      author: newAuthor.trim() || 'Demo User',
      title: newTitle.trim() || 'New review thread',
      status: 'open',
      created_at: new Date().toISOString(),
      comments: [],
    };
    setData({ ...data, reviews: [mock, ...data.reviews] });
    setNewTitle('');
    setNewAuthor('');
    setShowForm(false);
  }

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Review Workflow</h2>
      <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
        Manage review threads for a project. Expand a thread to read comments.
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input
          type="text"
          placeholder="Project ID (e.g. my-project)"
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleLoad()}
          style={{ ...inputStyle, flex: 1 }}
        />
        <button onClick={handleLoad} disabled={loading || !projectId.trim()} style={btnStyle}>
          {loading ? 'Loading…' : 'Load'}
        </button>
        <button onClick={handleLoadDemo} style={btnSecondaryStyle}>
          Load Demo
        </button>
      </div>

      {isDemo && (
        <div style={demoBannerStyle}>
          ⚠ Demo mode — showing sample reviews. Connect a backend project to use live data.
        </div>
      )}
      {error && <div style={errorStyle}>⚠ {error}</div>}

      {data && (
        <div>
          {/* Header */}
          <div
            style={{
              background: accentLight,
              border: `1px solid ${accentBorder}`,
              borderRadius: 8,
              padding: '10px 16px',
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <span style={{ fontWeight: 700, color: accentColor }}>
              Project: {data.project_id}
            </span>
            <span style={{ fontSize: '0.82rem', color: '#6b7280' }}>
              {data.reviews.length} thread{data.reviews.length !== 1 ? 's' : ''}
            </span>
            <button
              style={{ ...btnSmallStyle, marginLeft: 'auto' }}
              onClick={() => setShowForm((v) => !v)}
            >
              {showForm ? '✕ Cancel' : '+ Create Review'}
            </button>
          </div>

          {/* Create review form */}
          {showForm && (
            <div
              style={{
                ...cardStyle,
                background: accentLight,
                border: `1px solid ${accentBorder}`,
                marginBottom: 14,
              }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr auto',
                  gap: 8,
                  alignItems: 'end',
                }}
              >
                <div>
                  <label style={labelStyle}>Title</label>
                  <input
                    style={inputStyle}
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Review thread title"
                  />
                </div>
                <div>
                  <label style={labelStyle}>Author</label>
                  <input
                    style={inputStyle}
                    value={newAuthor}
                    onChange={(e) => setNewAuthor(e.target.value)}
                    placeholder="Your name"
                  />
                </div>
                <button
                  style={btnStyle}
                  onClick={isDemo ? handleCreateDemoReview : handleCreateReview}
                  disabled={createLoading || !newTitle.trim() || !newAuthor.trim()}
                >
                  {createLoading ? '…' : 'Create'}
                </button>
              </div>
            </div>
          )}

          {data.reviews.length === 0 && (
            <p style={{ color: '#9ca3af', fontStyle: 'italic' }}>No review threads yet.</p>
          )}

          {data.reviews.map((thread) => {
            const color = REVIEW_STATUS_COLOR[thread.status];
            const isOpen = expandedThread === thread.thread_id;
            return (
              <div
                key={thread.thread_id}
                style={{
                  border: `1px solid ${color}44`,
                  borderLeft: `4px solid ${color}`,
                  borderRadius: 6,
                  marginBottom: 8,
                  background: '#fff',
                  overflow: 'hidden',
                }}
              >
                {/* Thread header */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 14px',
                    cursor: 'pointer',
                  }}
                  onClick={() =>
                    setExpandedThread(isOpen ? null : thread.thread_id)
                  }
                >
                  <span style={{ fontSize: '1rem' }}>{REVIEW_STATUS_ICON[thread.status]}</span>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      background: color + '22',
                      color,
                      border: `1px solid ${color}44`,
                      borderRadius: 3,
                      padding: '1px 6px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                    }}
                  >
                    {thread.status}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#111827' }}>
                      {thread.title}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>
                      by {thread.author} · {thread.created_at.slice(0, 10)} ·{' '}
                      {thread.comments.length} comment{thread.comments.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <span style={{ fontSize: '0.85rem', color }}>{isOpen ? '▲' : '▼'}</span>
                </div>

                {/* Comments */}
                {isOpen && (
                  <div
                    style={{
                      padding: '0 14px 14px',
                      borderTop: `1px solid ${color}22`,
                    }}
                  >
                    {thread.comments.length === 0 && (
                      <p
                        style={{
                          color: '#9ca3af',
                          fontStyle: 'italic',
                          fontSize: '0.85rem',
                          marginTop: 10,
                        }}
                      >
                        No comments yet.
                      </p>
                    )}
                    {thread.comments.map((comment, idx) => (
                      <div
                        key={comment.comment_id}
                        style={{
                          marginTop: idx === 0 ? 12 : 8,
                          display: 'flex',
                          gap: 10,
                          alignItems: 'flex-start',
                        }}
                      >
                        <div
                          style={{
                            width: 30,
                            height: 30,
                            borderRadius: '50%',
                            background: accentColor,
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            flexShrink: 0,
                          }}
                        >
                          {comment.author
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>
                        <div
                          style={{
                            flex: 1,
                            background: '#f9fafb',
                            border: '1px solid #e5e7eb',
                            borderRadius: 6,
                            padding: '8px 10px',
                          }}
                        >
                          <div
                            style={{
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              color: '#374151',
                              marginBottom: 3,
                            }}
                          >
                            {comment.author}
                            <span
                              style={{
                                fontWeight: 400,
                                color: '#9ca3af',
                                marginLeft: 8,
                              }}
                            >
                              {comment.created_at.replace('T', ' ').slice(0, 16)} UTC
                            </span>
                          </div>
                          <p style={{ margin: 0, fontSize: '0.85rem', color: '#111827' }}>
                            {comment.body}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!data && !loading && !error && (
        <div style={{ color: '#9ca3af', fontStyle: 'italic', marginTop: 24 }}>
          Enter a project ID, or click "Load Demo" to see sample data.
        </div>
      )}
    </div>
  );
}
