import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertCircle,
  Clock3,
  Eye,
  FileWarning,
  Loader2,
  LogOut,
  MapPin,
  Radio,
  RefreshCw,
  ShieldCheck,
  ThumbsDown,
  ThumbsUp,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api, publicFileUrl } from '../api/client';
import { BrandLogo } from '../components/BrandLogo';
import { NotificationDropdown } from '../components/NotificationDropdown';
import { ReportPinsMap } from '../components/ReportPinsMap';

function formatStatus(status) {
  return String(status || 'unknown').replaceAll('_', ' ').toUpperCase();
}

function relativeDate(value) {
  if (!value) return 'Date unavailable';
  const date = new Date(String(value).replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) return 'Date unavailable';
  const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

function statusStyle(status) {
  const styles = {
    pending: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
    verified: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    approved: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    assigned: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
    in_progress: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300',
    resolved: 'border-teal-500/30 bg-teal-500/10 text-teal-300',
    disputed: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
    rejected: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
  };
  return styles[String(status || '').toLowerCase()] || 'border-slate-700 bg-slate-800 text-slate-300';
}

function isVideo(evidence) {
  return evidence?.evidence_type === 'video' || /\.mp4(?:$|[?#])/i.test(evidence?.file_path || '');
}

function EvidenceMedia({ report, onImageClick }) {
  const evidence = Array.isArray(report.evidence) ? report.evidence : [];
  if (!evidence.length) return null;

  return (
    <div className={`mt-4 grid gap-1 overflow-hidden rounded-xl border border-slate-800 bg-black ${
      evidence.length > 1 ? 'grid-cols-2' : 'grid-cols-1'
    }`}>
      {evidence.slice(0, 4).map((item, index) => {
        const url = publicFileUrl(item.file_path);
        if (!url) return null;
        if (isVideo(item)) {
          return (
            <video
              key={item.evidence_id || index}
              src={url}
              controls
              playsInline
              className="max-h-[28rem] min-h-40 w-full bg-black object-contain"
            />
          );
        }
        return (
          <button
            key={item.evidence_id || index}
            type="button"
            onClick={() => onImageClick(url, `${report.title} evidence ${index + 1}`)}
            className="group relative min-h-40 overflow-hidden focus:outline-none focus:ring-2 focus:ring-orange-400"
          >
            <img
              src={url}
              alt={`${report.title} evidence ${index + 1}`}
              loading="lazy"
              className="h-full max-h-[28rem] min-h-40 w-full object-cover transition duration-300 group-hover:scale-[1.02]"
            />
            <span className="absolute inset-0 flex items-center justify-center bg-slate-950/0 text-white opacity-0 transition group-hover:bg-slate-950/25 group-hover:opacity-100">
              <Eye className="h-5 w-5" />
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default function IncidentFeed() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const mapRef = useRef(null);
  const [reports, setReports] = useState([]);
  const [mapReports, setMapReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [voteError, setVoteError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [votingReportId, setVotingReportId] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [selectedMapReportId, setSelectedMapReportId] = useState(null);
  const [lightbox, setLightbox] = useState(null);

  const loadFeed = useCallback(async () => {
    setLoading(true);
    setPageError('');
    try {
      const [feedResponse, mapResponse] = await Promise.all([
        api.getCommunityDashboard(),
        api.getCommunityMapReports(),
      ]);
      const feedReports = feedResponse?.data?.reports;
      const activeMapReports = mapResponse?.data?.reports;
      if (!Array.isArray(feedReports) || !Array.isArray(activeMapReports)) {
        throw new Error('The incident feed returned an invalid response.');
      }
      setReports(feedReports);
      setMapReports(activeMapReports);
    } catch (requestError) {
      setPageError(requestError.message || 'Unable to load the incident feed.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  const categories = useMemo(() => {
    const categoryMap = new Map();
    reports.forEach((report) => {
      if (report.category_id && report.category_name) {
        categoryMap.set(String(report.category_id), report.category_name);
      }
    });
    return Array.from(categoryMap, ([id, name]) => ({ id, name }));
  }, [reports]);
  const statuses = useMemo(() => (
    Array.from(new Set(reports.map((report) => String(report.status || '').toLowerCase()).filter(Boolean)))
  ), [reports]);
  const filteredReports = useMemo(() => reports.filter((report) => (
    (statusFilter === 'all' || String(report.status).toLowerCase() === statusFilter) &&
    (categoryFilter === 'all' || String(report.category_id) === categoryFilter)
  )), [categoryFilter, reports, statusFilter]);
  const filteredMapReports = useMemo(() => mapReports.filter((report) => (
    (statusFilter === 'all' || String(report.status).toLowerCase() === statusFilter) &&
    (categoryFilter === 'all' || String(report.category_id) === categoryFilter)
  )), [categoryFilter, mapReports, statusFilter]);

  useEffect(() => {
    const reportId = new URLSearchParams(location.search).get('report_id');
    if (!reportId || loading) return;
    const report = reports.find((item) => String(item.report_id) === reportId) ||
      (String(location.state?.mapReport?.report_id) === reportId
        ? location.state.mapReport
        : null);
    if (report) setSelectedReport(report);
  }, [location.search, location.state, loading, reports]);

  const scrollToReport = useCallback((reportId) => {
    const reportElement = Array.from(document.querySelectorAll('[data-incident-report]')).find(
      (element) => element.dataset.incidentReport === String(reportId)
    );
    reportElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  const handleMapReportSelect = useCallback((report) => {
    setSelectedMapReportId(report.report_id);
    const feedReport = reports.find((item) => String(item.report_id) === String(report.report_id));
    if (feedReport) scrollToReport(feedReport.report_id);
  }, [reports, scrollToReport]);

  async function handleVote(report, choice) {
    setVoteError('');
    setVotingReportId(report.report_id);
    try {
      const vote = report.my_vote === choice ? null : choice;
      const response = await api.voteOnReport(report.report_id, vote);
      const summary = response?.data;
      if (!summary || String(summary.report_id) !== String(report.report_id)) {
        throw new Error('The server returned an invalid vote response.');
      }
      setReports((current) => current.map((item) => (
        String(item.report_id) === String(report.report_id)
          ? {
              ...item,
              confirm_count: summary.confirm_count,
              dispute_count: summary.dispute_count,
              my_vote: summary.my_vote,
            }
          : item
      )));
    } catch (requestError) {
      setVoteError(requestError.message || 'Unable to save your vote.');
    } finally {
      setVotingReportId(null);
    }
  }

  async function handleLogout() {
    await logout();
    navigate('/resident-login', { replace: true });
  }

  return (
    <div className="min-h-screen bg-[#080E1E] text-slate-100">
      <header className="sticky top-0 z-30 border-b border-orange-500/20 bg-[#080E1E]/95 backdrop-blur-xl">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link to="/resident" className="flex shrink-0 items-center gap-2">
            <BrandLogo className="h-9 w-9" />
            <span>
              <span className="block text-sm font-extrabold text-white">BayanAlert</span>
              <span className="block text-[9px] font-semibold uppercase tracking-wider text-orange-400">Community safety</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {[
              ['Dashboard', '/resident', Activity],
              ['Incident Feed', '/resident/incident-feed', FileWarning],
              ['Regional Advisories', '/resident#regional-advisories', Radio],
              ['Report History', '/resident/report-history', Clock3],
            ].map(([label, to, Icon]) => (
              <Link
                key={label}
                to={to}
                aria-current={label === 'Incident Feed' ? 'page' : undefined}
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                  label === 'Incident Feed'
                    ? 'border border-orange-500/30 bg-orange-500/10 text-orange-200'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </nav>
          <div className="flex shrink-0 items-center gap-2">
            <NotificationDropdown role="resident" />
            <span className="hidden max-w-36 truncate text-xs text-slate-300 sm:block">
              {user?.full_name || 'Resident'}
            </span>
            <button
              type="button"
              onClick={handleLogout}
              title="Logout"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-2.5 py-2 text-xs font-semibold text-slate-300 hover:border-orange-500/30 hover:text-orange-200"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
        <nav className="grid grid-cols-2 gap-1 border-t border-slate-800 px-3 py-2 md:hidden">
          <Link to="/resident" className="rounded-lg px-2 py-2 text-center text-[10px] font-semibold text-slate-400">Dashboard</Link>
          <Link to="/resident/incident-feed" aria-current="page" className="rounded-lg bg-orange-500 px-2 py-2 text-center text-[10px] font-bold text-slate-950">Incident Feed</Link>
          <Link to="/resident#regional-advisories" className="rounded-lg px-2 py-2 text-center text-[10px] font-semibold text-slate-400">Regional Advisories</Link>
          <Link to="/resident/report-history" className="rounded-lg px-2 py-2 text-center text-[10px] font-semibold text-slate-400">Report History</Link>
        </nav>
      </header>

      <main className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6">
        <section className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-orange-400">Community updates</p>
            <h1 className="mt-1 flex items-center gap-2 text-2xl font-extrabold text-white">
              <FileWarning className="h-6 w-6 text-orange-400" />
              Incident Feed
            </h1>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-400">
              Community-reported incidents with supporting evidence and resident confirmations. Only verified active reports appear as map pins.
            </p>
          </div>
          <button
            type="button"
            onClick={loadFeed}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 hover:border-orange-500/40 hover:text-white disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </section>

        {pageError && (
          <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-xs text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{pageError}</span>
          </div>
        )}

        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(19rem,0.82fr)]">
          <section className="mx-auto w-full max-w-2xl space-y-5">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-lg">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xs font-bold text-white">Filter incidents</h2>
                  <p className="mt-1 text-[10px] text-slate-500">Filters also apply to verified map pins.</p>
                </div>
                <span className="rounded-full border border-orange-500/20 bg-orange-500/10 px-2.5 py-1 text-[10px] font-bold text-orange-200">
                  {filteredReports.length} posts
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  aria-pressed={statusFilter === 'all'}
                  className={`rounded-full border px-3 py-1.5 text-[10px] font-bold transition ${
                    statusFilter === 'all'
                      ? 'border-orange-500/40 bg-orange-500/15 text-orange-200'
                      : 'border-slate-700 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  All statuses
                </button>
                {statuses.map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setStatusFilter(status)}
                    aria-pressed={statusFilter === status}
                    className={`rounded-full border px-3 py-1.5 text-[10px] font-bold transition ${
                      statusFilter === status
                        ? statusStyle(status)
                        : 'border-slate-700 text-slate-400 hover:border-slate-500'
                    }`}
                  >
                    {formatStatus(status)}
                  </button>
                ))}
                <select
                  aria-label="Filter by hazard category"
                  value={categoryFilter}
                  onChange={(event) => setCategoryFilter(event.target.value)}
                  className="min-w-36 rounded-full border border-slate-700 bg-slate-950 px-3 py-1.5 text-[10px] font-semibold text-slate-200 outline-none focus:border-orange-500"
                >
                  <option value="all">All categories</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {voteError && (
              <div role="alert" className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-300">
                {voteError}
              </div>
            )}

            {loading && reports.length === 0 ? (
              <div role="status" className="flex items-center justify-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/70 py-16 text-xs text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin text-orange-400" />
                Loading community incidents…
              </div>
            ) : filteredReports.length ? (
              filteredReports.map((report) => {
                const canVote = ![false, 0, '0', null].includes(report.can_vote);
                const reportId = String(report.report_id);
                return (
                  <article
                    key={reportId}
                    data-incident-report={reportId}
                    className={`overflow-hidden rounded-2xl border bg-slate-900/80 shadow-lg transition ${
                      selectedMapReportId === report.report_id
                        ? 'border-orange-500/50 shadow-orange-950/20'
                        : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start gap-3 p-4 sm:p-5">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-orange-500/20 bg-gradient-to-br from-orange-500/15 to-cyan-500/10">
                        <ShieldCheck className="h-5 w-5 text-orange-300" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="break-words text-sm font-bold text-white">{report.title || 'Hazard report'}</h2>
                          <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold tracking-wide ${statusStyle(report.status)}`}>
                            {formatStatus(report.status)}
                          </span>
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-500">
                          <span className="rounded-full border border-cyan-500/20 bg-cyan-500/5 px-2 py-0.5 text-cyan-200">
                            {report.category_name || 'Uncategorized'}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-emerald-400" />
                            {report.barangay_name || 'Barangay not specified'}
                          </span>
                          <span className="font-mono">{report.reference_number || `#${reportId}`}</span>
                          <span>Reported by {report.reporter_name || (report.user_id == null ? 'Deleted User' : 'Resident')}</span>
                        </div>
                      </div>
                      <span title={report.submitted_at || ''} className="inline-flex shrink-0 items-center gap-1 text-[10px] text-slate-500">
                        <Clock3 className="h-3 w-3" />
                        {relativeDate(report.submitted_at)}
                      </span>
                    </div>

                    <div className="px-4 pb-4 sm:px-5 sm:pb-5">
                      <p className="whitespace-pre-wrap break-words text-xs leading-6 text-slate-300">
                        {report.description || 'No description provided.'}
                      </p>
                      <EvidenceMedia
                        report={report}
                        onImageClick={(src, alt) => setLightbox({ src, alt })}
                      />
                      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-800 pt-3">
                        {canVote ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleVote(report, 'confirm')}
                              disabled={votingReportId === report.report_id}
                              aria-pressed={report.my_vote === 'confirm'}
                              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[10px] font-bold transition disabled:opacity-50 ${
                                report.my_vote === 'confirm'
                                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                                  : 'border-slate-700 text-slate-300 hover:border-emerald-500/40 hover:text-emerald-200'
                              }`}
                            >
                              <ThumbsUp className="h-3.5 w-3.5" />
                              Confirm {Number(report.confirm_count || 0)}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleVote(report, 'dispute')}
                              disabled={votingReportId === report.report_id}
                              aria-pressed={report.my_vote === 'dispute'}
                              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[10px] font-bold transition disabled:opacity-50 ${
                                report.my_vote === 'dispute'
                                  ? 'border-rose-500/40 bg-rose-500/10 text-rose-200'
                                  : 'border-slate-700 text-slate-300 hover:border-rose-500/40 hover:text-rose-200'
                              }`}
                            >
                              <ThumbsDown className="h-3.5 w-3.5" />
                              Dispute {Number(report.dispute_count || 0)}
                            </button>
                          </>
                        ) : (
                          <span className="px-2 text-[10px] text-slate-500">You can’t vote on your own report.</span>
                        )}
                        {mapReports.some((item) => String(item.report_id) === reportId) ? (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedMapReportId(report.report_id);
                              mapRef.current?.focusReport(report.report_id);
                              document.getElementById('incident-map')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }}
                            className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-2 text-[10px] font-semibold text-slate-300 transition hover:border-orange-500/40 hover:text-orange-200"
                          >
                            <MapPin className="h-3.5 w-3.5" />
                            Locate on map
                          </button>
                        ) : (
                          <span className="ml-auto text-[10px] text-slate-500">Map pin available after verification</span>
                        )}
                        <button
                          type="button"
                          onClick={() => setSelectedReport(report)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-2 text-[10px] font-semibold text-slate-300 transition hover:border-cyan-500/40 hover:text-cyan-200"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View Details
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 py-14 text-center">
                <FileWarning className="mx-auto h-8 w-8 text-slate-600" />
                <p className="mt-3 text-sm font-semibold text-slate-300">
                  {reports.length ? 'No reports match these filters.' : 'No community incidents yet.'}
                </p>
              </div>
            )}
          </section>

          <aside id="incident-map" className="order-first lg:order-last lg:sticky lg:top-24">
            <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl">
              <div className="border-b border-slate-800 p-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-bold text-white">Verified hazard map</h2>
                    <p className="mt-1 text-[10px] text-slate-400">Active verified reports only · Calapan City</p>
                  </div>
                  <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-emerald-200">
                    {filteredMapReports.length} pins
                  </span>
                </div>
              </div>
              <ReportPinsMap
                ref={mapRef}
                reports={filteredMapReports}
                selectedReportId={selectedMapReportId}
                onReportSelect={handleMapReportSelect}
                height="h-[320px] sm:h-[390px]"
              />
              <div className="border-t border-slate-800 px-4 py-3 text-[10px] leading-4 text-slate-500">
                Pins display report locations only; pending, disputed, and resolved reports are not mapped.
              </div>
            </section>
          </aside>
        </div>
      </main>

      {selectedReport && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm"
          onClick={() => setSelectedReport(null)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="incident-details-title"
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-800 p-4 sm:p-5">
              <div>
                <p className="font-mono text-[10px] text-orange-300">{selectedReport.reference_number}</p>
                <h2 id="incident-details-title" className="mt-1 text-lg font-bold text-white">{selectedReport.title}</h2>
                <p className="mt-1 text-[10px] text-slate-500">{selectedReport.category_name} · {selectedReport.barangay_name}</p>
              </div>
              <button type="button" onClick={() => setSelectedReport(null)} aria-label="Close incident details" className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4 p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${statusStyle(selectedReport.status)}`}>
                  {formatStatus(selectedReport.status)}
                </span>
                <span className="text-[10px] text-slate-500">{relativeDate(selectedReport.submitted_at)}</span>
              </div>
              <p className="whitespace-pre-wrap text-xs leading-6 text-slate-300">{selectedReport.description}</p>
              <EvidenceMedia report={selectedReport} onImageClick={(src, alt) => setLightbox({ src, alt })} />
            </div>
          </section>
        </div>
      )}

      {lightbox && (
        <div
          className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            aria-label="Close enlarged image"
            onClick={() => setLightbox(null)}
            className="absolute right-4 top-4 rounded-full bg-slate-900/80 p-2 text-white hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={lightbox.src}
            alt={lightbox.alt}
            className="max-h-[90vh] max-w-full rounded-lg object-contain shadow-2xl"
          />
        </div>
      )}
    </div>
  );
}
