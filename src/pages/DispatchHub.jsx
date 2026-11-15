import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowRight, ClipboardList, Loader2, ShieldCheck } from 'lucide-react';
import { api } from '../api/client';

export function DispatchHub() {
  const [metrics, setMetrics] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api.getDashboard()
      .then((response) => {
        if (active) setMetrics(response?.data || null);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || 'Unable to load dispatch summary.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const workflows = [
    {
      title: 'Report Assignments',
      description: 'Assign verified hazard reports to response units and track dispatch status.',
      table: 'report_assignments',
      count: metrics?.counts?.report_assignments,
      icon: ClipboardList,
      accent: 'text-orange-300 bg-orange-500/10 border-orange-500/20',
      action: 'Manage assignments',
    },
    {
      title: 'Field Resolutions',
      description: 'Review resolution notes and confirm incident response outcomes.',
      table: 'resolutions',
      count: metrics?.counts?.resolutions,
      icon: ShieldCheck,
      accent: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20',
      action: 'Review resolutions',
    },
  ];

  return (
    <div className="space-y-7">
      <header className="border-b border-slate-800 pb-5">
        <p className="text-xs font-bold uppercase tracking-wider text-orange-400">Command & operations</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-white">Dispatch & Assignments</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
          Move verified incidents from triage to response, then document and confirm field resolutions.
        </p>
      </header>

      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div role="status" className="flex items-center gap-2 py-8 text-sm text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin text-orange-400" />
          Loading dispatch summary...
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {workflows.map(({ title, description, table, count, icon: Icon, accent, action }) => (
          <Link
            key={table}
            to={`/admin/tables/${table}`}
            className="group rounded-2xl border border-slate-800 bg-slate-900/70 p-5 transition hover:border-orange-500/40 hover:bg-slate-900 sm:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <span className={`flex h-11 w-11 items-center justify-center rounded-xl border ${accent}`}>
                <Icon className="h-5 w-5" />
              </span>
              {typeof count === 'number' && (
                <span className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs font-semibold text-slate-300">
                  {count.toLocaleString()} records
                </span>
              )}
            </div>
            <h2 className="mt-5 text-lg font-bold text-white">{title}</h2>
            <p className="mt-2 min-h-10 text-sm leading-6 text-slate-400">{description}</p>
            <span className="mt-5 inline-flex items-center gap-2 text-xs font-bold text-orange-300">
              {action}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </span>
          </Link>
        ))}
      </div>

      <p className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-xs leading-5 text-slate-400">
        Assignment and resolution records open in the existing protected register editor. Use the Hazard Reports queue to verify an incident before assigning it.
      </p>
    </div>
  );
}
