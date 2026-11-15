import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowRight, Database, Loader2, LockKeyhole } from 'lucide-react';
import { api } from '../api/client';
import { REGISTER_GROUP_ICONS } from '../components/adminNavigation';

export function RegisterDirectory() {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api.getTables()
      .then((response) => {
        const definitions = response?.data?.tables;
        if (!definitions || typeof definitions !== 'object' || Array.isArray(definitions)) {
          throw new Error('The database register list was invalid.');
        }
        if (active) {
          setTables(Object.entries(definitions).map(([tableName, definition]) => ({
            tableName,
            ...definition,
          })));
        }
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || 'Unable to load database registers.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const groups = useMemo(() => tables.reduce((result, table) => {
    const group = table.group || 'General';
    if (!result[group]) result[group] = [];
    result[group].push(table);
    return result;
  }, {}), [tables]);

  return (
    <div className="space-y-7">
      <header className="border-b border-slate-800 pb-5">
        <p className="text-xs font-bold uppercase tracking-wider text-orange-400">System data</p>
        <h1 className="mt-1 flex items-center gap-2 text-3xl font-bold tracking-tight text-white">
          <Database className="h-7 w-7 text-cyan-400" />
          Database Registers
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Low-level access to the application’s configured tables, grouped by operational purpose.
        </p>
      </header>

      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div role="status" className="flex items-center justify-center gap-2 py-16 text-sm text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin text-orange-400" />
          Loading registers...
        </div>
      ) : Object.keys(groups).length ? (
        <div className="space-y-7">
          {Object.entries(groups).map(([groupName, groupTables]) => {
            const GroupIcon = REGISTER_GROUP_ICONS[groupName] || Database;
            return (
              <section key={groupName} aria-label={groupName}>
                <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-200">
                  <GroupIcon className="h-4 w-4 text-cyan-400" />
                  {groupName}
                  <span className="text-[10px] font-medium text-slate-500">{groupTables.length} tables</span>
                </h2>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {groupTables.map((table) => (
                    <Link
                      key={table.tableName}
                      to={`/admin/tables/${encodeURIComponent(table.tableName)}`}
                      className="group rounded-xl border border-slate-800 bg-slate-900/70 p-4 transition hover:border-orange-500/40 hover:bg-slate-900"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-bold text-slate-100 group-hover:text-white">{table.label || table.tableName}</h3>
                          <p className="mt-1 text-[10px] font-mono text-cyan-300/80">{table.tableName}</p>
                        </div>
                        {table.read_only && (
                          <span title="Read-only register" className="rounded-lg border border-slate-700 bg-slate-950 p-1.5 text-slate-400">
                            <LockKeyhole className="h-3.5 w-3.5" />
                          </span>
                        )}
                      </div>
                      <p className="mt-3 min-h-8 text-xs leading-5 text-slate-400">{table.description || 'Inspect records in this database table.'}</p>
                      <span className="mt-3 inline-flex items-center gap-1 text-[10px] font-bold text-orange-300">
                        Open register <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      ) : !error ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-8 text-center text-sm text-slate-400">
          No database registers are configured.
        </div>
      ) : null}
    </div>
  );
}
