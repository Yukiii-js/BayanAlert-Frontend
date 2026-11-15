import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Bell, Check, Loader2, X } from 'lucide-react';
import { api } from '../api/client';
import { getNotificationPresentation } from './notificationPresentation';

function isRead(notification) {
  return [1, '1', true].includes(notification.is_read);
}

function destination(role, notification) {
  const targetType = notification.target_type ||
    (notification.report_id ? 'report' : notification.notification_type === 'external_hazard' ? 'advisory' : '');

  if (targetType === 'report' && notification.report_id) {
    return role === 'admin'
      ? `/admin/tables/hazard_reports?report_id=${encodeURIComponent(notification.report_id)}`
      : `/resident/report-history?report_id=${encodeURIComponent(notification.report_id)}`;
  }

  if (targetType === 'advisory') {
    const advisoryId = notification.advisory_id
      ? `?advisory_id=${encodeURIComponent(notification.advisory_id)}`
      : '';
    return role === 'admin'
      ? `/admin${advisoryId}#regional-advisories`
      : `/resident${advisoryId}#regional-advisories`;
  }

  return role === 'admin' ? '/admin/notifications' : '/resident#alerts';
}

function formatDate(value) {
  if (!value) return 'Date unavailable';
  const date = new Date(String(value).replace(' ', 'T'));
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : date.toLocaleString();
}

export function NotificationDropdown({ role = 'resident' }) {
  const navigate = useNavigate();
  const root = useRef(null);
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');
  const unreadCount = useMemo(
    () => notifications.filter((notification) => !isRead(notification)).length,
    [notifications]
  );

  useEffect(() => {
    let active = true;
    async function loadNotifications() {
      try {
        const response = await api.getNotifications();
        const result = response?.data?.notifications;
        if (!Array.isArray(result)) throw new Error('The notifications response was invalid.');
        if (active) {
          setNotifications(result);
          setError('');
        }
      } catch (requestError) {
        if (active) setError(requestError.message || 'Unable to load notifications.');
      }
    }

    loadNotifications();
    const timer = window.setInterval(loadNotifications, 30000);
    const onUpdated = () => loadNotifications();
    window.addEventListener('notifications:updated', onUpdated);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener('notifications:updated', onUpdated);
    };
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    function handleOutsideClick(event) {
      if (!root.current?.contains(event.target)) setOpen(false);
    }
    function handleEscape(event) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  async function handleSelect(notification) {
    if (busyId !== null) return;
    setBusyId(notification.notification_id);
    setError('');
    try {
      if (!isRead(notification)) {
        await api.markNotificationRead(notification.notification_id);
        setNotifications((current) => current.map((item) => (
          String(item.notification_id) === String(notification.notification_id)
            ? { ...item, is_read: 1 }
            : item
        )));
        window.dispatchEvent(new Event('notifications:updated'));
      }
      setOpen(false);
      navigate(destination(role, notification));
    } catch (requestError) {
      setError(requestError.message || 'Unable to open this notification.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
        aria-expanded={open}
        onClick={() => {
          setOpen((current) => !current);
          setLoading(true);
          api.getNotifications().then((response) => {
            const result = response?.data?.notifications;
            if (!Array.isArray(result)) throw new Error('The notifications response was invalid.');
            setNotifications(result);
            setError('');
          }).catch((requestError) => {
            setError(requestError.message || 'Unable to load notifications.');
          }).finally(() => setLoading(false));
        }}
        className="relative inline-flex items-center gap-2 rounded-lg border border-slate-700 p-2 text-slate-300 transition hover:border-emerald-500/40 hover:bg-slate-800 hover:text-white"
      >
        <Bell className="h-4 w-4" />
        <span className="hidden text-xs font-semibold lg:inline">Notifications</span>
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-gradient-to-r from-orange-500 to-emerald-500 px-1 text-center text-[9px] font-bold leading-4 text-slate-950">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close notifications"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[90] bg-slate-950/60 sm:hidden"
          />
          <div className="fixed inset-x-4 top-16 z-[100] mx-auto flex max-h-[75vh] w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-xl border border-slate-700 bg-slate-950 shadow-2xl sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-2 sm:max-h-[min(75vh,34rem)] sm:w-96">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
            <div>
              <p className="text-sm font-bold text-white">Notifications</p>
              <p className="text-[10px] text-slate-400">{unreadCount} unread</p>
            </div>
            <button type="button" aria-label="Close notifications" onClick={() => setOpen(false)} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
          {error && (
            <p role="alert" className="flex items-start gap-2 border-b border-rose-500/20 bg-rose-500/10 px-4 py-2 text-[10px] text-rose-200">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {error}
            </p>
          )}
          {loading ? (
            <div role="status" className="flex items-center justify-center gap-2 p-8 text-xs text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading notifications...
            </div>
          ) : notifications.length ? (
            <div className="min-h-0 flex-1 divide-y divide-slate-800 overflow-y-auto">
              {notifications.slice(0, 12).map((notification) => (
                (() => {
                  const presentation = getNotificationPresentation(notification);
                  const Icon = presentation.Icon;
                  return (
                    <button
                      type="button"
                      key={notification.notification_id}
                      onClick={() => handleSelect(notification)}
                      disabled={busyId !== null}
                      className={`flex w-full cursor-pointer items-start gap-3 border-l-2 px-4 py-3 text-left transition hover:bg-slate-800/80 disabled:cursor-wait disabled:opacity-70 ${
                        isRead(notification) ? 'border-l-transparent' : `${presentation.accentClass} ${presentation.unreadClass}`
                      }`}
                    >
                      <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ${presentation.iconClass}`}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="flex min-w-0 flex-1 items-start justify-between gap-3">
                        <span className="min-w-0">
                          <span className="mb-1 flex items-center gap-1.5">
                            <span className={`inline-flex rounded-full border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide ${presentation.badgeClass}`}>
                              {presentation.label}
                            </span>
                            {!isRead(notification) && <span className="h-1.5 w-1.5 rounded-full bg-white/80" aria-label="Unread" />}
                          </span>
                          <span className="block truncate text-xs font-bold text-slate-100">{notification.title}</span>
                          <span className="mt-1 line-clamp-2 block text-[10px] leading-4 text-slate-400">{notification.message}</span>
                          <span className="mt-1.5 block text-[9px] text-slate-500">{formatDate(notification.created_at)}</span>
                        </span>
                        <span className="mt-0.5 shrink-0 text-slate-400">
                          {busyId === notification.notification_id && <Loader2 className="h-4 w-4 animate-spin" />}
                          {busyId !== notification.notification_id && !isRead(notification) && <Check className="h-4 w-4 text-emerald-300" />}
                        </span>
                      </span>
                    </button>
                  );
                })()
              ))}
            </div>
          ) : (
            <p className="p-8 text-center text-xs text-slate-400">No notifications yet.</p>
          )}
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              navigate(role === 'admin' ? '/admin/notifications' : '/resident#alerts');
            }}
            className="w-full border-t border-slate-800 px-4 py-2.5 text-center text-[10px] font-bold text-emerald-300 transition hover:bg-slate-900"
          >
            View all notifications
          </button>
          </div>
        </>
      )}
    </div>
  );
}
