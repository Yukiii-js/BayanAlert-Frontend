import {
  AlertTriangle,
  Bell,
  ClipboardCheck,
  Megaphone,
  ShieldAlert,
} from 'lucide-react';

const PRESENTATIONS = {
  advisory: {
    label: 'Regional advisory',
    Icon: AlertTriangle,
    iconClass: 'bg-orange-500/15 text-orange-300 ring-orange-400/20',
    badgeClass: 'border-orange-400/20 bg-orange-500/10 text-orange-200',
    accentClass: 'border-l-orange-400',
    unreadClass: 'bg-orange-500/[0.07]',
  },
  announcement: {
    label: 'Announcement',
    Icon: Megaphone,
    iconClass: 'bg-sky-500/15 text-sky-300 ring-sky-400/20',
    badgeClass: 'border-sky-400/20 bg-sky-500/10 text-sky-200',
    accentClass: 'border-l-sky-400',
    unreadClass: 'bg-sky-500/[0.07]',
  },
  moderation: {
    label: 'Account notice',
    Icon: ShieldAlert,
    iconClass: 'bg-rose-500/15 text-rose-300 ring-rose-400/20',
    badgeClass: 'border-rose-400/20 bg-rose-500/10 text-rose-200',
    accentClass: 'border-l-rose-400',
    unreadClass: 'bg-rose-500/[0.07]',
  },
  report: {
    label: 'Report update',
    Icon: ClipboardCheck,
    iconClass: 'bg-emerald-500/15 text-emerald-300 ring-emerald-400/20',
    badgeClass: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-200',
    accentClass: 'border-l-emerald-400',
    unreadClass: 'bg-emerald-500/[0.07]',
  },
  system: {
    label: 'System update',
    Icon: Bell,
    iconClass: 'bg-violet-500/15 text-violet-300 ring-violet-400/20',
    badgeClass: 'border-violet-400/20 bg-violet-500/10 text-violet-200',
    accentClass: 'border-l-violet-400',
    unreadClass: 'bg-violet-500/[0.07]',
  },
};

export function getNotificationPresentation(notification = {}) {
  const type = String(notification.notification_type || '').toLowerCase();
  const targetType = String(notification.target_type || '').toLowerCase();

  if (type === 'external_hazard' || targetType === 'advisory') return PRESENTATIONS.advisory;
  if (type === 'announcement') return PRESENTATIONS.announcement;
  if (type === 'moderation') return PRESENTATIONS.moderation;
  if (type === 'report_status' || targetType === 'report' || notification.report_id) {
    return PRESENTATIONS.report;
  }
  return PRESENTATIONS.system;
}
