import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertCircle,
  Bell,
  Check,
  CheckCircle2,
  Clock3,
  Eye,
  FileWarning,
  Loader2,
  LogOut,
  MapPin,
  PlusCircle,
  Radio,
  RefreshCw,
  ShieldAlert,
  ThumbsDown,
  ThumbsUp,
  User,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api, publicFileUrl } from '../api/client';
import { HazardMap } from '../components/HazardMap';
import { CalapanWeather } from '../components/CalapanWeather';
import { ExternalAdvisories } from '../components/ExternalAdvisories';
import { BrandLogo } from '../components/BrandLogo';

const EMPTY_DASHBOARD = {
  reports: [],
  status_counts: [],
  category_counts: [],
  barangay_counts: [],
  alerts: [],
};
const REPORT_PROMPT_SEEN_KEY = 'bayanalert_resident_report_prompt_seen';

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

function ResidentReportPrompt({ onDismiss }) {
  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm"
      onClick={onDismiss}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="resident-report-prompt-title"
        className="w-full max-w-md rounded-2xl border border-emerald-500/30 bg-slate-900 p-6 text-slate-100 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400">
              Help keep Calapan safe
            </p>
            <h2 id="resident-report-prompt-title" className="mt-2 text-xl font-extrabold text-white">
              Report a hazard in your community
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Share an incident with the response team. Reports can include a location and photo evidence.
            </p>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Close submit report prompt"
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <Link
          to="/resident/submitted-reports"
          state={{ openCreateReport: true }}
          onClick={onDismiss}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-500"
        >
          <PlusCircle className="h-4 w-4" />
          Submit Report
        </Link>
        <button
          type="button"
          onClick={onDismiss}
          className="mt-2 w-full rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-400 transition hover:bg-slate-800 hover:text-white"
        >
          Explore dashboard
        </button>
      </div>
    </div>
  );
}

function EvidenceImage({ filePath, alt, className }) {
  const [hasError, setHasError] = useState(false);

  if (!filePath || hasError) {
    return (
      <div className={`flex items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-center text-xs text-slate-500 ${className}`}>
        Image preview unavailable
      </div>
    );
  }

  return (
    <img
      src={publicFileUrl(filePath)}
      alt={alt}
      loading="lazy"
      onError={() => setHasError(true)}
      className={className}
    />
  );
}

