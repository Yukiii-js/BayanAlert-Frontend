import React, { useEffect, useState } from 'react';
import { FileText, Loader2, CalendarDays, ExternalLink, MapPin } from 'lucide-react';
import { api } from '../api/client';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

function localDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function PdfReports() {
  const today = localDateString(new Date());
  const [startDate, setStartDate] = useState(`${today.slice(0, 7)}-01`);
  const [endDate, setEndDate] = useState(today);
  const [reportType, setReportType] = useState('hazards');
  const [barangayId, setBarangayId] = useState('');
  const [barangays, setBarangays] = useState([]);
  const [loadingBarangays, setLoadingBarangays] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (reportType !== 'barangays') return undefined;

    let active = true;
    setLoadingBarangays(true);
    api.getBarangays()
      .then((response) => {
        const options = response?.data?.barangays;
        if (!Array.isArray(options)) {
          throw new Error('The barangay list response was invalid.');
        }
        if (active) setBarangays(options);
      })
      .catch((requestError) => {
        if (active) {
          setBarangays([]);
          setError(requestError.message || 'Unable to load barangays.');
        }
      })
      .finally(() => {
        if (active) setLoadingBarangays(false);
      });

    return () => {
      active = false;
    };
  }, [reportType]);

  const generateReport = async (event) => {
    event.preventDefault();
    setError('');

    if (startDate > endDate) {
      setError('The start date must be on or before the end date.');
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
      });
      if (reportType === 'barangays' && barangayId) {
        query.set('barangay_id', barangayId);
      }
      const response = await fetch(
        `${API_BASE_URL}/admin/reports?${query.toString()}`,
        {
          headers: {
            Accept: 'application/pdf',
            Authorization: `Bearer ${token}`,
          },
        }
      );

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

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <h1 className="flex items-center gap-3 text-2xl font-bold tracking-tight text-white">
          <FileText className="h-6 w-6 text-emerald-400" />
          PDF Reports
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Generate branded hazard or barangay activity reports for a selected reporting period.
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
              {reportType === 'barangays'
                ? 'Includes resident totals, hazard status summaries, and report history by registered barangay.'
                : 'Choose the reporting period. The generated PDF opens in a new browser tab.'}
            </p>
          </div>
        </div>

        <form onSubmit={generateReport} className="space-y-5">
          <label htmlFor="report-type" className="block space-y-2 text-sm font-medium text-slate-300">
            Report type
            <select
              id="report-type"
              value={reportType}
              onChange={(event) => {
                setReportType(event.target.value);
                setBarangayId('');
                setError('');
              }}
              className="block w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="hazards">Community Hazard Verification</option>
              <option value="barangays">Barangay Activity and Hazard History</option>
            </select>
          </label>

          {reportType === 'barangays' && (
            <label htmlFor="barangay-filter" className="block space-y-2 text-sm font-medium text-slate-300">
              Barangay
              <select
                id="barangay-filter"
                value={barangayId}
                onChange={(event) => setBarangayId(event.target.value)}
                disabled={loadingBarangays || barangays.length === 0}
                className="block w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-60"
              >
                <option value="">
                  {loadingBarangays ? 'Loading barangays...' : 'All active barangays'}
                </option>
                {barangays.map((barangay) => (
                  <option key={barangay.barangay_id} value={barangay.barangay_id}>
                    {barangay.barangay_name}
                  </option>
                ))}
              </select>
            </label>
          )}

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

          {error && (
            <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={generating}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-900/30 transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {generating
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <ExternalLink className="h-4 w-4" />}
            {generating
              ? 'Generating report...'
              : `Generate and preview ${reportType === 'barangays' ? 'barangay' : 'hazard'} PDF`}
          </button>
        </form>
      </section>
    </div>
  );
}
