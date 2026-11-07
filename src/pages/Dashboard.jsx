import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api, publicFileUrl } from '../api/client';
import { 
  AlertTriangle, 
  Clock, 
  Users, 
  ArrowRight, 
  Database, 
  Layers, 
  Loader2, 
  AlertCircle,
  RefreshCw,
  Activity,
  CheckCircle2,
  Eye,
  X,
  Mail,
  Send,
} from 'lucide-react';
import { HazardMap } from '../components/HazardMap';
import { CalapanWeather } from '../components/CalapanWeather';

function formatReportDate(value) {
  if (!value) return 'Date unavailable';
  const date = new Date(String(value).replace(' ', 'T'));
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function EvidenceImage({ filePath, alt, className }) {
  const [hasError, setHasError] = useState(false);

  if (!filePath || hasError) {
    return (
      <div className={`flex items-center justify-center rounded-lg border border-slate-800 bg-slate-950 text-center text-xs text-slate-500 ${className}`}>
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

export function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshError, setRefreshError] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('All categories');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [weather, setWeather] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [approvalReview, setApprovalReview] = useState(null);
  const [approvalRecipient, setApprovalRecipient] = useState('');
  const [sendApprovalEmail, setSendApprovalEmail] = useState(true);
  const [approvingReport, setApprovingReport] = useState(false);
  const [approvalError, setApprovalError] = useState('');
  const [approvalMessage, setApprovalMessage] = useState('');
  const hasDashboardData = useRef(false);
  const departmentContacts = [
    { code: 'DOH', name: 'Department of Health', email: 'doh.calapan@gmail.com' },
    { code: 'BFP', name: 'Bureau of Fire Protection', email: 'calapan.firedepartment@gmail.com' },
    { code: 'CDRRMO', name: 'City Disaster Risk Reduction and Management Office', email: 'calapan.disastermanagement@gmail.com' },
    { code: 'PCG', name: 'Philippine Coast Guard', email: 'coastguard.calapan@gmail.com' },
  ];

  const loadDashboard = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const res = await api.getDashboard();
      setData(res.data);
      hasDashboardData.current = true;
      setError('');
      setRefreshError('');
      setLastUpdated(new Date());
    } catch (err) {
      const message = err.message || 'Failed to fetch dashboard metrics.';
      if (hasDashboardData.current) {
        setRefreshError(message);
      } else {
        setError(message);
      }
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
    const refreshTimer = window.setInterval(() => loadDashboard(false), 60000);
    return () => window.clearInterval(refreshTimer);
  }, []);

  async function beginReportApproval(report) {
    setApprovalError('');
    setApprovalMessage('');
    setApprovalReview({ loading: true, report: null, department: null });
    try {
      const response = await api.getRecord('hazard_reports', report.report_id);
      const preview = response?.data?.notification || {};
      setApprovalReview({
        loading: false,
        report: preview.report || report,
        department: preview.department || null,
      });
      setApprovalRecipient(preview.default_email || '');
      setSendApprovalEmail(true);
    } catch (requestError) {
      setApprovalReview(null);
      setApprovalError(requestError.message || 'Could not load approval details.');
    }
  }

  async function approveSelectedReport() {
    if (!selectedReport || !approvalReview?.report) return;
    if (sendApprovalEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(approvalRecipient.trim())) {
      setApprovalError('Enter a valid recipient email or turn off email delivery.');
      return;
    }

    setApprovingReport(true);
    setApprovalError('');
    setApprovalMessage('');
    try {
      const response = await api.updateRecord('hazard_reports', selectedReport.report_id, {
        status: 'verified',
        send_department_email: sendApprovalEmail,
        department_email: approvalRecipient.trim(),
      });
      const message = response?.message || 'Report approved.';
      setApprovalMessage(message);
      setSelectedReport((current) => current
        ? { ...current, status: 'verified' }
        : current);
      setApprovalReview(null);
      await loadDashboard(false);
    } catch (requestError) {
      setApprovalError(requestError.message || 'Could not approve this report.');
    } finally {
      setApprovingReport(false);
    }
  }

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mb-3" />
        <p className="text-sm">Loading BayanAlert operational metrics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300">
        <div className="flex items-center gap-3 mb-3">
          <AlertCircle className="w-6 h-6 text-rose-400" />
          <h3 className="font-semibold text-lg text-white">Dashboard Offline</h3>
        </div>
        <p className="text-sm mb-4">{error}</p>
        <button
          onClick={loadDashboard}
          className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600/30 hover:bg-rose-600/50 border border-rose-500/30 rounded-xl text-sm font-medium text-white transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Retry Connection
        </button>
      </div>
    );
  }

  const {
    counts = {},
    total_records = 0,
    report_count = 0,
    pending_reports = 0,
    active_users = 0,
    recent_reports = [],
    report_statuses = [],
    table_availability = {},
    unavailable_tables = [],
    tables = {}
  } = data || {};

  // Group tables
  const groups = {};
  Object.entries(tables).forEach(([tableName, def]) => {
    const groupName = def.group || 'General';
    if (!groups[groupName]) groups[groupName] = [];
    groups[groupName].push({ tableName, ...def });
  });
  const visibleGroups = Object.entries(groups).filter(
    ([groupName]) => selectedGroup === 'All categories' || groupName === selectedGroup
  );
  const totalStatuses = report_statuses.reduce(
    (sum, item) => sum + Number(item.total || 0),
    0
  );
  const isMonitoring = unavailable_tables.length === 0;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">BayanAlert Administration</span>
          <h1 className="text-3xl font-bold tracking-tight text-white mt-1">Good day, {user?.full_name || 'Admin'}</h1>
          <p className="text-sm text-slate-400 mt-1">
            A live operational view of BayanAlert data. Choose a register to review, add, or update records.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs text-slate-500">
            {lastUpdated
              ? `Updated ${lastUpdated.toLocaleTimeString()} · Auto-refreshes every minute`
              : 'Monitoring'}
          </span>
          <button
            type="button"
            onClick={() => loadDashboard()}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-2.5 border border-slate-700 hover:border-slate-600 text-slate-300 hover:text-white disabled:opacity-50 text-sm rounded-xl transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <Link
            to="/admin/tables/hazard_reports"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm rounded-xl shadow-lg shadow-emerald-600/20 transition-colors"
          >
            <span>View Reports</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {refreshError && (
        <div role="status" className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
          Latest refresh failed. Showing the last successful snapshot: {refreshError}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Records</span>
            <Database className="w-5 h-5 text-slate-500" />
          </div>
          <div className="text-3xl font-extrabold text-white tracking-tight">{Number(total_records).toLocaleString()}</div>
          <p className="text-xs text-slate-500 mt-1">Across {Object.keys(tables).length} BayanAlert tables</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Hazard Reports</span>
            <AlertTriangle className="w-5 h-5 text-amber-500" />
          </div>
          <div className="text-3xl font-extrabold text-white tracking-tight">{Number(report_count).toLocaleString()}</div>
          <p className="text-xs text-slate-500 mt-1">All incident reports logged</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Pending Reports</span>
            <Clock className="w-5 h-5 text-rose-500" />
          </div>
          <div className="text-3xl font-extrabold text-white tracking-tight">{Number(pending_reports).toLocaleString()}</div>
          <p className="text-xs text-rose-400/80 mt-1">Awaiting verification & action</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Accounts</span>
            <Users className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="text-3xl font-extrabold text-white tracking-tight">{Number(active_users).toLocaleString()}</div>
          <p className="text-xs text-emerald-400/80 mt-1">Users with active status</p>
        </div>
      </div>

      {/* Operational monitoring */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4" aria-label="Operational monitoring">
        <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-bold text-white">
                <Activity className="h-5 w-5 text-emerald-400" />
                Report monitoring
              </h2>
              <p className="mt-1 text-xs text-slate-400">Current distribution of hazard reports by workflow status.</p>
            </div>
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
              isMonitoring
                ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                : 'border-amber-500/20 bg-amber-500/10 text-amber-300'
            }`}>
              {isMonitoring ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
              {isMonitoring ? 'All registers available' : `${unavailable_tables.length} register${unavailable_tables.length === 1 ? '' : 's'} unavailable`}
            </span>
          </div>

          {report_statuses.length ? (
            <div className="mt-5 space-y-3">
              {report_statuses.map(({ status, total }) => {
                const amount = Number(total || 0);
                const percentage = totalStatuses ? (amount / totalStatuses) * 100 : 0;
                return (
                  <div key={status || 'unknown'}>
                    <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                      <span className="capitalize text-slate-300">{String(status || 'Unspecified').replace(/_/g, ' ')}</span>
                      <span className="font-mono text-slate-400">{amount.toLocaleString()}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="mt-5 text-sm text-slate-500">
              {table_availability.hazard_reports === false
                ? 'Report monitoring is unavailable because the hazard reports table is missing.'
                : 'No report status data is available yet.'}
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="flex items-center gap-2 text-lg font-bold text-white">
            <Database className="h-5 w-5 text-sky-400" />
            Register availability
          </h2>
          <p className="mt-1 text-xs text-slate-400">Configured data categories checked against the database.</p>
          <div className="mt-5 flex items-end gap-2">
            <span className="text-3xl font-extrabold text-white">
              {Object.values(table_availability).filter(Boolean).length}
            </span>
            <span className="mb-1 text-sm text-slate-500">/ {Object.keys(table_availability).length} available</span>
          </div>
          {unavailable_tables.length > 0 && (
            <p className="mt-3 text-xs leading-5 text-amber-300">
              Missing tables: {unavailable_tables.join(', ')}
            </p>
          )}
        </div>
      </section>

      <div className="grid items-stretch gap-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(18rem,1fr)]">
        <HazardMap className="min-w-0" height="h-[420px]" weather={weather} />
        <CalapanWeather onWeatherChange={setWeather} showReminder={false} />
      </div>

      {/* Database Registers & Recent Reports */}
      <div className="grid grid-cols-1 gap-8">
        <div id="registers" className="order-2 space-y-6">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-6">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-emerald-400" />
                  Database Registers
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Choose a register to inspect, create, or update records.</p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700/60">
                {Object.keys(tables).length} registers
              </span>
            </div>

            <div className="mb-5 flex flex-wrap gap-2" aria-label="Filter registers by category">
              {['All categories', ...Object.keys(groups)].map((groupName) => (
                <button
                  key={groupName}
                  type="button"
                  onClick={() => setSelectedGroup(groupName)}
                  aria-pressed={selectedGroup === groupName}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    selectedGroup === groupName
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                      : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {groupName}
                </button>
              ))}
            </div>

            <div className="order-1 space-y-6">
              {visibleGroups.map(([groupName, groupTables]) => (
                <div key={groupName} className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-400">
                    <span>{groupName}</span>
                    <span className="text-slate-500 font-normal lowercase">{groupTables.length} registers</span>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {groupTables.map((tab) => {
                      const available = table_availability[tab.tableName] !== false;
                      const registerContent = (
                        <>
                          <div>
                            <div className={`text-sm font-semibold transition-colors ${available ? 'text-slate-200 group-hover:text-emerald-400' : 'text-slate-500'}`}>
                              {tab.label}
                            </div>
                            <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                              {tab.description}
                            </p>
                          </div>
                          <span className="flex-shrink-0 rounded-md border border-slate-700/40 bg-slate-900 px-2 py-0.5 text-xs font-mono font-medium text-slate-300">
                            {available
                              ? Number(counts[tab.tableName] ?? 0).toLocaleString()
                              : 'Unavailable'}
                          </span>
                        </>
                      );
                      const className = `flex items-start justify-between gap-3 rounded-xl border p-4 transition-all ${
                        available
                          ? 'group border-slate-800 bg-slate-800/40 hover:border-slate-700 hover:bg-slate-800/80'
                          : 'cursor-not-allowed border-amber-500/10 bg-slate-900/40 opacity-70'
                      }`;

                      return available ? (
                        <Link
                          key={tab.tableName}
                          to={`/admin/tables/${tab.tableName}`}
                          className={className}
                        >
                          {registerContent}
                        </Link>
                      ) : (
                        <div key={tab.tableName} aria-disabled="true" className={className}>
                          {registerContent}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                  Recent Reports
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Latest hazard submissions</p>
              </div>
              <Link
                to="/admin/tables/hazard_reports"
                className="text-xs text-emerald-400 hover:underline"
              >
                Open register
              </Link>
            </div>

            {recent_reports && recent_reports.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {recent_reports.map((report) => (
                  <div key={report.report_id || report.reference_number} className="flex items-start justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                    <div className="min-w-0">
                      <span className="text-[11px] font-mono text-emerald-400 font-semibold block">
                        {report.reference_number}
                      </span>
                      <p className="text-sm font-medium text-slate-200 truncate mt-0.5" title={report.title}>
                        {report.title}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedReport(report);
                          setApprovalReview(null);
                          setApprovalRecipient('');
                          setSendApprovalEmail(true);
                          setApprovalError('');
                          setApprovalMessage('');
                          if (String(report.status || '').toLowerCase() === 'pending') {
                            beginReportApproval(report);
                          }
                        }}
                        className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-2.5 py-1.5 text-[10px] font-semibold text-slate-300 transition hover:border-emerald-500/40 hover:text-emerald-300"
                      >
                        <Eye className="h-3 w-3" />
                        Preview details
                      </button>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        report.status === 'pending'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : report.status === 'resolved'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}>
                        {report.status?.replace('_', ' ') || 'New'}
                      </span>
                      {report.evidence?.[0]?.file_path && (
                        <EvidencePreview
                          evidence={report.evidence[0]}
                          alt={`Evidence preview for ${report.title}`}
                          className={`rounded-lg border border-slate-800 ${isVideoEvidence(report.evidence[0]) ? 'h-20 w-36 object-cover' : 'h-16 w-20 object-cover'}`}
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-slate-500 text-sm">
                No recent reports submitted.
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedReport && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
          onClick={() => {
            setSelectedReport(null);
            setApprovalReview(null);
            setApprovalError('');
            setApprovalMessage('');
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-report-details-title"
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 text-slate-100 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-800 p-5">
              <div>
                <h2 id="admin-report-details-title" className="text-base font-extrabold text-white">
                  Report details
                </h2>
                <p className="mt-1 break-all font-mono text-xs text-slate-400">
                  {selectedReport.reference_number || 'Reference unavailable'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedReport(null);
                  setApprovalReview(null);
                  setApprovalError('');
                  setApprovalMessage('');
                }}
                aria-label="Close report details"
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-5 p-5">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-bold text-white">{selectedReport.title}</h3>
                <span className="rounded-full border border-slate-700 bg-slate-800 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-300">
                  {selectedReport.status?.replaceAll('_', ' ') || 'Unknown'}
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  ['Hazard category', selectedReport.category_name],
                  ['Response station', selectedReport.station_name],
                  ['Location', selectedReport.address_details],
                  ['Submitted', formatReportDate(selectedReport.submitted_at)],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
                    <p className="mt-1 break-words text-sm text-slate-200">{value || 'Not provided'}</p>
                  </div>
                ))}
              </div>

              <div>
                <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Description</h4>
                <p className="whitespace-pre-wrap rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-sm leading-6 text-slate-300">
                  {selectedReport.description || 'No description provided.'}
                </p>
              </div>

              <div>
                <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Photo and video evidence</h4>
                {selectedReport.evidence?.length ? (
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
                            <EvidencePreview
                              evidence={item}
                              alt={`Photo evidence ${index + 1} for ${selectedReport.title}`}
                              className="max-h-96 min-h-40 w-full rounded-xl border border-slate-800 object-contain"
                            />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-sm text-slate-500">
                    No photo or video evidence is attached to this report.
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-800 p-4">
              <button
                type="button"
                onClick={() => {
                  setSelectedReport(null);
                  setApprovalReview(null);
                  setApprovalError('');
                  setApprovalMessage('');
                }}
                className="rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-500"
              >
                Close
              </button>
            </div>

            {approvalError && (
              <div role="alert" className="mx-5 mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                {approvalError}
              </div>
            )}
            {approvalMessage && (
              <div role="status" className="mx-5 mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
                {approvalMessage}
              </div>
            )}

            {selectedReport.status === 'pending' && approvalReview?.loading && (
              <div role="status" className="flex items-center gap-2 border-t border-slate-800 bg-slate-950/60 p-5 text-xs text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
                Loading approval and email details...
              </div>
            )}

            {approvalReview && !approvalReview.loading && selectedReport.status === 'pending' && (
              <section className="border-t border-slate-800 bg-slate-950/60 p-5">
                <div className="flex items-start gap-3">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold text-white">Approval and email review</h3>
                    <p className="mt-1 text-xs text-slate-400">
                      This will set the report status to Verified. Confirm the auto-selected contact before sending.
                    </p>
                  </div>
                </div>

                <label className="mt-4 flex items-center gap-2 text-xs text-slate-200">
                  <input
                    type="checkbox"
                    checked={sendApprovalEmail}
                    onChange={(event) => setSendApprovalEmail(event.target.checked)}
                    className="h-4 w-4 accent-emerald-500"
                  />
                  Send report details to an emergency contact
                </label>

                {sendApprovalEmail && (
                  <>
                    <label htmlFor="approval-recipient" className="mt-4 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      Recipient email
                      {approvalReview.department?.name && (
                        <span className="ml-2 normal-case font-normal text-slate-500">
                          Auto-selected: {approvalReview.department.name}
                        </span>
                      )}
                    </label>
                    <select
                      id="approval-recipient"
                      value={approvalRecipient}
                      onChange={(event) => setApprovalRecipient(event.target.value)}
                      required
                      className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 outline-none focus:border-emerald-500"
                    >
                      <option value="" disabled>
                        {approvalReview.department?.email
                          ? `Recommended: ${approvalReview.department.email}`
                          : 'Select an emergency contact'}
                      </option>
                      {departmentContacts.map((contact) => (
                        <option key={contact.code} value={contact.email}>
                          {contact.code} — {contact.name} ({contact.email})
                        </option>
                      ))}
                    </select>
                  </>
                )}

                <div className="mt-3 rounded-lg border border-slate-800 bg-slate-900 p-3">
                  <p className="text-xs font-semibold text-slate-200">
                    Email content preview
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {approvalReview.report.reference_number} · {approvalReview.report.title}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {approvalReview.report.category_name || 'Uncategorized'} · {approvalReview.report.address_details || 'Location not provided'}
                  </p>
                  <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-[11px] text-slate-400">
                    {approvalReview.report.description || 'No description provided.'}
                  </p>
                  <p className="mt-2 text-[10px] text-slate-500">
                    The email includes reporter, timestamp, coordinates/severity when available, and attached media links.
                  </p>
                </div>

                <div className="mt-4 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={approveSelectedReport}
                    disabled={approvingReport}
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-50"
                  >
                    {approvingReport
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <CheckCircle2 className="h-3.5 w-3.5" />}
                    Approve report
                    {sendApprovalEmail && <Send className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </section>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