function isVideoEvidence(evidence) {
  return evidence?.evidence_type === 'video' || /\.mp4(?:$|[?#])/i.test(evidence?.file_path || '');
}

function EvidencePreview({ evidence, alt, className }) {
  const fileUrl = publicFileUrl(evidence?.file_path);
  if (!fileUrl) return null;

  if (isVideoEvidence(evidence)) {
    return (
      <video
        controls
        playsInline
        preload="metadata"
        aria-label={alt}
        className={className}
      >
        <source src={fileUrl} type="video/mp4" />
        Your browser does not support MP4 playback.
      </video>
    );
  }

  return <EvidenceImage filePath={evidence.file_path} alt={alt} className={className} />;
}

export function ResidentDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [dashboard, setDashboard] = useState(EMPTY_DASHBOARD);
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [notificationError, setNotificationError] = useState('');
  const [voteError, setVoteError] = useState('');
  const [votingReportId, setVotingReportId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedReport, setSelectedReport] = useState(null);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [showReportPrompt, setShowReportPrompt] = useState(
    () => localStorage.getItem(REPORT_PROMPT_SEEN_KEY) !== '1'
  );

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
    if (showReportPrompt) {
      localStorage.setItem(REPORT_PROMPT_SEEN_KEY, '1');
    }
  }, [showReportPrompt]);

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

  const communityReports = useMemo(
    () => dashboard.reports.filter((report) => (
      report.can_vote !== false && report.can_vote !== 0 && report.can_vote !== '0' &&
      report.can_vote !== null
    )),
    [dashboard.reports]
  );

  const filteredReports = useMemo(
    () => communityReports.filter((report) => (
      (statusFilter === 'all' || report.status === statusFilter) &&
      (categoryFilter === 'all' || String(report.category_id) === categoryFilter)
    )),
    [communityReports, statusFilter, categoryFilter]
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

  async function markAlertRead(alert) {
    if ([1, '1', true].includes(alert.is_read)) return;
    setNotificationError('');
    try {
      await api.markNotificationRead(alert.notification_id);
      setDashboard((current) => ({
        ...current,
        alerts: current.alerts.map((item) => (
          item.notification_id === alert.notification_id
            ? { ...item, is_read: 1 }
            : item
        )),
      }));
    } catch (requestError) {
      setNotificationError(requestError.message || 'Unable to mark this alert as read.');
    }
  }

  async function handleReportVote(report, choice) {
    setVoteError('');
    setVotingReportId(report.report_id);

    try {
      const vote = report.my_vote === choice ? null : choice;
      const response = await api.voteOnReport(report.report_id, vote);
      const summary = response?.data;
      if (!summary || summary.report_id !== report.report_id) {
        throw new Error('The server returned an invalid vote response.');
      }

      setDashboard((current) => ({
        ...current,
        reports: current.reports.map((item) => (
          item.report_id === report.report_id
            ? {
                ...item,
                confirm_count: summary.confirm_count,
                dispute_count: summary.dispute_count,
                my_vote: summary.my_vote,
              }
            : item
        )),
      }));
    } catch (requestError) {
      setVoteError(requestError.message || 'Unable to save your vote.');
    } finally {
      setVotingReportId(null);
    }
  }

  const navItems = [
    { label: 'Dashboard', id: 'dashboard', icon: Activity },
    { label: 'Incident Feed', id: 'incident-feed', icon: FileWarning },
    { label: 'Regional Advisories', id: 'regional-advisories', icon: Radio },
    { label: 'Alerts', id: 'alerts', icon: Bell },
  ];

  useEffect(() => {
    if (!hasLoaded) return undefined;
    const sections = navItems
      .map(({ id }) => document.getElementById(id))
      .filter(Boolean);
    if (!sections.length) return undefined;

    function updateActiveSection() {
      const headerHeight = document.querySelector('header')?.getBoundingClientRect().height || 0;
      const activationLine = headerHeight + 20;
      let currentSection = sections[0];

      sections.forEach((section) => {
        if (section.getBoundingClientRect().top <= activationLine) {
          currentSection = section;
        }
      });

      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) {
        currentSection = sections[sections.length - 1];
      }

      setActiveSection(currentSection.id);
    }

    window.addEventListener('scroll', updateActiveSection, { passive: true });
    window.addEventListener('resize', updateActiveSection);
    updateActiveSection();
    return () => {
      window.removeEventListener('scroll', updateActiveSection);
      window.removeEventListener('resize', updateActiveSection);
    };
  }, [hasLoaded]);

  useEffect(() => {
    if (!hasLoaded || !location.hash) return;
    const section = document.getElementById(location.hash.slice(1));
    if (!section) return;
    setActiveSection(section.id);
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [hasLoaded, location.hash]);

  if (loading && !hasLoaded) {
    return (
      <>
        <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-950 text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
          <p className="text-sm">Loading live community data...</p>
        </div>
        {showReportPrompt && (
          <ResidentReportPrompt onDismiss={() => setShowReportPrompt(false)} />
        )}
      </>
    );
  }

  if (error && !hasLoaded) {
    return (
      <>
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
        {showReportPrompt && (
          <ResidentReportPrompt onDismiss={() => setShowReportPrompt(false)} />
        )}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-30 border-b border-slate-700/80 bg-slate-900/80 shadow-lg shadow-black/20 backdrop-blur-xl">
        <div className="mx-auto flex min-h-[64px] max-w-[1500px] items-center justify-between gap-3 px-4 lg:px-7">
          <Link to="/resident" className="flex shrink-0 items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center">
              <BrandLogo className="h-10 w-10" />
            </span>
            <span>
              <span className="block text-sm font-extrabold">BayanAlert</span>
              <span className="block text-[9px] font-semibold uppercase tracking-wider text-emerald-400">
                Community safety
              </span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            {navItems.slice(0, 2).map(({ label, id, icon: Icon }) => (
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
                {id === 'alerts' && unreadAlerts > 0 && (
                  <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[9px] font-bold text-white">
                    {unreadAlerts > 99 ? '99+' : unreadAlerts}
                  </span>
                )}
              </button>
            ))}
            <Link
              to="/resident/submitted-reports"
              state={{ openCreateReport: true }}
              aria-current={location.pathname === '/resident/submitted-reports' ? 'page' : undefined}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                location.pathname === '/resident/submitted-reports'
                  ? 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <PlusCircle className="h-4 w-4" />
              Submit Reports
            </Link>
            {navItems.slice(2).map(({ label, id, icon: Icon }) => (
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
                {id === 'alerts' && unreadAlerts > 0 && (
                  <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[9px] font-bold text-white">
                    {unreadAlerts > 99 ? '99+' : unreadAlerts}
                  </span>
                )}
              </button>
            ))}
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
        <nav className="grid grid-cols-2 gap-1 border-t border-slate-800 px-3 py-2 lg:hidden">
          {navItems.slice(0, 2).map(({ label, id, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => scrollToSection(id)}
              className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[10px] font-semibold ${
                activeSection === id ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:bg-slate-800'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
              {id === 'alerts' && unreadAlerts > 0 && (
                <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[9px] font-bold text-white">
                  {unreadAlerts > 99 ? '99+' : unreadAlerts}
                </span>
              )}
            </button>
          ))}
          <Link
            to="/resident/submitted-reports"
            state={{ openCreateReport: true }}
            aria-current={location.pathname === '/resident/submitted-reports' ? 'page' : undefined}
            className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[10px] font-semibold ${
              location.pathname === '/resident/submitted-reports'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            <PlusCircle className="h-3.5 w-3.5" />
            Submit Reports
          </Link>
          {navItems.slice(2).map(({ label, id, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => scrollToSection(id)}
              className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[10px] font-semibold ${
                activeSection === id ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:bg-slate-800'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
              {id === 'alerts' && unreadAlerts > 0 && (
                <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[9px] font-bold text-white">
                  {unreadAlerts > 99 ? '99+' : unreadAlerts}
                </span>
              )}
            </button>
          ))}
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

          <div className="grid items-stretch gap-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(18rem,1fr)]">
            <HazardMap className="min-w-0" height="h-[420px]" weather={weather} />
            <CalapanWeather
              onWeatherChange={setWeather}
              reminderEnabled={!showReportPrompt}
            />
          </div>

          <ExternalAdvisories />

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

          {voteError && (
            <div role="alert" className="mt-4 rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-300">
              {voteError}
            </div>
          )}

          <div className="space-y-3 pt-4">
            {filteredReports.map((report) => (
              <article key={report.report_id} className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 transition hover:border-emerald-500/30">
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(17rem,auto)]">
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
                        <button
                          type="button"
                          onClick={() => setSelectedReport(report)}
                          className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-emerald-500/40 hover:text-emerald-300"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View details
                        </button>
                      </div>
                      <aside className="flex min-w-0 flex-col gap-3 sm:items-end sm:justify-between">
                        <span className="flex items-center gap-1.5 text-[10px] text-slate-500 sm:justify-end">
                          <Clock3 className="h-3.5 w-3.5" />
                          {formatDate(report.submitted_at)}
                        </span>
                        {report.evidence?.[0]?.file_path && (
                          <div className="sm:ml-auto">
                            {isVideoEvidence(report.evidence[0]) ? (
                              <EvidencePreview
                                evidence={report.evidence[0]}
                                alt={`Video evidence preview for ${report.title}`}
                                className="h-28 w-full rounded-lg border border-slate-800 bg-black object-cover sm:w-44"
                              />
                            ) : (
                              <button
                                type="button"
                                onClick={() => setSelectedReport(report)}
                                aria-label={`Preview report details and images for ${report.title}`}
                                className="rounded-lg text-left focus:outline-none focus:ring-2 focus:ring-emerald-500"
                              >
                                <EvidenceImage
                                  filePath={report.evidence[0].file_path}
                                  alt={`Photo evidence preview for ${report.title}`}
                                  className="h-28 w-full rounded-lg border border-slate-800 object-cover sm:w-44"
                                />
                              </button>
                            )}
                          </div>
                        )}
                        {report.can_vote === 1 || report.can_vote === '1' || report.can_vote === true ? (
                          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                            <button
                              type="button"
                              onClick={() => handleReportVote(report, 'confirm')}
                              disabled={votingReportId === report.report_id}
                              aria-pressed={report.my_vote === 'confirm'}
                              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition disabled:cursor-wait disabled:opacity-50 ${
                                report.my_vote === 'confirm'
                                  ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-200'
                                  : 'border-slate-700 text-slate-300 hover:border-emerald-500/40 hover:text-emerald-300'
                              }`}
                            >
                              <ThumbsUp className="h-3.5 w-3.5" />
                              Confirm <span>{Number(report.confirm_count || 0)}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleReportVote(report, 'dispute')}
                              disabled={votingReportId === report.report_id}
                              aria-pressed={report.my_vote === 'dispute'}
                              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition disabled:cursor-wait disabled:opacity-50 ${
                                report.my_vote === 'dispute'
                                  ? 'border-rose-500/50 bg-rose-500/15 text-rose-200'
                                  : 'border-slate-700 text-slate-300 hover:border-rose-500/40 hover:text-rose-300'
                              }`}
                            >
                              <ThumbsDown className="h-3.5 w-3.5" />
                              Dispute <span>{Number(report.dispute_count || 0)}</span>
                            </button>
                          </div>
                        ) : (
                          <p className="text-[10px] text-slate-500 sm:text-right">Voting unavailable</p>
                        )}
                      </aside>
                </div>
              </article>
            ))}

            {!filteredReports.length && (
              <div className="py-12 text-center">
                <FileWarning className="mx-auto mb-3 h-8 w-8 text-slate-600" />
                <p className="text-sm font-semibold text-slate-300">
                  {communityReports.length
                      ? 'No reports match these filters.'
                      : 'No incident reports from other residents are available yet.'}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {communityReports.length ? 'Try another status or category.' : 'New reports from other residents will appear here.'}
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

          {notificationError && (
            <div role="alert" className="mb-4 rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-300">
              {notificationError}
            </div>
          )}

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
                  {![1, '1', true].includes(alert.is_read) && (
                    <button
                      type="button"
                      onClick={() => markAlertRead(alert)}
                      aria-label="Mark notification as read"
                      title="Mark as read"
                      className="shrink-0 rounded-lg p-2 text-slate-400 transition hover:bg-emerald-500/10 hover:text-emerald-300"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  )}
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

      {showReportPrompt && (
        <ResidentReportPrompt onDismiss={() => setShowReportPrompt(false)} />
      )}

      {selectedReport && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
          onClick={() => setSelectedReport(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="community-report-details-title"
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 text-slate-100 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-800 p-5">
              <div>
                <h2 id="community-report-details-title" className="text-base font-extrabold text-white">
                  Report details
                </h2>
                <p className="mt-1 break-all font-mono text-xs text-slate-400">
                  {selectedReport.reference_number || 'Reference unavailable'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                aria-label="Close report details"
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-5 p-5">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-bold text-white">{selectedReport.title}</h3>
                <StatusBadge status={selectedReport.status} />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  ['Hazard category', selectedReport.category_name],
                  ['Barangay', selectedReport.barangay_name || 'Barangay not specified'],
                  ['Submitted', formatDate(selectedReport.submitted_at)],
                  [
                    'Community feedback',
                    `${Number(selectedReport.confirm_count || 0)} confirmations · ${Number(selectedReport.dispute_count || 0)} disputes`,
                  ],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
                    <p className="mt-1 break-words text-sm text-slate-200">{value || 'Not provided'}</p>
                  </div>
                ))}
              </div>

              <div>
                <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                  Description
                </h4>
                <p className="whitespace-pre-wrap rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-sm leading-6 text-slate-300">
                  {selectedReport.description || 'No description provided.'}
                </p>
              </div>

              {selectedReport.evidence?.length > 0 && (
                <div>
                  <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                    Photo and video evidence
                  </h4>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {selectedReport.evidence.map((item, index) => (
                      <div key={item.evidence_id || index} className="overflow-hidden rounded-xl">
                        {isVideoEvidence(item) ? (
                          <EvidencePreview
                            evidence={item}
                            alt={`Video evidence ${index + 1} for ${selectedReport.title}`}
                            className="max-h-96 min-h-40 w-full rounded-xl border border-slate-800 bg-black object-contain"
                          />
                        ) : (
                          <a
                            href={publicFileUrl(item.file_path)}
                            target="_blank"
                            rel="noreferrer"
                            className="block rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          >
                            <EvidenceImage
                              filePath={item.file_path}
                              alt={`Photo evidence ${index + 1} for ${selectedReport.title}`}
                              className="max-h-96 min-h-40 w-full rounded-xl border border-slate-800 object-contain"
                            />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end border-t border-slate-800 p-4">
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                className="rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-500"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="border-t border-slate-800 bg-slate-900/40 px-4 py-5 text-center text-[10px] text-slate-500">
        BayanAlert · Live data from the community reporting database
      </footer>
    </div>
  );
}
