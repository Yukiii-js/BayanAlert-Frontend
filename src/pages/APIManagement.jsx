import React, { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Cloud,
  Database,
  Eye,
  EyeOff,
  Mail,
  Plus,
  RefreshCw,
  Shield,
  ToggleLeft,
  Trash2,
  X,
} from 'lucide-react';
import { api } from '../api/client';

const EMPTY_FORM = {
  api_name: '',
  category: 'Hazard',
  endpoint_url: '',
  api_key: '',
  auth_header_type: 'none',
  auth_header_name: '',
  sync_interval_minutes: 60,
  custom_parameters_json: '{}',
  is_enabled: true,
  clear_api_key: false,
};

const CATEGORY_ICONS = {
  Weather: Cloud,
  Hazard: Activity,
  Mapping: Database,
  Notifications: Mail,
};

function isEnabled(value) {
  return ![0, '0', false].includes(value);
}

function statusLabel(apiConfig) {
  if (!isEnabled(apiConfig.is_enabled)) return 'Disabled';
  if (apiConfig.rate_limit_until && new Date(String(apiConfig.rate_limit_until).replace(' ', 'T') + 'Z') > new Date()) {
    return 'Rate limited';
  }
  const value = String(apiConfig.last_status || apiConfig.status || '').toLowerCase();
  if (['online', 'success', 'active'].includes(value)) return 'Active';
  if (['error', 'offline'].includes(value)) return 'Error';
  return 'Not tested';
}

function statusStyle(label) {
  if (label === 'Active') return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300';
  if (label === 'Rate limited' || label === 'Error') return 'border-rose-500/20 bg-rose-500/10 text-rose-300';
  if (label === 'Disabled') return 'border-slate-700 bg-slate-800 text-slate-400';
  return 'border-amber-500/20 bg-amber-500/10 text-amber-300';
}

function timestamp(value) {
  if (!value) return 'Never';
  const date = new Date(String(value).replace(' ', 'T') + (String(value).endsWith('Z') ? '' : 'Z'));
  return Number.isNaN(date.getTime()) ? 'Unknown' : date.toLocaleString();
}

function remainingRateLimit(value, now) {
  if (!value) return '';
  const until = new Date(String(value).replace(' ', 'T') + (String(value).endsWith('Z') ? '' : 'Z')).getTime();
  if (!Number.isFinite(until) || until <= now) return '';
  const seconds = Math.max(0, Math.ceil((until - now) / 1000));
  if (seconds <= 0) return '';
  const minutes = Math.floor(seconds / 60);
  return `Limit reached — available again in ${minutes}m ${String(seconds % 60).padStart(2, '0')}s`;
}

