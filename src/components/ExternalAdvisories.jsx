import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Clock3,
  ExternalLink,
  MapPin,
  Radio,
  RefreshCw,
  Waves,
} from 'lucide-react';
import { api } from '../api/client';

const SOURCES = [
  { id: 'usgs', label: 'Earthquakes', source: 'USGS', icon: Activity },
  { id: 'gdacs', label: 'Multi-hazard alerts', source: 'GDACS', icon: Radio },
];

const SEVERITY_STYLES = {
  red: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
  orange: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  green: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
};

function formatDate(value) {
  if (!value) return 'Time unavailable';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Time unavailable'
    : date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function eventSeverity(event) {
  const level = String(event.severity_level || event.alert_level || 'green').toLowerCase();
  if (level.includes('red')) return 'red';
  if (level.includes('orange') || level.includes('yellow')) return 'orange';
  return 'green';
}

function eventLocation(event) {
  const latitude = Number(event.latitude);
  const longitude = Number(event.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || (!latitude && !longitude)) {
    return null;
  }
  return `${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°`;
}

function ProviderStatus({ provider }) {
  const status = String(provider?.status || 'unknown').toLowerCase();
  const isOnline = status === 'online' || status === 'success';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider ${
      isOnline
        ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
        : 'border-amber-500/20 bg-amber-500/10 text-amber-300'
    }`}>
      <span className={`h-1.5 w-1.5 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-amber-300'}`} />
      {isOnline ? 'Feed connected' : 'Feed unavailable'}
    </span>
  );
}

