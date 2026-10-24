import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client';
import { 
  ArrowLeft, 
  Save, 
  Loader2, 
  AlertCircle, 
  CheckCircle,
  Database,
  Eye,
  EyeOff
} from 'lucide-react';

export function TableForm() {
  const { table, id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [tableInfo, setTableInfo] = useState({});
  const [fields, setFields] = useState([]);
  const [formData, setFormData] = useState({});
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        if (isEdit) {
          const res = await api.getRecord(table, id);
          setTableInfo(res.data.table_info || {});
          setFields(res.data.fields || []);

          // Prepopulate form data
          const initial = {};
          (res.data.fields || []).forEach(f => {
            const formKey = f.form_name || f.name;
            initial[formKey] = f.value ?? (f.default || '');
          });
          setFormData(initial);
        } else {
          const res = await api.getTableOptions(table);
          setTableInfo(res.data.table_info || {});
          setFields(res.data.fields || []);

          const initial = {};
          (res.data.fields || []).forEach(f => {
            const formKey = f.form_name || f.name;
            initial[formKey] = f.default || '';
          });
          setFormData(initial);
        }
      } catch (err) {
        setError(err.message || 'Failed to initialize form.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [table, id, isEdit]);

  const handleChange = (formName, value) => {
    setFormData(prev => ({
      ...prev,
      [formName]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      if (isEdit) {
        await api.updateRecord(table, id, formData);
      } else {
        await api.createRecord(table, formData);
      }
      navigate(`/admin/tables/${table}`, { replace: true });
    } catch (err) {
      setError(err.message || 'Failed to save record.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mb-3" />
        <p className="text-sm">Preparing form...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Top Header */}
      <div>
        <Link
          to={`/admin/tables/${table}`}
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-emerald-400 mb-2 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to {tableInfo.label || table}</span>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <Database className="w-6 h-6 text-emerald-400" />
          {isEdit ? `Edit Record #${id}` : `New ${tableInfo.label || 'Record'}`}
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          {isEdit ? 'Update the record details below.' : 'Provide the required fields to insert a new register record.'}
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-start gap-2.5">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Form Container */}
      <form onSubmit={handleSubmit} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl">
        <div className="space-y-5">
          {fields.map((field) => {
            const formKey = field.form_name || field.name;
            const isRequired = !field.nullable && field.default === null && !field.password;
            const hasOptions = Array.isArray(field.options) && field.options.length > 0;
            const hasEnum = Array.isArray(field.enum) && field.enum.length > 0;
            const isTextarea = field.type.includes('text') || field.type.includes('blob');
            const isNumeric = field.type.includes('int') || field.type.includes('decimal') || field.type.includes('float');
            const isDateTime = field.type.includes('date') || field.type.includes('time');

            return (
              <div key={formKey} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                    {field.label}
                    {isRequired && <span className="text-rose-400 ml-1">*</span>}
                  </label>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {field.type}
                  </span>
                </div>

                {/* Password field */}
                {field.password ? (
                  <div className="relative">
                    <input
                      type={showPassword[formKey] ? 'text' : 'password'}
                      value={formData[formKey] ?? ''}
                      onChange={(e) => handleChange(formKey, e.target.value)}
                      placeholder={isEdit ? 'Leave blank to retain existing password' : '••••••••'}
                      required={!isEdit}
                      className="w-full pr-10 pl-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(p => ({ ...p, [formKey]: !p[formKey] }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                    >
                      {showPassword[formKey] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                ) : hasOptions ? (
                  /* Foreign Key Reference Select */
                  <select
                    value={formData[formKey] ?? ''}
                    onChange={(e) => handleChange(formKey, e.target.value)}
                    required={isRequired}
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="">{field.nullable ? '-- None / Empty --' : '-- Select an option --'}</option>
                    {field.options.map((opt, i) => {
                      const optKeys = Object.keys(opt);
                      const optVal = opt[optKeys[0]];
                      const optLabel = opt[optKeys[1]] ?? optVal;
                      return (
                        <option key={i} value={optVal}>
                          {optLabel} (ID: {optVal})
                        </option>
                      );
                    })}
                  </select>
                ) : hasEnum ? (
                  /* Enum Select */
                  <select
                    value={formData[formKey] ?? ''}
                    onChange={(e) => handleChange(formKey, e.target.value)}
                    required={isRequired}
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 capitalize"
                  >
                    <option value="">-- Select Status/Option --</option>
                    {field.enum.map((choice) => (
                      <option key={choice} value={choice}>
                        {choice.replace(/_/g, ' ')}
                      </option>
                    ))}
                  </select>
                ) : isTextarea ? (
                  /* Textarea */
                  <textarea
                    rows={4}
                    value={formData[formKey] ?? ''}
                    onChange={(e) => handleChange(formKey, e.target.value)}
                    required={isRequired}
                    placeholder={`Enter ${field.label.toLowerCase()}...`}
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 resize-y"
                  />
                ) : (
                  /* Standard Input (Text, Number, Date) */
                  <input
                    type={isNumeric ? 'number' : isDateTime ? 'datetime-local' : 'text'}
                    value={formData[formKey] ?? ''}
                    onChange={(e) => handleChange(formKey, e.target.value)}
                    required={isRequired}
                    placeholder={`Enter ${field.label.toLowerCase()}...`}
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-sans"
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Form Actions */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
          <Link
            to={`/admin/tables/${table}`}
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>{isEdit ? 'Update Record' : 'Save Record'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
