import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronUp,
  Eye,
  Loader2,
  MapPin,
  RefreshCw,
  Send,
  ThumbsDown,
  ThumbsUp,
  X,
} from 'lucide-react';
import { api, publicFileUrl } from '../api/client';
import { ReportPinsMap } from './ReportPinsMap';

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

function isVideo(evidence) {
  return evidence?.evidence_type === 'video' || /\.mp4(?:$|[?#])/i.test(evidence?.file_path || '');
}

function ReportEvidence({ evidence, reportTitle }) {
  if (!Array.isArray(evidence) || evidence.length === 0) {
    return <p className="text-xs text-slate-500">No attached evidence.</p>;
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {evidence.map((item, index) => {
        const url = publicFileUrl(item.file_path);
        if (!url) return null;
        return isVideo(item) ? (
          <video
            key={item.evidence_id || index}
            src={url}
            controls
            playsInline
            className="max-h-44 w-full rounded-lg border border-slate-700 bg-black object-contain"
            aria-label={`Evidence video for ${reportTitle}`}
          />
        ) : (
          <a
            key={item.evidence_id || index}
            href={url}
            target="_blank"
            rel="noreferrer"
            className="block overflow-hidden rounded-lg border border-slate-700"
          >
            <img
              src={url}
              alt={`Evidence ${index + 1} for ${reportTitle}`}
              loading="lazy"
              className="h-36 w-full object-cover transition hover:scale-[1.02]"
            />
          </a>
        );
      })}
    </div>
  );
}

export function AdminHazardReportsMap({
  onReportSelect,
  onReportsChanged,
}) {
  const [expanded, setExpanded] = useState(true);
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [selectedReportId, setSelectedReportId] = useState(null);
  const mapRef = useRef(null);

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.getHazardMap();
      const nextReports = response?.data?.reports;
      if (!Array.isArray(nextReports)) {
        throw new Error('The hazard map returned an invalid report list.');
      }
      setReports(nextReports.filter((report) => (
        String(report.status || '').toLowerCase() !== 'resolved'
      )));
    } catch (requestError) {
      setError(requestError.message || 'Unable to load hazard report pins.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReports();
    const timer = window.setInterval(loadReports, 60000);
    return () => window.clearInterval(timer);
  }, [loadReports]);

  const selectReport = useCallback(async (mapReport) => {
    if (!mapReport?.report_id) return;
    setSelectedReportId(mapReport.report_id);
    onReportSelect?.(mapReport.report_id);
    setSelectedReport(mapReport);
    setLoadingDetails(true);
    setError('');
    try {
      const response = await api.getRecord('hazard_reports', mapReport.report_id);
      const report = response?.data?.notification?.report || response?.data?.record;
      if (!report) throw new Error('Report details were not returned by the API.');
      const evidence = report.media || response?.data?.record?.evidence || [];
      setSelectedReport({
        ...mapReport,
        ...report,
        evidence,
        default_email: response?.data?.notification?.default_email || '',
      });
    } catch (requestError) {
      setError(requestError.message || 'Unable to load hazard report details.');
    } finally {
      setLoadingDetails(false);
    }
  }, [onReportSelect]);

  async function changeStatus(status) {
    const reportId = selectedReport?.report_id;
    if (!reportId) return;
    setActionId(reportId);
    setError('');
    setMessage('');
    try {
      let payload = { status };
      if (['verified', 'approved'].includes(status)) {
        const recipient = selectedReport.default_email ||
          selectedReport.notification_email || '';
        payload = {
          ...payload,
          send_department_email: isValidEmail(recipient),
          department_email: isValidEmail(recipient) ? recipient : '',
        };
      }
      const response = await api.updateRecord('hazard_reports', reportId, payload);
      setMessage(response?.message || 'Hazard report status updated.');
      setSelectedReport((current) => current ? { ...current, status } : current);
      await Promise.all([loadReports(), onReportsChanged?.()]);
    } catch (requestError) {
      setError(requestError.message || 'Unable to update this hazard report.');
    } finally {
      setActionId(null);
    }
  }

  async function resolveReport() {
    const reportId = selectedReport?.report_id;
    if (!reportId) return;
    setActionId(reportId);
    setError('');
    setMessage('');
    try {
      const response = await api.resolveHazardReport(reportId);
      setMessage(response?.message || 'Hazard report marked as resolved.');
      setSelectedReport((current) => current ? { ...current, status: 'resolved' } : current);
      await Promise.all([loadReports(), onReportsChanged?.()]);
    } catch (requestError) {
      setError(requestError.message || 'Unable to resolve this hazard report.');
    } finally {
      setActionId(null);
    }
  }

  const status = String(selectedReport?.status || '').toLowerCase();
  const busy = actionId !== null;

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-4 py-3 sm:px-5">
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((current) => !current)}
          className="flex min-w-0 items-center gap-2 text-left"
        >
          <MapPin className="h-4 w-4 shrink-0 text-orange-400" />
          <span>
            <span className="block text-sm font-bold text-white">Live hazard reports map</span>
            <span className="mt-0.5 block text-[10px] text-slate-400">
              {reports.length} active report pins · Select a pin to review its workflow
            </span>
          </span>
          {expanded
            ? <ChevronUp className="h-4 w-4 text-slate-400" />
            : <ChevronDown className="h-4 w-4 text-slate-400" />}
        </button>
        <button
          type="button"
          onClick={loadReports}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-[10px] font-semibold text-slate-300 transition hover:border-orange-500/40 hover:text-white disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {expanded && (
        <div className="grid gap-0 xl:grid-cols-[minmax(0,1.5fr)_minmax(19rem,0.8fr)]">
          <div className="relative min-w-0">
            <ReportPinsMap
              ref={mapRef}
              reports={reports}
              selectedReportId={selectedReportId}
              onReportSelect={selectReport}
              height="h-[360px] sm:h-[440px]"
            />
            <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-slate-800 bg-slate-950/60 px-4 py-2.5 text-[10px] text-slate-400">
              {[
                ['#f59e0b', 'Pending'],
                ['#10b981', 'Verified / active'],
                ['#f43f5e', 'Rejected / disputed'],
              ].map(([color, label]) => (
                <span key={label} className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full border border-white/70" style={{ backgroundColor: color }} />
                  {label}
                </span>
              ))}
            </div>
            {loading && reports.length === 0 && (
              <div className="absolute inset-0 z-[500] flex items-center justify-center bg-slate-950/50 text-xs text-slate-300">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading report pins…
              </div>
            )}
          </div>
          <aside className="min-w-0 border-t border-slate-800 p-4 xl:border-l xl:border-t-0">
            {error && (
              <div role="alert" className="mb-3 flex items-start gap-2 rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-300">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            {message && (
              <div role="status" className="mb-3 flex items-start justify-between gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-300">
                <span>{message}</span>
                <button type="button" aria-label="Dismiss message" onClick={() => setMessage('')}>
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
            {selectedReport ? (
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-mono text-[10px] font-bold text-orange-300">
                      {selectedReport.reference_number || `Report #${selectedReport.report_id}`}
                    </p>
                    <h3 className="mt-1 break-words text-sm font-bold text-white">
                      {selectedReport.title || 'Hazard report'}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedReport(null)}
                    aria-label="Close selected report details"
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 text-[10px]">
                  <span className="rounded-full border border-slate-700 bg-slate-950 px-2.5 py-1 text-slate-300">
                    {selectedReport.category_name || 'Uncategorized'}
                  </span>
                  <span className={`rounded-full border px-2.5 py-1 capitalize ${
                    status === 'pending'
                      ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                      : status === 'verified' || status === 'approved'
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                        : 'border-rose-500/30 bg-rose-500/10 text-rose-300'
                  }`}>
                    {status.replaceAll('_', ' ') || 'unknown'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1.5 text-[10px] font-semibold text-emerald-300">
                    <ThumbsUp className="h-3.5 w-3.5" />
                    {Number(selectedReport.confirm_count) || 0} confirms
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/25 bg-rose-500/10 px-2.5 py-1.5 text-[10px] font-semibold text-rose-300">
                    <ThumbsDown className="h-3.5 w-3.5" />
                    {Number(selectedReport.dispute_count) || 0} disputes
                  </span>
                </div>
                <p className="text-xs leading-5 text-slate-300">
                  <span className="font-semibold text-slate-400">Location: </span>
                  {selectedReport.address_details || 'Address not provided'}
                </p>
                {loadingDetails ? (
                  <p role="status" className="flex items-center gap-2 text-xs text-slate-500">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading report and evidence…
                  </p>
                ) : (
                  <>
                    <p className="max-h-24 overflow-y-auto whitespace-pre-wrap text-xs leading-5 text-slate-400">
                      {selectedReport.description || 'No description provided.'}
                    </p>
                    <div className="border-t border-slate-800 pt-3">
                      <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Attached evidence
                      </p>
                      <ReportEvidence
                        evidence={selectedReport.evidence || []}
                        reportTitle={selectedReport.title}
                      />
                    </div>
                  </>
                )}
                <div className="flex flex-wrap gap-2 border-t border-slate-800 pt-3">
                  {status === 'pending' && (
                    <>
                      <button
                        type="button"
                        onClick={() => changeStatus('verified')}
                        disabled={busy || loadingDetails}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-[10px] font-bold text-white transition hover:bg-emerald-500 disabled:opacity-50"
                      >
                        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                        Approve (Verify)
                        <Send className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => changeStatus('disputed')}
                        disabled={busy || loadingDetails}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[10px] font-bold text-rose-300 transition hover:bg-rose-500/20 disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {['approved', 'verified', 'assigned', 'in_progress'].includes(status) && (
                    <button
                      type="button"
                      onClick={resolveReport}
                      disabled={busy}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-teal-500/30 bg-teal-500/10 px-3 py-2 text-[10px] font-bold text-teal-300 transition hover:bg-teal-500/20 disabled:opacity-50"
                    >
                      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                      Mark as Resolved
                    </button>
                  )}
                  <a
                    href={`/admin/tables/hazard_reports?report_id=${encodeURIComponent(selectedReport.report_id)}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-2 text-[10px] font-bold text-slate-300 transition hover:border-slate-500 hover:text-white"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Open record
                  </a>
                </div>
              </div>
            ) : (
              <div className="flex h-full min-h-40 flex-col items-center justify-center text-center">
                <MapPin className="h-7 w-7 text-slate-600" />
                <p className="mt-2 text-xs font-semibold text-slate-300">Select a hazard pin</p>
                <p className="mt-1 max-w-xs text-[10px] leading-4 text-slate-500">
                  Review its report details and apply the next status action without leaving this page.
                </p>
              </div>
            )}
          </aside>
        </div>
      )}
    </section>
  );
}
