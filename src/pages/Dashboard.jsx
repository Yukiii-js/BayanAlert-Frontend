import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { 
  FileText, 
  AlertTriangle, 
  Clock, 
  Users, 
  ArrowRight, 
  Database, 
  Layers, 
  Loader2, 
  AlertCircle,
  TrendingUp,
  RefreshCw
} from 'lucide-react';

export function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboard = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.getDashboard();
      setData(res.data);
    } catch (err) {
      setError(err.message || 'Failed to fetch dashboard metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

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

  const { counts = {}, total_records = 0, report_count = 0, pending_reports = 0, active_users = 0, recent_reports = [], tables = {} } = data || {};

  // Group tables
  const groups = {};
  Object.entries(tables).forEach(([tableName, def]) => {
    const groupName = def.group || 'General';
    if (!groups[groupName]) groups[groupName] = [];
    groups[groupName].push({ tableName, ...def });
  });

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
        <div className="flex items-center gap-3">
          <Link
            to="/admin/tables/hazard_reports"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm rounded-xl shadow-lg shadow-emerald-600/20 transition-colors"
          >
            <span>View Reports</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

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

      {/* Main Grid: Database Registers & Recent Reports */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Table Groups (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
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

            <div className="space-y-6">
              {Object.entries(groups).map(([groupName, groupTables]) => (
                <div key={groupName} className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-400">
                    <span>{groupName}</span>
                    <span className="text-slate-500 font-normal lowercase">{groupTables.length} registers</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {groupTables.map((tab) => (
                      <Link
                        key={tab.tableName}
                        to={`/admin/tables/${tab.tableName}`}
                        className="group p-4 rounded-xl bg-slate-800/40 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 transition-all flex items-start justify-between gap-3"
                      >
                        <div>
                          <div className="text-sm font-semibold text-slate-200 group-hover:text-emerald-400 transition-colors">
                            {tab.label}
                          </div>
                          <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                            {tab.description}
                          </p>
                        </div>
                        <span className="px-2 py-0.5 rounded-md text-xs font-mono font-medium bg-slate-900 text-slate-300 border border-slate-700/40 flex-shrink-0">
                          {Number(counts[tab.tableName] ?? 0).toLocaleString()}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Reports Sidebar (1 Col) */}
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
              <div className="divide-y divide-slate-800/60">
                {recent_reports.map((report) => (
                  <div key={report.report_id || report.reference_number} className="py-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className="text-[11px] font-mono text-emerald-400 font-semibold block">
                        {report.reference_number}
                      </span>
                      <p className="text-sm font-medium text-slate-200 truncate mt-0.5" title={report.title}>
                        {report.title}
                      </p>
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider flex-shrink-0 ${
                      report.status === 'pending'
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : report.status === 'resolved'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}>
                      {report.status?.replace('_', ' ') || 'New'}
                    </span>
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
    </div>
  );
}
