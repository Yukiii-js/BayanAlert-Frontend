import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertCircle,
  Bell,
  CheckCircle2,
  Clock3,
  FileWarning,
  Loader2,
  LogOut,
  MapPin,
  PlusCircle,
  RefreshCw,
  ShieldAlert,
  User,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { HazardMap } from '../components/HazardMap';

const EMPTY_DASHBOARD = {
  reports: [],
  status_counts: [],
  category_counts: [],
  barangay_counts: [],
  alerts: [],
};

function formatStatus(status) {
  return String(status || 'unknown')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value) {
  if (!value) return 'Date unavailable';
  const date = new Date(String(value).replace(' ', 'T'));
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function statusStyles(status) {
  const styles = {
    pending: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
    verified: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    assigned: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
    in_progress: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300',
    resolved: 'border-teal-500/30 bg-teal-500/10 text-teal-300',
    rejected: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
    duplicate: 'border-slate-600 bg-slate-800 text-slate-300',
  };
  return styles[String(status || '').toLowerCase()] || styles.duplicate;
}

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${statusStyles(status)}`}
    >
      {formatStatus(status)}
    </span>
  );
}

export function ResidentDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(EMPTY_DASHBOARD);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [activeSection, setActiveSection] = useState('dashboard');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  async function loadDashboard(showLoader = true) {
    if (showLoader) setLoading(true);
    else setRefreshing(true);

    try {
      const response = await api.getCommunityDashboard();
      const result = response?.data;
      if (!result || !Array.isArray(result.reports)) {
        throw new Error('The community dashboard returned an invalid data response.');
      }
      setDashboard({
        reports: result.reports,
        status_counts: result.status_counts || [],
        category_counts: result.category_counts || [],
        barangay_counts: result.barangay_counts || [],
        alerts: result.alerts || [],
      });
      setError('');
      setHasLoaded(true);
      setLastUpdated(new Date());
    } catch (requestError) {
      setError(requestError.message || 'Unable to load current community data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadDashboard();
    const timer = window.setInterval(() => loadDashboard(false), 60000);
    return () => window.clearInterval(timer);
  }, []);

  const categories = useMemo(
    () => dashboard.category_counts.filter((category) => Number(category.total) > 0),
    [dashboard.category_counts]
  );

  const statuses = useMemo(
    () => dashboard.status_counts.filter((status) => Number(status.total) > 0),
    [dashboard.status_counts]
  );

  const filteredReports = useMemo(
    () => dashboard.reports.filter((report) => (
      (statusFilter === 'all' || report.status === statusFilter) &&
      (categoryFilter === 'all' || String(report.category_id) === categoryFilter)
    )),
    [dashboard.reports, statusFilter, categoryFilter]
  );

  const reportCount = dashboard.status_counts.reduce(
    (total, item) => total + Number(item.total || 0),
    0
  );
  const statusCount = (name) => Number(
    dashboard.status_counts.find((item) => item.status === name)?.total || 0
  );
  const openReports = ['pending', 'verified', 'assigned', 'in_progress']
    .reduce((total, status) => total + statusCount(status), 0);
  const unreadAlerts = dashboard.alerts.filter(
    (alert) => ![1, '1', true].includes(alert.is_read)
  ).length;

  function scrollToSection(sectionId) {
    setActiveSection(sectionId);
    document.getElementById(sectionId)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }

  async function handleLogout() {
    await logout();
    navigate('/resident-login', { replace: true });
  }

  const navItems = [
    { label: 'Dashboard', id: 'dashboard', icon: Activity },
    { label: 'Incident Feed', id: 'incident-feed', icon: FileWarning },
    { label: 'Alerts', id: 'alerts', icon: Bell },
  ];

  if (loading && !hasLoaded) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-950 text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
        <p className="text-sm">Loading live community data...</p>
      </div>
    );
  }

  if (error && !hasLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-100">
        <div className="w-full max-w-lg rounded-2xl border border-rose-500/20 bg-slate-900 p-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-6 w-6 text-rose-400" />
            <h1 className="text-lg font-bold">Community data unavailable</h1>
          </div>
          <p className="mt-3 text-sm text-slate-400">{error}</p>
          <button
            type="button"
            onClick={() => loadDashboard()}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/95 shadow-lg shadow-black/20 backdrop-blur">
        <div className="mx-auto flex min-h-[64px] max-w-[1500px] items-center justify-between gap-3 px-4 lg:px-7">
          <Link to="/resident" className="flex shrink-0 items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-white shadow-lg shadow-emerald-900/30">
              <ShieldAlert className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-sm font-extrabold">BayanAlert</span>
              <span className="block text-[9px] font-semibold uppercase tracking-wider text-emerald-400">
                Community safety
              </span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map(({ label, id, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => scrollToSection(id)}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                  activeSection === id
                    ? 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
            <Link
              to="/resident/submitted-reports"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-slate-400 transition hover:bg-slate-800 hover:text-white"
            >
              <PlusCircle className="h-4 w-4" />
              Submit Report
            </Link>
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <span className="hidden items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-[10px] sm:flex">
              <User className="h-3.5 w-3.5 text-emerald-400" />
              {user?.full_name || 'Resident'}
            </span>
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-2 text-[10px] font-semibold text-slate-300 transition hover:border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-300"
            >
              <LogOut className="h-3.5 w-3.5" />
              Logout
            </button>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto border-t border-slate-800 px-3 py-2 md:hidden">
          {navItems.map(({ label, id, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => scrollToSection(id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-[10px] font-semibold ${
                activeSection === id ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:bg-slate-800'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
          <Link
            to="/resident/submitted-reports"
            className="flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-[10px] font-semibold text-slate-400 hover:bg-slate-800"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            Submit
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-[1500px] space-y-6 p-4 lg:p-7">
        {error && hasLoaded && (
          <div role="status" className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-200">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Refresh failed. Showing the last successful database snapshot: {error}</span>
          </div>
        )}

        <section id="dashboard" className="scroll-mt-28 space-y-5">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400">
                Resident Portal
              </p>
              <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                Community overview
              </h1>
              <p className="mt-2 text-xs text-slate-400">
                Current hazard reports and alerts from the BayanAlert database.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-slate-500">
                {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : 'Live data'}
              </span>
              <button
                type="button"
                onClick={() => loadDashboard()}
                disabled={refreshing}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-xs font-semibold text-slate-300 transition hover:border-emerald-500/40 hover:text-white disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { label: 'Total reports', value: reportCount, icon: FileWarning, color: 'text-emerald-400' },
              { label: 'Open reports', value: openReports, icon: Activity, color: 'text-amber-300' },
              { label: 'Verified', value: statusCount('verified'), icon: CheckCircle2, color: 'text-teal-300' },
              { label: 'My alerts', value: unreadAlerts, icon: Bell, color: 'text-sky-300' },
            ].map(({ label, value, icon: Icon, color }) => (
              <article key={label} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-lg shadow-black/10">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</span>
                  <Icon className={`h-4 w-4 ${color}`} />
                </div>
                <p className="mt-3 text-2xl font-extrabold text-white">{value.toLocaleString()}</p>
                <p className="mt-1 text-[10px] text-slate-500">From saved database records</p>
              </article>
            ))}
          </div>

          <HazardMap height="h-[420px]" />

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 xl:col-span-2">
              <div className="border-b border-slate-800 p-5">
                <h2 className="flex items-center gap-2 text-sm font-bold text-white">
                  <MapPin className="h-4 w-4 text-emerald-400" />
                  Reports by resident barangay
                </h2>
                <p className="mt-1 text-[10px] text-slate-500">
                  Counts are based on the reporter’s registered barangay. Exact incident addresses are not shown here.
                </p>
              </div>
              {dashboard.barangay_counts.length ? (
                <div className="grid gap-3 p-5 sm:grid-cols-2">
                  {dashboard.barangay_counts.map((barangay) => {
                    const count = Number(barangay.total || 0);
                    const maxCount = Math.max(...dashboard.barangay_counts.map((item) => Number(item.total || 0)), 1);
                    return (
                      <div key={barangay.barangay_id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <span className="truncate text-xs font-semibold text-slate-200">{barangay.barangay_name}</span>
                          <span className="rounded-md bg-emerald-500/10 px-2 py-1 text-xs font-bold text-emerald-300">{count}</span>
                        </div>
                        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-800">
                          <div className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-teal-400" style={{ width: `${(count / maxCount) * 100}%` }} />
                        </div>
                        <p className="mt-2 text-[9px] text-slate-500">Database-linked report count</p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="p-8 text-center text-xs text-slate-500">No reports are associated with a barangay yet.</p>
              )}
            </section>

            <aside className="space-y-4">
              <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/70 to-slate-900 p-5">
                <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-300">
                  <ShieldAlert className="h-5 w-5" />
                </span>
                <h2 className="text-sm font-bold text-white">Encountered an emergency?</h2>
                <p className="mt-2 text-xs leading-5 text-slate-400">
                  Submit a hazard report to share verified details with the response team.
                </p>
                <Link
                  to="/resident/submitted-reports"
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-500"
                >
                  <PlusCircle className="h-4 w-4" />
                  Submit a report
                </Link>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
                <h2 className="mb-4 flex items-center gap-2 text-xs font-bold text-white">
                  <Activity className="h-4 w-4 text-emerald-400" />
                  Report status breakdown
                </h2>
                {statuses.length ? (
                  <div className="space-y-3">
                    {statuses.map((item) => (
                      <div key={item.status} className="flex items-center justify-between gap-3">
                        <span className="text-xs text-slate-400">{formatStatus(item.status)}</span>
                        <span className="font-mono text-xs font-semibold text-slate-200">{Number(item.total).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">There are no saved report records.</p>
                )}
              </div>
            </aside>
          </div>
        </section>

        <section id="incident-feed" className="scroll-mt-28 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-lg shadow-black/10 sm:p-6">
          <div className="flex flex-col justify-between gap-4 border-b border-slate-800 pb-4 sm:flex-row sm:items-end">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-extrabold text-white">
                <FileWarning className="h-5 w-5 text-emerald-400" />
                Community incident feed
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                Actual hazard reports saved in the database. Personal details and exact addresses are excluded.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                aria-label="Filter reports by status"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 outline-none focus:border-emerald-500"
              >
                <option value="all">All statuses</option>
                {statuses.map((item) => (
                  <option key={item.status} value={item.status}>{formatStatus(item.status)}</option>
                ))}
              </select>
              <select
                aria-label="Filter reports by category"
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 outline-none focus:border-emerald-500"
              >
                <option value="all">All categories</option>
                {categories.map((category) => (
                  <option key={category.category_id} value={String(category.category_id)}>{category.category_name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-3 pt-4">
            {filteredReports.map((report) => (
              <article key={report.report_id} className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 transition hover:border-emerald-500/30">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-bold text-white">{report.title}</h3>
                      <StatusBadge status={report.status} />
                    </div>
                    <p className="mt-2 text-xs leading-5 text-slate-400">{report.description}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] text-slate-500">
                      <span className="flex items-center gap-1.5">
                        <MapPin className="h-3 w-3 text-emerald-400" />
                        {report.barangay_name || 'Barangay not specified'}
                      </span>
                      <span>{report.category_name || 'Uncategorized'}</span>
                      <span className="font-mono">{report.reference_number}</span>
                    </div>
                  </div>
                  <span className="flex shrink-0 items-center gap-1.5 text-[10px] text-slate-500">
                    <Clock3 className="h-3.5 w-3.5" />
                    {formatDate(report.submitted_at)}
                  </span>
                </div>
              </article>
            ))}

            {!filteredReports.length && (
              <div className="py-12 text-center">
                <FileWarning className="mx-auto mb-3 h-8 w-8 text-slate-600" />
                <p className="text-sm font-semibold text-slate-300">
                  {dashboard.reports.length ? 'No reports match these filters.' : 'No incident reports in the database yet.'}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {dashboard.reports.length ? 'Try another status or category.' : 'New resident submissions will appear here.'}
                </p>
              </div>
            )}
          </div>
          {dashboard.reports.length >= 100 && (
            <p className="mt-4 border-t border-slate-800 pt-3 text-center text-[10px] text-slate-500">
              Showing the 100 most recent reports.
            </p>
          )}
        </section>

        <section id="alerts" className="scroll-mt-28 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-lg shadow-black/10 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-extrabold text-white">
                <Bell className="h-5 w-5 text-emerald-400" />
                My community alerts
              </h2>
              <p className="mt-1 text-xs text-slate-400">Notifications saved for your account.</p>
            </div>
            <span className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-[10px] font-semibold text-slate-400">
              {dashboard.alerts.length} total
            </span>
          </div>

          {dashboard.alerts.length ? (
            <div className="space-y-3">
              {dashboard.alerts.map((alert) => (
                <article key={alert.notification_id} className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-300">
                    <Bell className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-xs font-bold text-white">{alert.title}</h3>
                      {![1, '1', true].includes(alert.is_read) && (
                        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold text-emerald-300">New</span>
                      )}
                    </div>
                    <p className="mt-1 text-xs leading-5 text-slate-400">{alert.message}</p>
                    <p className="mt-2 text-[10px] text-slate-500">{formatDate(alert.created_at)}</p>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center">
              <Bell className="mx-auto mb-3 h-7 w-7 text-slate-600" />
              <p className="text-sm font-semibold text-slate-300">No alerts are stored for your account.</p>
              <p className="mt-1 text-xs text-slate-500">Alerts will appear here when the system sends them.</p>
            </div>
          )}
        </section>
      </main>

      <footer className="border-t border-slate-800 bg-slate-900/40 px-4 py-5 text-center text-[10px] text-slate-500">
        BayanAlert · Live data from the community reporting database
      </footer>
    </div>
  );
}
