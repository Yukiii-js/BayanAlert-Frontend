import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  ChevronLeft, 
  ChevronRight, 
  Loader2, 
  AlertCircle, 
  CheckCircle,
  Database,
  ArrowLeft,
  X
} from 'lucide-react';

export function TableList() {
  const { table } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadTableData = async (targetPage = page, searchTerm = search) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.getTableRows(table, searchTerm, targetPage);
      setData(res.data);
    } catch (err) {
      setError(err.message || `Failed to load records for ${table}.`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSearch('');
    setPage(1);
    setMessage('');
    setError('');
    loadTableData(1, '');
  }, [table]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    loadTableData(1, search);
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1) return;
    setPage(newPage);
    loadTableData(newPage, search);
  };

  const handleDelete = async (id) => {
    setIsDeleting(true);
    try {
      await api.deleteRecord(table, id);
      setMessage('Record deleted successfully.');
      setDeleteConfirmId(null);
      loadTableData(page, search);
    } catch (err) {
      setError(err.message || 'Failed to delete record.');
    } finally {
      setIsDeleting(false);
    }
  };

  const { table_info = {}, columns = [], rows = [], total = 0, page_size = 20, schema = {} } = data || {};
  const totalPages = Math.ceil(total / (page_size || 20)) || 1;
  const primaryKey = table_info?.primary_key || 'id';

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            to="/admin"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-emerald-400 mb-2 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Dashboard</span>
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Database className="w-6 h-6 text-emerald-400" />
              {table_info.label || table}
            </h1>
            {table_info.read_only && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Read-Only
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">{table_info.description}</p>
        </div>

        {!table_info.read_only && (
          <Link
            to={`/admin/tables/${table}/create`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm rounded-xl shadow-lg shadow-emerald-600/20 transition-colors self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add Record</span>
          </Link>
        )}
      </div>

      {/* Messages */}
      {message && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span>{message}</span>
          </div>
          <button onClick={() => setMessage('')} className="text-emerald-400/80 hover:text-emerald-300">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')} className="text-rose-400/80 hover:text-rose-300">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search Bar */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <form onSubmit={handleSearch} className="relative w-full sm:w-96">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${table_info.label || table}...`}
            className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </form>

        <div className="text-xs text-slate-400 font-medium">
          Showing <span className="text-slate-200 font-semibold">{rows.length}</span> of{' '}
          <span className="text-slate-200 font-semibold">{total}</span> records
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mb-3" />
            <p className="text-sm">Fetching table records...</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="py-20 text-center text-slate-500 text-sm">
            <Database className="w-10 h-10 mx-auto text-slate-600 mb-2" />
            No records found in this register.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/90 text-slate-400 uppercase tracking-wider font-semibold">
                  {columns.map((col) => (
                    <th key={col} className="px-4 py-3 whitespace-nowrap">
                      {schema[col]?.label || col.replace(/_/g, ' ')}
                    </th>
                  ))}
                  {!table_info.read_only && (
                    <th className="px-4 py-3 text-right whitespace-nowrap">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {rows.map((row, index) => {
                  const recordId = row[primaryKey];
                  const isCurrentAdmin = table === 'users' && String(recordId) === String(user?.user_id);

                  return (
                    <tr key={recordId || index} className="hover:bg-slate-800/40 transition-colors">
                      {columns.map((col) => {
                        const val = row[col];
                        const isPk = col === primaryKey;

                        return (
                          <td key={col} className="px-4 py-3 whitespace-nowrap max-w-xs truncate text-slate-300 font-sans">
                            {isPk ? (
                              <span className="font-mono text-emerald-400 font-semibold">{val}</span>
                            ) : val === null || val === undefined ? (
                              <span className="text-slate-600 italic">null</span>
                            ) : typeof val === 'boolean' || val === 0 || val === 1 ? (
                              val === 1 || val === true ? (
                                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                  active
                                </span>
                              ) : (
                                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                                  inactive
                                </span>
                              )
                            ) : (
                              String(val)
                            )}
                          </td>
                        );
                      })}

                      {!table_info.read_only && (
                        <td className="px-4 py-3 text-right whitespace-nowrap font-sans">
                          {isCurrentAdmin ? (
                            <span className="text-[10px] text-slate-500 italic">Current User</span>
                          ) : (
                            <div className="flex items-center justify-end gap-1.5">
                              <Link
                                to={`/admin/tables/${table}/edit/${recordId}`}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                                title="Edit"
                              >
                                <Edit className="w-4 h-4" />
                              </Link>
                              <button
                                onClick={() => setDeleteConfirmId(recordId)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Page <span className="text-slate-200 font-semibold">{page}</span> of{' '}
              <span className="text-slate-200 font-semibold">{totalPages}</span>
            </span>

            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => handlePageChange(page - 1)}
                className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-700 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => handlePageChange(page + 1)}
                className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-700 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">Delete Record</h3>
            <p className="text-sm text-slate-400 mb-6">
              Are you sure you want to delete this record (ID: <span className="font-mono text-white">{deleteConfirmId}</span>)? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/20 transition-colors flex items-center gap-2"
              >
                {isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
