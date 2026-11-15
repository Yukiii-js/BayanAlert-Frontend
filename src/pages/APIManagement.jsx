import React, { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Cloud,
  Database,
  Mail,
  RefreshCw,
  Shield,
  ToggleLeft,
} from 'lucide-react';
import { api } from '../api/client';

const API_CATALOG = [
  { key: 'weatherapi', name: 'WeatherAPI', description: 'Current conditions and forecast for Calapan.', icon: Cloud },
  { key: 'usgs', name: 'USGS Earthquake API', description: 'Recent seismic activity near Oriental Mindoro.', icon: Activity },
  { key: 'gdacs', name: 'GDACS', description: 'Global disaster alerts filtered for the Philippines and nearby region.', icon: Shield },
  { key: 'typhoon', name: 'Typhoon / Tropical Cyclone Feed', description: 'Tropical cyclone advisories from the GDACS event feed.', icon: Cloud },
  { key: 'hdx', name: 'UN OCHA HDX', description: 'Dataset metadata connection; the clipped Calapan boundaries are bundled with the frontend.', icon: Database },
  { key: 'nasa_eonet', name: 'NASA EONET / Open-Meteo', description: 'Open environmental events and weather data.', icon: Activity },
  { key: 'brevo', name: 'Brevo Email API', description: 'Transactional email delivery for verification and alerts.', icon: Mail },
];

function statusLabel(status, enabled) {
  if (!enabled) return 'Disabled';
  const value = String(status || '').toLowerCase();
  if (['online', 'success', 'active'].includes(value)) return 'Active';
  if (['error', 'offline'].includes(value)) return 'Error';
  return 'Not tested';
}

function statusStyle(label) {
  if (label === 'Active') return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300';
  if (label === 'Error') return 'border-rose-500/20 bg-rose-500/10 text-rose-300';
  if (label === 'Disabled') return 'border-slate-700 bg-slate-800 text-slate-400';
  return 'border-amber-500/20 bg-amber-500/10 text-amber-300';
}

function formatSyncedAt(value) {
  if (!value) return 'Never';
  const date = new Date(String(value).replace(' ', 'T'));
  return Number.isNaN(date.getTime()) ? 'Unknown' : date.toLocaleString();
}

function apiMapFromResponse(response) {
  const body = response?.data || {};
  const values = body.apis || body.health || {};
  return Object.fromEntries(
    Object.entries(values).map(([key, config]) => [
      key,
      {
        ...config,
        is_enabled: config.is_enabled === 0 || config.is_enabled === '0' || config.is_enabled === false
          ? false
          : true,
      },
    ])
  );
}

export function APIManagement() {
  const [apis, setApis] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [rowErrors, setRowErrors] = useState({});
  const [busyKey, setBusyKey] = useState('');
  const [message, setMessage] = useState('');

  const loadApis = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const response = await api.getExternalApiHealth();
      setApis(apiMapFromResponse(response));
    } catch (error) {
      setLoadError(error.message || 'Unable to load external API status.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadApis();
  }, [loadApis]);

  async function toggleApi(key, isEnabled) {
    setBusyKey(key);
    setMessage('');
    setRowErrors((current) => ({ ...current, [key]: '' }));
    try {
      const response = await api.updateExternalApi(key, { is_enabled: isEnabled });
      const updated = response?.data;
      setApis((current) => ({
        ...current,
        [key]: {
          ...current[key],
          ...(updated || {}),
          is_enabled: updated?.is_enabled === undefined ? isEnabled : Boolean(Number(updated.is_enabled)),
        },
      }));
      setMessage(`${API_CATALOG.find((item) => item.key === key)?.name || key} ${isEnabled ? 'enabled' : 'disabled'}.`);
    } catch (error) {
      setRowErrors((current) => ({ ...current, [key]: error.message || 'Unable to update this API.' }));
    } finally {
      setBusyKey('');
    }
  }

  async function syncApi(key) {
    setBusyKey(key);
    setMessage('');
    setRowErrors((current) => ({ ...current, [key]: '' }));
    try {
      const response = await api.syncExternalApi(key);
      setMessage(response?.message || `${API_CATALOG.find((item) => item.key === key)?.name || key} connection tested.`);
      await loadApis();
    } catch (error) {
      setRowErrors((current) => ({ ...current, [key]: error.message || 'Connection test failed.' }));
      await loadApis();
    } finally {
      setBusyKey('');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-slate-800 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-orange-300">System integrations</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">API Management</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Check feed health, control which integrations are active, and test provider connections.
          </p>
        </div>
        <button
          type="button"
          onClick={loadApis}
          disabled={loading}
          className="inline-flex items-center gap-2 self-start rounded-xl border border-slate-700 px-3 py-2.5 text-xs font-semibold text-slate-300 transition hover:border-orange-400/40 hover:text-white disabled:opacity-50 sm:self-auto"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh status
        </button>
      </div>

      {message && (
        <div role="status" className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-200">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {message}
        </div>
      )}
      {loadError && (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-xs text-rose-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{loadError}</span>
        </div>
      )}

      {loading ? (
        <div role="status" className="flex min-h-48 items-center justify-center gap-2 text-sm text-slate-400">
          <RefreshCw className="h-4 w-4 animate-spin text-orange-300" />
          Loading API health…
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {API_CATALOG.map(({ key, name, description, icon: Icon }) => {
            const config = apis[key] || {};
            const enabled = config.is_enabled !== false;
            const label = statusLabel(config.status || config.last_status, enabled);
            const rowBusy = busyKey === key;
            return (
              <article key={key} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-lg shadow-black/10">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-orange-500/15 bg-orange-500/10 text-orange-300">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <h2 className="text-sm font-bold text-white">{name}</h2>
                      <p className="mt-1 text-xs leading-5 text-slate-400">{description}</p>
                    </div>
                  </div>
                  <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider ${statusStyle(label)}`}>
                    {label}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Last synced</p>
                    <p className="mt-1 text-xs text-slate-300">{formatSyncedAt(config.last_synced_at)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={enabled}
                      aria-label={`${enabled ? 'Disable' : 'Enable'} ${name}`}
                      disabled={rowBusy}
                      onClick={() => toggleApi(key, !enabled)}
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[10px] font-semibold transition disabled:opacity-50 ${
                        enabled
                          ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
                          : 'border-slate-700 bg-slate-950 text-slate-400 hover:text-white'
                      }`}
                    >
                      <ToggleLeft className="h-3.5 w-3.5" />
                      {enabled ? 'Enabled' : 'Disabled'}
                    </button>
                    <button
                      type="button"
                      disabled={rowBusy}
                      onClick={() => syncApi(key)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-orange-600 px-3 py-2 text-[10px] font-bold text-white transition hover:bg-orange-500 disabled:opacity-50"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${rowBusy ? 'animate-spin' : ''}`} />
                      Sync / Test
                    </button>
                  </div>
                </div>
                {config.last_error_message && label === 'Error' && (
                  <p className="mt-3 rounded-lg border border-rose-500/15 bg-rose-500/5 p-2.5 text-[10px] leading-5 text-rose-200">
                    {config.last_error_message}
                  </p>
                )}
                {rowErrors[key] && (
                  <p role="alert" className="mt-3 flex items-start gap-2 rounded-lg border border-rose-500/15 bg-rose-500/5 p-2.5 text-[10px] leading-5 text-rose-200">
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    {rowErrors[key]}
                  </p>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