export function APIManagement() {
  const [apis, setApis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [rowErrors, setRowErrors] = useState({});
  const [busyId, setBusyId] = useState(null);
  const [message, setMessage] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingApi, setEditingApi] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [now, setNow] = useState(Date.now());

  const loadApis = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const response = await api.getSystemApis();
      const values = response?.data?.apis;
      if (!Array.isArray(values)) throw new Error('The system API response was invalid.');
      setApis(values);
    } catch (error) {
      setLoadError(error.message || 'Unable to load external API status.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadApis();
  }, [loadApis]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  function openCreateForm() {
    setEditingApi(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setShowKey(false);
    setModalOpen(true);
  }

  function openEditForm(apiConfig) {
    setEditingApi(apiConfig);
    setForm({
      api_name: apiConfig.api_name || apiConfig.display_name || '',
      category: apiConfig.category || 'Hazard',
      endpoint_url: apiConfig.endpoint_url || '',
      api_key: '',
      auth_header_type: apiConfig.auth_header_type || 'none',
      auth_header_name: apiConfig.auth_header_name || '',
      sync_interval_minutes: apiConfig.sync_interval_minutes || 60,
      custom_parameters_json: apiConfig.custom_parameters_json || '{}',
      is_enabled: isEnabled(apiConfig.is_enabled),
      clear_api_key: false,
    });
    setFormError('');
    setShowKey(false);
    setModalOpen(true);
  }

  async function saveApi(event) {
    event.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      const payload = {
        ...form,
        sync_interval_minutes: Number(form.sync_interval_minutes),
      };
      if (editingApi) {
        await api.updateSystemApi(editingApi.id, payload);
        setMessage(`${form.api_name} configuration saved.`);
      } else {
        await api.createSystemApi(payload);
        setMessage(`${form.api_name} registered.`);
      }
      setModalOpen(false);
      setForm(EMPTY_FORM);
      await loadApis();
    } catch (error) {
      setFormError(error.message || 'Unable to save this API configuration.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleApi(apiConfig) {
    const nextEnabled = !isEnabled(apiConfig.is_enabled);
    setBusyId(apiConfig.id);
    setMessage('');
    setRowErrors((current) => ({ ...current, [apiConfig.id]: '' }));
    try {
      await api.updateSystemApi(apiConfig.id, { is_enabled: nextEnabled });
      setMessage(`${apiConfig.api_name || apiConfig.display_name} ${nextEnabled ? 'enabled' : 'disabled'}.`);
      await loadApis();
    } catch (error) {
      setRowErrors((current) => ({ ...current, [apiConfig.id]: error.message || 'Unable to update this API.' }));
    } finally {
      setBusyId(null);
    }
  }

  async function testApi(apiConfig) {
    setBusyId(apiConfig.id);
    setMessage('');
    setRowErrors((current) => ({ ...current, [apiConfig.id]: '' }));
    try {
      const response = apiConfig.is_custom
        ? await api.testSystemApi(apiConfig.id)
        : await api.syncExternalApi(apiConfig.api_key);
      const result = response?.data || {};
      const requestStatus = result.http_status ? `HTTP ${result.http_status}` : 'connection succeeded';
      const diagnostics = Number.isFinite(Number(result.records_fetched))
        ? ` — ${Number(result.records_fetched)} records fetched, ${result.records_matched_region ?? '—'} matched Oriental Mindoro`
        : '';
      setMessage(
        `${apiConfig.api_name || apiConfig.display_name} ${requestStatus} in ${result.latency_ms ?? '—'} ms${diagnostics}.`
      );
      await loadApis();
    } catch (error) {
      setRowErrors((current) => ({ ...current, [apiConfig.id]: error.message || 'Connection test failed.' }));
      await loadApis();
    } finally {
      setBusyId(null);
    }
  }

  async function resetApi(apiConfig) {
    setBusyId(apiConfig.id);
    setMessage('');
    setRowErrors((current) => ({ ...current, [apiConfig.id]: '' }));
    try {
      await api.resetSystemApi(apiConfig.id);
      setMessage(`${apiConfig.api_name || apiConfig.display_name} rate-limit and cache status cleared.`);
      await loadApis();
    } catch (error) {
      setRowErrors((current) => ({ ...current, [apiConfig.id]: error.message || 'Unable to clear this API status.' }));
    } finally {
      setBusyId(null);
    }
  }

  async function deleteApi(apiConfig) {
    if (!window.confirm(`Delete custom API "${apiConfig.api_name || apiConfig.display_name}"?`)) return;
    setBusyId(apiConfig.id);
    setMessage('');
    try {
      await api.deleteSystemApi(apiConfig.id);
      setMessage(`${apiConfig.api_name || apiConfig.display_name} deleted.`);
      await loadApis();
    } catch (error) {
      setRowErrors((current) => ({ ...current, [apiConfig.id]: error.message || 'Unable to delete this API.' }));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-slate-800 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-orange-300">System integrations</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">API Management</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Configure integrations, store credentials encrypted on the server, and test or clear their connection state.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={loadApis}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-3 py-2.5 text-xs font-semibold text-slate-300 transition hover:border-orange-400/40 hover:text-white disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh status
          </button>
          <button
            type="button"
            onClick={openCreateForm}
            className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-orange-500"
          >
            <Plus className="h-4 w-4" />
            Add API
          </button>
        </div>
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
          Loading API configurations…
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {apis.map((apiConfig) => {
            const Icon = CATEGORY_ICONS[apiConfig.category] || Shield;
            const enabled = isEnabled(apiConfig.is_enabled);
            const label = statusLabel(apiConfig);
            const rowBusy = busyId === apiConfig.id;
            const countdown = remainingRateLimit(apiConfig.rate_limit_until, now);
            const rowError = rowErrors[apiConfig.id] || (label === 'Error' ? apiConfig.last_error_message : '');
            return (
              <article key={apiConfig.id} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-lg shadow-black/10">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-orange-500/15 bg-orange-500/10 text-orange-300">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-sm font-bold text-white">{apiConfig.api_name || apiConfig.display_name}</h2>
                        {apiConfig.is_custom && (
                          <span className="rounded-full border border-sky-500/20 bg-sky-500/10 px-2 py-0.5 text-[8px] font-bold uppercase text-sky-300">Custom</span>
                        )}
                      </div>
                      <p className="mt-1 break-all text-[10px] leading-5 text-slate-400">{apiConfig.endpoint_url}</p>
                      <p className="mt-1 text-[9px] text-slate-500">
                        {apiConfig.category} · Refresh every {apiConfig.sync_interval_minutes || 60} min · {apiConfig.has_api_key ? 'Credential configured' : 'No API key'}
                      </p>
                    </div>
                  </div>
                  <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider ${statusStyle(label)}`}>
                    {label}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-800 pt-4 text-xs sm:grid-cols-3">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Last tested</p>
                    <p className="mt-1 text-slate-300">{timestamp(apiConfig.last_synced_at)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Connection</p>
                    <p className="mt-1 text-slate-300">
                      {apiConfig.last_http_status ? `HTTP ${apiConfig.last_http_status}` : '—'}
                      {apiConfig.last_latency_ms !== null && apiConfig.last_latency_ms !== undefined
                        ? ` · ${apiConfig.last_latency_ms} ms`
                        : ''}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Parsed events</p>
                    <p className="mt-1 text-slate-300">
                      {apiConfig.records_fetched ?? apiConfig.records_cached ?? '—'}
                      {apiConfig.records_matched_region !== null && apiConfig.records_matched_region !== undefined
                        ? ` · ${apiConfig.records_matched_region} regional`
                        : ''}
                    </p>
                  </div>
                </div>
                {countdown && (
                  <p role="status" className="mt-3 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-[10px] font-semibold text-rose-200">
                    {countdown}
                  </p>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-800 pt-4">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={enabled}
                    aria-label={`${enabled ? 'Disable' : 'Enable'} ${apiConfig.api_name || apiConfig.display_name}`}
                    disabled={rowBusy}
                    onClick={() => toggleApi(apiConfig)}
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
                    onClick={() => testApi(apiConfig)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-orange-600 px-3 py-2 text-[10px] font-bold text-white transition hover:bg-orange-500 disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${rowBusy ? 'animate-spin' : ''}`} />
                    Test / Force Sync
                  </button>
                  <button
                    type="button"
                    disabled={rowBusy}
                    onClick={() => resetApi(apiConfig)}
                    className="rounded-lg border border-slate-700 px-3 py-2 text-[10px] font-semibold text-slate-300 transition hover:border-sky-500/40 hover:text-sky-200 disabled:opacity-50"
                  >
                    Reset rate limit / clear cache
                  </button>
                  <button
                    type="button"
                    disabled={rowBusy}
                    onClick={() => openEditForm(apiConfig)}
                    className="ml-auto rounded-lg border border-slate-700 px-3 py-2 text-[10px] font-semibold text-slate-300 transition hover:border-emerald-500/40 hover:text-white disabled:opacity-50"
                  >
                    Edit
                  </button>
                  {apiConfig.is_custom && (
                    <button
                      type="button"
                      disabled={rowBusy}
                      onClick={() => deleteApi(apiConfig)}
                      aria-label={`Delete ${apiConfig.api_name}`}
                      className="rounded-lg border border-rose-500/20 p-2 text-rose-300 transition hover:bg-rose-500/10 disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                {rowError && (
                  <p role="alert" className="mt-3 rounded-lg border border-rose-500/15 bg-rose-500/5 p-2.5 text-[10px] leading-5 text-rose-200">
                    <span className="inline-flex items-start gap-2">
                      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      {rowError}
                    </span>
                  </p>
                )}
              </article>
            );
          })}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm" onClick={() => setModalOpen(false)}>
          <form
            onSubmit={saveApi}
            role="dialog"
            aria-modal="true"
            aria-labelledby="system-api-form-title"
            className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-5 text-slate-100 shadow-2xl sm:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-300">System integration</p>
                <h2 id="system-api-form-title" className="mt-1 text-xl font-bold text-white">
                  {editingApi ? 'Edit API configuration' : 'Register an API'}
                </h2>
              </div>
              <button type="button" aria-label="Close API form" onClick={() => setModalOpen(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1.5 text-xs font-semibold text-slate-300">
                API Name
                <input required maxLength={120} value={form.api_name} onChange={(event) => setForm((current) => ({ ...current, api_name: event.target.value }))} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-orange-400" />
              </label>
              <label className="space-y-1.5 text-xs font-semibold text-slate-300">
                Category
                <select value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-orange-400">
                  {['Weather', 'Hazard', 'Mapping', 'Notifications'].map((category) => <option key={category}>{category}</option>)}
                </select>
              </label>
              <label className="space-y-1.5 text-xs font-semibold text-slate-300 sm:col-span-2">
                Base Endpoint URL (HTTPS, public host)
                <input required type="url" maxLength={500} value={form.endpoint_url} onChange={(event) => setForm((current) => ({ ...current, endpoint_url: event.target.value }))} placeholder="https://api.example.com/v1/status" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-orange-400" />
              </label>
              <label className="space-y-1.5 text-xs font-semibold text-slate-300">
                API Key / Token
                <span className="flex rounded-lg border border-slate-700 bg-slate-950 focus-within:border-orange-400">
                  <input
                    type={showKey ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={form.api_key}
                    onChange={(event) => setForm((current) => ({ ...current, api_key: event.target.value }))}
                    placeholder={editingApi?.has_api_key ? 'Configured (enter new value to replace)' : 'Optional'}
                    className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm text-white outline-none"
                  />
                  <button type="button" aria-label={showKey ? 'Hide API key' : 'Show API key'} onClick={() => setShowKey((current) => !current)} className="px-3 text-slate-400 hover:text-white">
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </span>
                <span className="block text-[9px] font-normal text-slate-500">
                  Encrypted on the server. Leave blank to keep the current credential.
                </span>
                {editingApi?.has_saved_api_key && (
                  <span className="flex items-center gap-2 text-[10px] font-normal text-slate-400">
                    <input type="checkbox" checked={form.clear_api_key} onChange={(event) => setForm((current) => ({ ...current, clear_api_key: event.target.checked }))} className="accent-rose-500" />
                    Remove saved credential
                  </span>
                )}
              </label>
              <label className="space-y-1.5 text-xs font-semibold text-slate-300">
                Auth Header Type
                <select value={form.auth_header_type} onChange={(event) => setForm((current) => ({ ...current, auth_header_type: event.target.value }))} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-orange-400">
                  <option value="bearer">Bearer</option>
                  <option value="query_param">Query Param</option>
                  <option value="custom_header">Custom Header</option>
                  <option value="none">None</option>
                </select>
                {form.auth_header_type !== 'none' && (
                  <input
                    value={form.auth_header_name}
                    onChange={(event) => setForm((current) => ({ ...current, auth_header_name: event.target.value }))}
                    placeholder={form.auth_header_type === 'custom_header' ? 'Header name (e.g. X-API-Key)' : form.auth_header_type === 'query_param' ? 'Parameter name (e.g. api_key)' : 'Optional'}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-orange-400"
                  />
                )}
              </label>
              <label className="space-y-1.5 text-xs font-semibold text-slate-300">
                Polling / Refresh Interval (minutes)
                <input type="number" min="1" max="10080" required value={form.sync_interval_minutes} onChange={(event) => setForm((current) => ({ ...current, sync_interval_minutes: event.target.value }))} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-orange-400" />
              </label>
              <label className="flex items-center gap-2 self-end rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-xs font-semibold text-slate-300">
                <input type="checkbox" checked={form.is_enabled} onChange={(event) => setForm((current) => ({ ...current, is_enabled: event.target.checked }))} className="h-4 w-4 accent-emerald-500" />
                Active
              </label>
              <label className="space-y-1.5 text-xs font-semibold text-slate-300 sm:col-span-2">
                Custom Parameters (JSON object)
                <textarea rows={4} value={form.custom_parameters_json} onChange={(event) => setForm((current) => ({ ...current, custom_parameters_json: event.target.value }))} placeholder={'{"limit": 10}'} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 font-mono text-xs text-white outline-none focus:border-orange-400" />
              </label>
            </div>
            {formError && (
              <p role="alert" className="mt-4 rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-200">{formError}</p>
            )}
            <div className="mt-5 flex justify-end gap-2 border-t border-slate-800 pt-4">
              <button type="button" onClick={() => setModalOpen(false)} disabled={saving} className="rounded-lg border border-slate-700 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 disabled:opacity-50">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="rounded-lg bg-orange-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-orange-500 disabled:opacity-50">
                {saving ? 'Saving…' : editingApi ? 'Save changes' : 'Add API'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