function EventCard({ event, source }) {
  const severity = eventSeverity(event);
  const magnitude = Number(event.magnitude_or_score);
  const distance = Number(event.distance_to_municipality_km);
  const location = eventLocation(event);
  const isEarthquake = source === 'USGS';

  return (
    <article className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 transition hover:border-slate-700 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-md border px-2 py-1 text-[9px] font-extrabold uppercase tracking-wider ${
              isEarthquake
                ? 'border-sky-400/20 bg-sky-400/10 text-sky-300'
                : 'border-violet-400/20 bg-violet-400/10 text-violet-300'
            }`}>
              {source}
            </span>
            <span className={`rounded-md border px-2 py-1 text-[9px] font-bold uppercase tracking-wider ${SEVERITY_STYLES[severity]}`}>
              {isEarthquake ? `Magnitude ${Number.isFinite(magnitude) ? magnitude.toFixed(1) : '—'}` : `${event.alert_level || severity} alert`}
            </span>
            {event.hazard_type && (
              <span className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[9px] font-bold text-slate-300">
                {event.hazard_type}
              </span>
            )}
          </div>
          <h3 className="mt-3 break-words text-sm font-bold leading-5 text-white sm:text-base">
            {event.title || 'Regional hazard event'}
          </h3>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[10px] text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <Clock3 className="h-3.5 w-3.5 text-slate-500" />
              {formatDate(event.event_timestamp)}
            </span>
            {Number.isFinite(distance) && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-slate-500" />
                {distance.toFixed(1)} km from Calapan
              </span>
            )}
            {location && <span>{location}</span>}
          </div>
        </div>
        {event.event_url && (
          <a
            href={event.event_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-lg border border-slate-700 px-3 py-2 text-[10px] font-semibold text-slate-300 transition hover:border-emerald-500/40 hover:text-emerald-300"
          >
            Source details <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-lg border border-slate-800/80 bg-slate-900/70 p-3">
          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">{isEarthquake ? 'Magnitude' : 'Alert level'}</p>
          <p className={`mt-1 text-sm font-extrabold ${severity === 'red' ? 'text-rose-300' : severity === 'orange' ? 'text-amber-300' : 'text-emerald-300'}`}>
            {isEarthquake ? (Number.isFinite(magnitude) ? magnitude.toFixed(1) : '—') : (event.alert_level || 'Green')}
          </p>
        </div>
        {isEarthquake ? (
          <div className="rounded-lg border border-slate-800/80 bg-slate-900/70 p-3">
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Depth</p>
            <p className="mt-1 text-sm font-extrabold text-sky-200">
              {Number.isFinite(Number(event.depth_km)) ? `${Number(event.depth_km).toFixed(1)} km` : '—'}
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-slate-800/80 bg-slate-900/70 p-3">
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Hazard type</p>
            <p className="mt-1 text-sm font-extrabold text-violet-200">{event.hazard_type || 'Alert'}</p>
          </div>
        )}
        <div className="rounded-lg border border-slate-800/80 bg-slate-900/70 p-3">
          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Distance</p>
          <p className="mt-1 text-sm font-extrabold text-slate-100">{Number.isFinite(distance) ? `${distance.toFixed(1)} km` : '—'}</p>
        </div>
        <div className="rounded-lg border border-slate-800/80 bg-slate-900/70 p-3">
          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">{isEarthquake ? 'Tsunami status' : 'Est. affected'}</p>
          <p className="mt-1 text-sm font-extrabold text-slate-100">
            {isEarthquake
              ? (event.tsunami ? 'Possible' : 'Not indicated')
              : (Number(event.affected_population) > 0 ? Number(event.affected_population).toLocaleString() : 'Not reported')}
          </p>
        </div>
      </div>
    </article>
  );
}

export function ExternalAdvisories() {
  const [feed, setFeed] = useState(null);
  const [activeSource, setActiveSource] = useState('usgs');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  async function loadFeed(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const response = await api.getExternalResidentFeed();
      const data = response?.data;
      if (!data || !Array.isArray(data.events) || !data.providers) {
        throw new Error('The regional advisory feed returned an invalid response.');
      }
      setFeed(data);
      setLastUpdated(new Date());
      setError('');
    } catch (requestError) {
      setError(requestError.message || 'Regional advisories are temporarily unavailable.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadFeed();
    const timer = window.setInterval(() => loadFeed(true), 5 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  const source = SOURCES.find((item) => item.id === activeSource) || SOURCES[0];
  const provider = feed?.providers?.[source.id];
  const events = useMemo(
    () => (feed?.events || [])
      .filter((event) => String(event.source || '').toLowerCase() === activeSource)
      .filter((event) => [1, '1', true].includes(event.is_published_to_residents)),
    [feed, activeSource]
  );
  const alertCount = useMemo(
    () => (feed?.events || []).filter((event) => [1, '1', true].includes(event.is_published_to_residents)).length,
    [feed]
  );
  const Icon = source.icon;

  return (
    <section id="regional-advisories" className="scroll-mt-28 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 shadow-lg shadow-black/10">
      <div className="border-b border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900/90 to-sky-950/30 p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-sky-400/20 bg-sky-400/10 text-sky-300">
              <Waves className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-sky-300">Regional intelligence</p>
              <h2 className="mt-1 text-lg font-extrabold text-white sm:text-xl">Official hazard advisories</h2>
              <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-400">
                Earthquake observations and regional multi-hazard alerts relevant to Oriental Mindoro.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:justify-end">
            {lastUpdated && <span className="text-[10px] text-slate-500">Updated {lastUpdated.toLocaleTimeString()}</span>}
            <button
              type="button"
              onClick={() => loadFeed(true)}
              disabled={refreshing}
              className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-[10px] font-semibold text-slate-300 transition hover:border-sky-400/40 hover:text-white disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {SOURCES.map((item) => {
            const ItemIcon = item.icon;
            const count = (feed?.events || []).filter((event) => (
              String(event.source || '').toLowerCase() === item.id &&
              [1, '1', true].includes(event.is_published_to_residents)
            )).length;
            const itemProvider = feed?.providers?.[item.id];
            const selected = activeSource === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveSource(item.id)}
                aria-pressed={selected}
                className={`flex min-w-0 items-center justify-between gap-3 rounded-xl border p-3 text-left transition sm:p-4 ${
                  selected
                    ? 'border-sky-400/30 bg-sky-400/10 shadow-lg shadow-sky-950/20'
                    : 'border-slate-800 bg-slate-950/50 hover:border-slate-700'
                }`}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${selected ? 'bg-sky-400/10 text-sky-300' : 'bg-slate-800 text-slate-400'}`}>
                    <ItemIcon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-bold text-white">{item.label}</span>
                    <span className="mt-1 block"><ProviderStatus provider={itemProvider} /></span>
                  </span>
                </span>
                <span className={`shrink-0 text-xl font-extrabold ${selected ? 'text-sky-200' : 'text-slate-300'}`}>{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-4 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-bold text-white">
              <Icon className="h-4 w-4 text-sky-300" />
              {source.source} {activeSource === 'usgs' ? 'earthquake feed' : 'multi-hazard feed'}
            </h3>
            <p className="mt-1 text-[10px] text-slate-500">
              {activeSource === 'usgs'
                ? 'Recent earthquakes within the regional search radius, ordered by observation time.'
                : 'Regional alerts with severity, hazard type, distance, and reported impact where available.'}
            </p>
          </div>
          {provider && <ProviderStatus provider={provider} />}
        </div>

        {error && (
          <div role="alert" className="mb-4 flex items-start gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" />
            <span>{error}</span>
          </div>
        )}

        {provider?.status === 'error' && !loading && (
          <div role="status" className="mb-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs leading-5 text-amber-200">
            {provider.message || 'This provider could not be reached. The list below is not current.'}
          </div>
        )}

        {loading ? (
          <div className="flex min-h-40 items-center justify-center gap-2 text-xs text-slate-400">
            <RefreshCw className="h-4 w-4 animate-spin text-sky-300" />
            Loading official advisories…
          </div>
        ) : events.length ? (
          <div className="space-y-3">
            {events.map((event) => (
              <EventCard key={event.id || `${event.source}-${event.event_timestamp}-${event.title}`} event={event} source={source.source} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-800 bg-slate-950/40 px-4 py-10 text-center">
            <Icon className="mx-auto h-7 w-7 text-slate-600" />
            <p className="mt-3 text-sm font-semibold text-slate-300">
              {provider?.status === 'error' ? 'Advisories unavailable' : `No published ${source.source} advisories`}
            </p>
            <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-500">
              {provider?.status === 'error'
                ? 'Try refreshing later. Provider outages are shown as unavailable rather than replaced with sample events.'
                : 'No qualifying events are currently available for the selected feed.'}
            </p>
            {provider?.status === 'error' && (
              <button
                type="button"
                onClick={() => loadFeed(true)}
                disabled={refreshing}
                className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 hover:border-sky-400/40 hover:text-white disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                Retry feed
              </button>
            )}
          </div>
        )}

        <div className="mt-4 flex items-start gap-2 border-t border-slate-800 pt-4 text-[10px] leading-5 text-slate-500">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300/70" />
          <p>
            External advisories are informational and may be delayed or revised by the source. Follow official local instructions during emergencies.
            {alertCount > 0 && ` ${alertCount} published regional ${alertCount === 1 ? 'advisory is' : 'advisories are'} shown across these feeds.`}
          </p>
        </div>
      </div>
    </section>
  );
}
