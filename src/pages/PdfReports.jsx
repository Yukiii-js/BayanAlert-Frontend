import React, { useEffect, useState } from 'react';
import {
  CalendarDays,
  CheckSquare,
  ExternalLink,
  FileText,
  Loader2,
  MapPin,
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
const HAZARD_SECTIONS = [
  { value: 'summary', label: 'Summary statistics' },
  { value: 'records', label: 'Hazard report table' },
];
const BARANGAY_SECTIONS = [
  { value: 'overview', label: 'Barangay overview' },
  { value: 'history', label: 'Hazard report history' },
];
const HAZARD_COLUMNS = [
  { value: 'hazard_type', label: 'Category' },
  { value: 'location', label: 'Location' },
  { value: 'severity', label: 'Severity' },
  { value: 'status', label: 'Status' },
  { value: 'date_reported', label: 'Date reported' },
  { value: 'reporter_name', label: 'Reporter name' },
  { value: 'reporter_contact', label: 'Reporter contact (email/phone)' },
  { value: 'coordinates', label: 'Exact coordinates' },
  { value: 'resolution_notes', label: 'Resolution notes' },
  { value: 'resolution_timestamp', label: 'Resolution timestamp' },
  { value: 'admin_remarks', label: 'Admin remarks' },
];
const DEFAULT_HAZARD_COLUMNS = HAZARD_COLUMNS.slice(0, 5).map(({ value }) => value);
const BARANGAY_COLUMNS = [
  { value: 'barangay_name', label: 'Barangay' },
  ...HAZARD_COLUMNS,
];
const STATUS_OPTIONS = ['pending', 'approved', 'verified', 'assigned', 'in_progress', 'resolved', 'rejected'];

function localDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function initialFilters() {
  return {
    statuses: [],
    categoryId: '',
    severities: [],
    barangayId: '',
  };
}

export function PdfReports() {
  const today = localDateString(new Date());
  const [startDate, setStartDate] = useState(`${today.slice(0, 7)}-01`);
  const [endDate, setEndDate] = useState(today);
  const [reportType, setReportType] = useState('hazards');
  const [filters, setFilters] = useState(initialFilters);
  const [sections, setSections] = useState(HAZARD_SECTIONS.map(({ value }) => value));
  const [columns, setColumns] = useState(DEFAULT_HAZARD_COLUMNS);
  const [options, setOptions] = useState({ categories: [], barangays: [], severities: [], statuses: [] });
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const sectionOptions = reportType === 'barangays' ? BARANGAY_SECTIONS : HAZARD_SECTIONS;
  const columnOptions = reportType === 'barangays' ? BARANGAY_COLUMNS : HAZARD_COLUMNS;
  const selectedSections = sections;
  const selectedColumns = columns;

  useEffect(() => {
    let active = true;
    const loadOptions = async () => {
      try {
        const token = localStorage.getItem('bayanalert_token');
        const response = await fetch(`${API_BASE_URL}/admin/reports/options`, {
          headers: {
            Accept: 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.message || 'Unable to load report filters.');
        if (active) {
          setOptions({
            categories: Array.isArray(payload?.data?.categories) ? payload.data.categories : [],
            barangays: Array.isArray(payload?.data?.barangays) ? payload.data.barangays : [],
            severities: Array.isArray(payload?.data?.severities) ? payload.data.severities : [],
            statuses: Array.isArray(payload?.data?.statuses) ? payload.data.statuses : [],
          });
        }
      } catch (requestError) {
        if (active) setError(requestError.message || 'Unable to load report filters.');
      } finally {
        if (active) setLoadingOptions(false);
      }
    };
    loadOptions();
    return () => {
      active = false;
    };
  }, []);

  const setFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }));

  const applyReportPreset = (preset) => {
    const now = new Date();
    const todayDate = localDateString(now);
    const allHistoryStart = '1900-01-01';
    const thisMonthStart = `${todayDate.slice(0, 7)}-01`;
    const presets = {
      executive: {
        type: 'hazards',
        start: allHistoryStart,
        statuses: ['pending', 'approved', 'verified', 'assigned', 'in_progress', 'resolved'],
        severities: [],
        sections: ['summary', 'records'],
        columns: DEFAULT_HAZARD_COLUMNS,
      },
      barangays: {
        type: 'barangays',
        start: thisMonthStart,
        statuses: [],
        severities: [],
        sections: ['overview', 'history'],
        columns: ['barangay_name', ...DEFAULT_HAZARD_COLUMNS],
      },
      resolved: {
        type: 'hazards',
        start: allHistoryStart,
        statuses: ['resolved'],
        severities: [],
        sections: ['summary', 'records'],
        columns: HAZARD_COLUMNS.map(({ value }) => value),
      },
      critical: {
        type: 'hazards',
        start: allHistoryStart,
        statuses: ['verified'],
        severities: ['high', 'critical'],
        sections: ['summary', 'records'],
        columns: ['hazard_type', 'location', 'severity', 'status', 'date_reported', 'coordinates'],
      },
    };
    const selected = presets[preset];
    if (!selected) return;

    setReportType(selected.type);
    setStartDate(selected.start);
    setEndDate(todayDate);
    setFilters({
      statuses: selected.statuses,
      categoryId: '',
      severities: selected.severities,
      barangayId: '',
    });
    setSections(selected.sections);
    setColumns(selected.columns);
    setError('');
  };

  const toggleFilterValue = (key, value) => {
    setFilters((current) => ({
      ...current,
      [key]: current[key].includes(value)
        ? current[key].filter((item) => item !== value)
        : [...current[key], value],
    }));
  };

  const applyPreset = (preset) => {
    const now = new Date();
    const end = localDateString(now);
    let start = '1900-01-01';
    if (preset === '7days' || preset === '30days') {
      const days = preset === '7days' ? 6 : 29;
      const beginning = new Date(now);
      beginning.setDate(now.getDate() - days);
      start = localDateString(beginning);
    } else if (preset === 'month') {
      start = `${end.slice(0, 7)}-01`;
    }
    setStartDate(start);
    setEndDate(end);
    setError('');
  };

  const toggleSelection = (value, current, setCurrent) => {
    setCurrent(current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value]);
  };

  const generateReport = async (event) => {
    event.preventDefault();
    setError('');

    if (startDate > endDate) {
      setError('The start date must be on or before the end date.');
      return;
    }
    if (selectedSections.length === 0) {
      setError('Select at least one PDF section.');
      return;
    }
    if (selectedSections.includes('records') && selectedColumns.length === 0) {
      setError('Select at least one table column.');
      return;
    }
    if (selectedSections.includes('history') && selectedColumns.length === 0) {
      setError('Select at least one table column.');
      return;
    }

    const previewWindow = window.open('', '_blank');
    if (!previewWindow) {
      setError('Allow pop-ups for this site to preview the PDF report.');
      return;
    }

    setGenerating(true);
    try {
      const token = localStorage.getItem('bayanalert_token');
      if (!token) {
        throw new Error('Your admin session has expired. Sign in again to generate a report.');
      }

      const query = new URLSearchParams({
        type: reportType,
        start_date: startDate,
        end_date: endDate,
        sections: selectedSections.join(','),
        columns: selectedColumns.join(','),
      });
      if (filters.statuses.length) query.set('statuses', filters.statuses.join(','));
      if (filters.categoryId) query.set('category_id', filters.categoryId);
      if (filters.severities.length) query.set('severities', filters.severities.join(','));
      if (filters.barangayId) query.set('barangay_id', filters.barangayId);

      const response = await fetch(`${API_BASE_URL}/admin/reports?${query.toString()}`, {
        headers: {
          Accept: 'application/pdf',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const contentType = response.headers.get('content-type') || '';
        const message = contentType.includes('application/json')
          ? (await response.json()).message
          : await response.text();
        throw new Error(message || `Report generation failed (${response.status}).`);
      }

      const pdfData = await response.arrayBuffer();
      const signature = new TextDecoder().decode(pdfData.slice(0, 5));
      if (signature !== '%PDF-') {
        const contentType = response.headers.get('content-type') || 'unknown content type';
        const body = new TextDecoder().decode(pdfData.slice(0, 500)).trim();
        let responseMessage = '';
        try {
          const payload = JSON.parse(body);
          responseMessage = payload.message || payload.error || '';
        } catch {
          const title = body.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
          responseMessage = title
            ? title.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
            : '';
        }
        throw new Error(
          responseMessage
            || `The server returned ${contentType} instead of a PDF (HTTP ${response.status}). Check the backend logs and PDF report endpoint.`
        );
      }

      const pdf = new Blob([pdfData], { type: 'application/pdf' });
      const pdfUrl = URL.createObjectURL(pdf);
      previewWindow.addEventListener('load', () => URL.revokeObjectURL(pdfUrl), { once: true });
      previewWindow.location.replace(pdfUrl);
    } catch (requestError) {
      previewWindow.close();
      setError(requestError.message || 'Unable to generate the PDF report.');
    } finally {
      setGenerating(false);
    }
  };

  const filtersDisabled = loadingOptions;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <h1 className="flex items-center gap-3 text-2xl font-bold tracking-tight text-white">
          <FileText className="h-6 w-6 text-emerald-400" />
          PDF Reports
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Filter hazard reports, choose what to include, and preview the resulting PDF. Resolved and historical reports remain available.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl">
        <div className="mb-6 flex items-start gap-3">
          <div className="rounded-xl bg-emerald-500/10 p-2.5 text-emerald-400">
            {reportType === 'barangays'
              ? <MapPin className="h-5 w-5" />
              : <CalendarDays className="h-5 w-5" />}
          </div>
          <div>
            <h2 className="font-semibold text-white">
              {reportType === 'barangays' ? 'Barangay activity report' : 'Community hazard report'}
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Filters apply to reports submitted during the selected period, including resolved and rejected reports.
            </p>
          </div>
        </div>

        <form onSubmit={generateReport} className="space-y-6">
          <label htmlFor="report-type" className="block space-y-2 text-sm font-medium text-slate-300">
            Report type
            <select
              id="report-type"
              value={reportType}
              onChange={(event) => {
                const nextType = event.target.value;
                const nextSections = nextType === 'barangays' ? BARANGAY_SECTIONS : HAZARD_SECTIONS;
                const nextColumns = nextType === 'barangays'
                  ? ['barangay_name', ...DEFAULT_HAZARD_COLUMNS]
                  : DEFAULT_HAZARD_COLUMNS;
                setReportType(nextType);
                setSections(nextSections.map(({ value }) => value));
                setColumns(nextColumns.map(({ value }) => value));
                setError('');
              }}
              className="block w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="hazards">Community Hazard Verification</option>
              <option value="barangays">Barangay Activity and Hazard History</option>
            </select>
          </label>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-200">One-click report presets</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ['executive', 'Executive Summary', 'All active and resolved incidents across all history.'],
                ['barangays', 'Weekly/Monthly Breakdown by Barangay', 'Barangay overview and report history; defaults to this month.'],
                ['resolved', 'Resolved Incidents & Response Audit', 'All resolved incidents with response, resolution, and admin audit columns.'],
                ['critical', 'High-Severity/Verified Critical Alerts Only', 'Verified alerts with high or critical severity.'],
              ].map(([value, label, description]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => applyReportPreset(value)}
                  className="rounded-xl border border-slate-700 bg-slate-950 p-3 text-left transition hover:border-emerald-500"
                >
                  <span className="block text-sm font-semibold text-slate-100">{label}</span>
                  <span className="mt-1 block text-xs text-slate-400">{description}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
              <CalendarDays className="h-4 w-4 text-emerald-400" />
              Quick date presets
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                ['7days', 'Last 7 days'],
                ['30days', 'Last 30 days'],
                ['month', 'This month'],
                ['all', 'All history'],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => applyPreset(value)}
                  className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-emerald-500 hover:text-white"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm font-medium text-slate-300">
              Start date
              <input
                type="date"
                required
                max={endDate}
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="block w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-300">
              End date
              <input
                type="date"
                required
                min={startDate}
                max={today}
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className="block w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <fieldset disabled={filtersDisabled} className="space-y-2 text-sm text-slate-300 disabled:opacity-60">
              <legend className="mb-2 font-medium">Status (select any)</legend>
              <div className="max-h-36 space-y-2 overflow-y-auto rounded-xl border border-slate-700 bg-slate-950 p-3">
                {[...new Set([...STATUS_OPTIONS, ...options.statuses])].map((status) => (
                  <label key={status} className="flex items-center gap-2 capitalize">
                    <input
                      type="checkbox"
                      checked={filters.statuses.includes(status)}
                      onChange={() => toggleFilterValue('statuses', status)}
                      className="h-4 w-4 rounded border-slate-600 bg-slate-950 text-emerald-500 focus:ring-emerald-500"
                    />
                    {status.replaceAll('_', ' ')}
                  </label>
                ))}
                <button
                  type="button"
                  onClick={() => setFilter('statuses', [])}
                  className="text-xs text-emerald-400 hover:text-emerald-300"
                >
                  All statuses
                </button>
              </div>
            </fieldset>
            <label className="space-y-2 text-sm font-medium text-slate-300">
              Category
              <select
                value={filters.categoryId}
                onChange={(event) => setFilter('categoryId', event.target.value)}
                disabled={filtersDisabled}
                className="block w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white outline-none focus:border-emerald-500 disabled:opacity-60"
              >
                <option value="">All categories</option>
                {options.categories.map((category) => (
                  <option key={category.category_id} value={category.category_id}>{category.category_name}</option>
                ))}
              </select>
            </label>
            <fieldset disabled={filtersDisabled} className="space-y-2 text-sm text-slate-300 disabled:opacity-60">
              <legend className="mb-2 font-medium">Severity (select any)</legend>
              <div className="max-h-36 space-y-2 overflow-y-auto rounded-xl border border-slate-700 bg-slate-950 p-3">
                {options.severities.map((severity) => (
                  <label key={severity} className="flex items-center gap-2 capitalize">
                    <input
                      type="checkbox"
                      checked={filters.severities.includes(String(severity))}
                      onChange={() => toggleFilterValue('severities', String(severity))}
                      className="h-4 w-4 rounded border-slate-600 bg-slate-950 text-emerald-500 focus:ring-emerald-500"
                    />
                    {String(severity).replaceAll('_', ' ')}
                  </label>
                ))}
                <button
                  type="button"
                  onClick={() => setFilter('severities', [])}
                  className="text-xs text-emerald-400 hover:text-emerald-300"
                >
                  All severities
                </button>
              </div>
            </fieldset>
            <label className="space-y-2 text-sm font-medium text-slate-300">
              Barangay
              <select
                value={filters.barangayId}
                onChange={(event) => setFilter('barangayId', event.target.value)}
                disabled={filtersDisabled}
                className="block w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white outline-none focus:border-emerald-500 disabled:opacity-60"
              >
                <option value="">All barangays</option>
                {options.barangays.map((barangay) => (
                  <option key={barangay.barangay_id} value={barangay.barangay_id}>{barangay.barangay_name}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <fieldset className="space-y-3">
              <legend className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-200">
                <CheckSquare className="h-4 w-4 text-emerald-400" />
                PDF sections
              </legend>
              {sectionOptions.map(({ value, label }) => (
                <label key={value} className="flex items-center gap-2 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={sections.includes(value)}
                    onChange={() => toggleSelection(value, sections, setSections)}
                    className="h-4 w-4 rounded border-slate-600 bg-slate-950 text-emerald-500 focus:ring-emerald-500"
                  />
                  {label}
                </label>
              ))}
            </fieldset>
            {selectedSections.includes(reportType === 'barangays' ? 'history' : 'records') && (
              <fieldset className="space-y-3">
                <legend className="mb-3 text-sm font-semibold text-slate-200">
                  {reportType === 'barangays' ? 'History table columns' : 'Report table columns'}
                </legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {columnOptions.map(({ value, label }) => (
                    <label key={value} className="flex items-center gap-2 text-sm text-slate-300">
                      <input
                        type="checkbox"
                        checked={columns.includes(value)}
                        onChange={() => toggleSelection(value, columns, setColumns)}
                        className="h-4 w-4 rounded border-slate-600 bg-slate-950 text-emerald-500 focus:ring-emerald-500"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
          </div>

          {error && (
            <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={generating || loadingOptions}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-900/30 transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {generating || loadingOptions
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <ExternalLink className="h-4 w-4" />}
            {generating ? 'Generating report...' : loadingOptions ? 'Loading filters...' : 'Generate and preview PDF'}
          </button>
        </form>
      </section>
    </div>
  );
}
