import { useState } from 'react';
import { accentColor, accentLight, accentBorder } from './styles';

type NotifType = 'review' | 'phase' | 'quality' | 'mention' | 'system';

interface Notification {
  id: string;
  type: NotifType;
  icon: string;
  title: string;
  body: string;
  time: string;
  read: boolean;
}

const TYPE_COLOR: Record<NotifType, string> = {
  review: '#7c3aed',
  phase: '#2563eb',
  quality: '#dc2626',
  mention: '#059669',
  system: '#6b7280',
};

const INITIAL_NOTIFICATIONS: Notification[] = [
  {
    id: 'n-001',
    type: 'review',
    icon: '💬',
    title: 'New review comment on "Quality Guardian spec"',
    body: 'Carol Park commented: "The acceptance criteria for the checklist builder are missing edge cases."',
    time: '2 min ago',
    read: false,
  },
  {
    id: 'n-002',
    type: 'quality',
    icon: '🔴',
    title: 'Critical finding in analysis report',
    body: 'A critical finding was flagged: "Missing error handling spec for OAuth callback". Review required.',
    time: '18 min ago',
    read: false,
  },
  {
    id: 'n-003',
    type: 'phase',
    icon: '⚡',
    title: 'Specification Studio entered Implement phase',
    body: 'Feature "Specification Studio" has progressed to the Implement phase. Implementation session started.',
    time: '1 hour ago',
    read: false,
  },
  {
    id: 'n-004',
    type: 'mention',
    icon: '👋',
    title: 'You were mentioned in a review thread',
    body: 'Alice Chen mentioned you in "Architecture plan: database indexing strategy". Click to view.',
    time: '3 hours ago',
    read: true,
  },
  {
    id: 'n-005',
    type: 'review',
    icon: '✅',
    title: 'Review thread resolved',
    body: 'Bob Santos marked "Architecture plan: database indexing strategy" as resolved.',
    time: '4 hours ago',
    read: true,
  },
  {
    id: 'n-006',
    type: 'phase',
    icon: '✅',
    title: 'Constitution Engine is Done',
    body: 'Feature "Constitution Engine" has completed all six SDD phases.',
    time: '1 day ago',
    read: true,
  },
  {
    id: 'n-007',
    type: 'system',
    icon: 'ℹ️',
    title: 'SpecForge updated to v0.7.0',
    body: 'Module 7 (Quality Guardian) and Module 8 (Project Dashboard) are now available.',
    time: '2 days ago',
    read: true,
  },
];

type FilterTab = 'all' | 'unread';

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>(INITIAL_NOTIFICATIONS);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  const unreadCount = notifications.filter((n) => !n.read).length;
  const filtered =
    activeTab === 'unread' ? notifications.filter((n) => !n.read) : notifications;

  function toggleRead(id: string) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: !n.read } : n))
    );
  }

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Notification Center</h2>
      <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
        Stay up to date with project activity. Click a notification to toggle its read state.
        This panel uses demo data.
      </p>

      {/* Tab bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          borderBottom: '2px solid #e5e7eb',
          marginBottom: 16,
        }}
      >
        {(['all', 'unread'] as FilterTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '8px 16px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontWeight: activeTab === tab ? 700 : 400,
              color: activeTab === tab ? accentColor : '#6b7280',
              borderBottom: `2px solid ${activeTab === tab ? accentColor : 'transparent'}`,
              fontSize: '0.88rem',
              marginBottom: -2,
            }}
          >
            {tab === 'all' ? 'All' : 'Unread'}
            {tab === 'unread' && unreadCount > 0 && (
              <span
                style={{
                  marginLeft: 6,
                  background: '#dc2626',
                  color: '#fff',
                  borderRadius: 10,
                  padding: '1px 7px',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                }}
              >
                {unreadCount}
              </span>
            )}
          </button>
        ))}
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            style={{
              marginLeft: 'auto',
              padding: '4px 12px',
              border: `1px solid ${accentBorder}`,
              borderRadius: 4,
              background: accentLight,
              color: accentColor,
              cursor: 'pointer',
              fontSize: '0.78rem',
              fontWeight: 600,
            }}
          >
            Mark all read
          </button>
        )}
      </div>

      {filtered.length === 0 && (
        <p style={{ color: '#9ca3af', fontStyle: 'italic' }}>
          {activeTab === 'unread' ? 'No unread notifications. 🎉' : 'No notifications.'}
        </p>
      )}

      {filtered.map((notif) => {
        const typeColor = TYPE_COLOR[notif.type];
        return (
          <div
            key={notif.id}
            onClick={() => toggleRead(notif.id)}
            style={{
              display: 'flex',
              gap: 12,
              padding: '12px 14px',
              background: notif.read ? '#fff' : accentLight,
              border: `1px solid ${notif.read ? '#e5e7eb' : accentBorder}`,
              borderLeft: `4px solid ${notif.read ? '#d1d5db' : typeColor}`,
              borderRadius: 6,
              marginBottom: 8,
              cursor: 'pointer',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = notif.read
                ? '#f9fafb'
                : '#f0ebff';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = notif.read
                ? '#fff'
                : accentLight;
            }}
          >
            {/* Icon */}
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: typeColor + '18',
                border: `1px solid ${typeColor}44`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1rem',
                flexShrink: 0,
              }}
            >
              {notif.icon}
            </div>

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontWeight: notif.read ? 500 : 700,
                  fontSize: '0.88rem',
                  color: '#111827',
                  marginBottom: 2,
                }}
              >
                {notif.title}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#6b7280', lineHeight: 1.4 }}>
                {notif.body}
              </div>
            </div>

            {/* Meta */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                gap: 4,
                flexShrink: 0,
              }}
            >
              <span style={{ fontSize: '0.72rem', color: '#9ca3af', whiteSpace: 'nowrap' }}>
                {notif.time}
              </span>
              {!notif.read && (
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: typeColor,
                  }}
                />
              )}
            </div>
          </div>
        );
      })}

      <div style={{ marginTop: 16, fontSize: '0.72rem', color: '#9ca3af', textAlign: 'center' }}>
        Click any notification to toggle its read state · Demo data
      </div>
    </div>
  );
}
