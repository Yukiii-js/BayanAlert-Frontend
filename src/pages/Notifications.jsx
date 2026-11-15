import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Bell,
  Check,
  Loader2,
  Megaphone,
  RefreshCw,
  Send,
} from 'lucide-react';
import { api } from '../api/client';

function formatDate(value) {
  if (!value) return 'Date unavailable';
  const date = new Date(String(value).replace(' ', 'T'));
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function isRead(notification) {
  return [1, '1', true].includes(notification.is_read);
}

export function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [markingId, setMarkingId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !isRead(notification)).length,
    [notifications]
  );

  async function loadNotifications(showLoader = true) {
    if (showLoader) setLoading(true);
    else setRefreshing(true);

    try {
      const response = await api.getNotifications();
      const result = response?.data?.notifications;
      if (!Array.isArray(result)) {
        throw new Error('The notifications response was invalid.');
      }
      setNotifications(result);
      setError('');
    } catch (requestError) {
      setError(requestError.message || 'Unable to load notifications.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadNotifications();
  }, []);

  async function handleAnnouncementSubmit(event) {
    event.preventDefault();
    setError('');
    setSuccess('');

    const cleanTitle = title.trim();
    const cleanMessage = message.trim();
    if (!cleanTitle || !cleanMessage) {
      setError('Enter both an announcement title and message.');
      return;
    }

    setSending(true);
    try {
      const response = await api.createAnnouncement({
        title: cleanTitle,
        message: cleanMessage,
      });
      setSuccess(response?.message || 'Announcement sent to residents.');
      setTitle('');
      setMessage('');
      await loadNotifications(false);
      window.dispatchEvent(new Event('notifications:updated'));
    } catch (requestError) {
      setError(requestError.message || 'Unable to send the announcement.');
    } finally {
      setSending(false);
    }
  }

  async function handleMarkRead(notification) {
    if (isRead(notification)) return;
    setMarkingId(notification.notification_id);
    setError('');
    try {
      await api.markNotificationRead(notification.notification_id);
      setNotifications((current) => current.map((item) => (
        item.notification_id === notification.notification_id
          ? { ...item, is_read: 1 }
          : item
      )));
      window.dispatchEvent(new Event('notifications:updated'));
    } catch (requestError) {
      setError(requestError.message || 'Unable to update this notification.');
    } finally {
      setMarkingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 border-b border-slate-800 pb-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-400">Admin communications</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-white">Notifications</h1>
          <p className="mt-2 text-sm text-slate-400">
            Review incoming report alerts and send announcements to active residents.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-300">
            {unreadCount} unread
          </span>
          <button
            type="button"
            onClick={() => loadNotifications()}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 hover:border-emerald-500/40 hover:text-white disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing || loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </header>

      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div role="status" className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-300">
          {success}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-300">
              <Megaphone className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-bold text-white">Create an announcement</h2>
              <p className="mt-1 text-xs text-slate-400">Sent as a notification to every active resident.</p>
            </div>
          </div>

          <form onSubmit={handleAnnouncementSubmit} className="space-y-4">
            <div>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <label htmlFor="announcement-title" className="text-xs font-semibold text-slate-300">Title</label>
                <span className="text-[10px] text-slate-500">{title.length}/200</span>
              </div>
              <input
                id="announcement-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={200}
                required
                placeholder="e.g. Community clean-up schedule"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-3 text-sm text-slate-100 placeholder:text-slate-600 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <label htmlFor="announcement-message" className="text-xs font-semibold text-slate-300">Message</label>
                <span className="text-[10px] text-slate-500">{message.length}/5000</span>
              </div>
              <textarea
                id="announcement-message"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                maxLength={5000}
                rows={7}
                required
                placeholder="Share the details residents need to know..."
                className="w-full resize-y rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-3 text-sm leading-6 text-slate-100 placeholder:text-slate-600 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div className="flex flex-col justify-between gap-3 border-t border-slate-800 pt-4 sm:flex-row sm:items-center">
              <p className="text-[11px] leading-5 text-slate-500">
                This sends immediately to active accounts with a resident role.
              </p>
              <button
                type="submit"
                disabled={sending}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {sending ? 'Sending...' : 'Send announcement'}
              </button>
            </div>
          </form>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 p-5">
            <div>
              <h2 className="flex items-center gap-2 font-bold text-white">
                <Bell className="h-4 w-4 text-emerald-400" />
                Admin inbox
              </h2>
              <p className="mt-1 text-xs text-slate-400">Report activity and system notifications.</p>
            </div>
            <span className="text-xs text-slate-500">{notifications.length} recent</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />
              Loading notifications...
            </div>
          ) : notifications.length ? (
            <div className="max-h-[720px] divide-y divide-slate-800 overflow-y-auto">
              {notifications.map((notification) => (
                <article
                  key={notification.notification_id}
                  className={`flex items-start gap-3 p-4 ${isRead(notification) ? '' : 'bg-emerald-500/[0.04]'}`}
                >
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-emerald-300">
                    {notification.notification_type === 'announcement'
                      ? <Megaphone className="h-4 w-4" />
                      : <Bell className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-white">{notification.title}</h3>
                      {!isRead(notification) && (
                        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-300">
                          New
                        </span>
                      )}
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-slate-400">{notification.message}</p>
                    <p className="mt-2 text-[10px] text-slate-500">{formatDate(notification.created_at)}</p>
                  </div>
                  {!isRead(notification) && (
                    <button
                      type="button"
                      onClick={() => handleMarkRead(notification)}
                      disabled={markingId === notification.notification_id}
                      aria-label="Mark notification as read"
                      title="Mark as read"
                      className="shrink-0 rounded-lg p-2 text-slate-400 hover:bg-emerald-500/10 hover:text-emerald-300 disabled:opacity-50"
                    >
                      {markingId === notification.notification_id
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <Check className="h-4 w-4" />}
                    </button>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <div className="px-5 py-14 text-center">
              <Bell className="mx-auto mb-3 h-7 w-7 text-slate-600" />
              <p className="text-sm font-semibold text-slate-300">No notifications yet</p>
              <p className="mt-1 text-xs text-slate-500">New resident reports will appear in this inbox.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
