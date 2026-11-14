import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client';
import { 
  ArrowLeft, 
  Save, 
  Loader2, 
  AlertCircle, 
  CheckCircle,
  Mail,
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
  const [notificationPreview, setNotificationPreview] = useState(null);
  const [notificationEmail, setNotificationEmail] = useState('');
  const [sendDepartmentEmail, setSendDepartmentEmail] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        if (isEdit) {
          const res = await api.getRecord(table, id);
          setTableInfo(res.data.table_info || {});
          setFields(res.data.fields || []);
          if (table === 'hazard_reports') {
            const preview = res.data.notification || null;
            setNotificationPreview(preview);
            setNotificationEmail(preview?.default_email || '');
          }

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
        const updateData = table === 'hazard_reports'
          ? {
            ...formData,
            send_department_email: sendDepartmentEmail,
            department_email: notificationEmail.trim(),
          }
          : formData;
        await api.updateRecord(table, id, updateData);
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

  const statusValue = String(formData.status || '').trim().toLowerCase();
  const originalStatus = String(
    notificationPreview?.report?.status || fields.find((field) => field.name === 'status')?.value || ''
  ).trim().toLowerCase();
  const approvalTarget = isEdit
    && table === 'hazard_reports'
    && ['approved', 'verified'].includes(statusValue)
    && !['approved', 'verified'].includes(originalStatus);
  const previewReport = notificationPreview?.report;

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
        {approvalTarget && (
          <section className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <Mail className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-bold text-white">Approval email preview</h2>
                <p className="mt-1 text-xs leading-5 text-slate-400">
                  Review the recipient and included report details before approving. The contact is preselected from this hazard category and can be changed.
                </p>
              </div>
            </div>

            <label className="mt-4 flex items-center gap-2 text-sm text-slate-200">
              <input
                type="checkbox"
                checked={sendDepartmentEmail}
                onChange={(event) => setSendDepartmentEmail(event.target.checked)}
                className="h-4 w-4 accent-emerald-500"
              />
              Send this report by email when approved
            </label>

            {sendDepartmentEmail && (
              <>
                <label htmlFor="department-email" className="mt-4 block text-xs font-semibold uppercase tracking-wide text-slate-300">
                  Recipient email
                  {notificationPreview?.department?.name && (
                    <span className="ml-2 normal-case font-normal text-slate-400">
                      Auto-selected: {notificationPreview.department.name}
                    </span>
                  )}
                </label>
                <input
                  id="department-email"
                  type="email"
                  required
                  value={notificationEmail}
                  onChange={(event) => setNotificationEmail(event.target.value)}
                  placeholder="Choose the department or contact email"
                  className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-sm text-slate-100 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />

                <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950/70 p-3 text-xs text-slate-300">
                  <p className="font-semibold text-slate-100">
                    {previewReport?.reference_number || `Report #${id}`} · {previewReport?.title || 'Hazard report'}
                  </p>
                  <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                    {[
                      ['Category', previewReport?.category_name],
                      ['Location', previewReport?.address_details],
                      ['Reporter', previewReport?.reporter_name],
                      ['Reported at', previewReport?.submitted_at],
                      ['Coordinates', previewReport?.latitude != null && previewReport?.longitude != null
                        ? `${previewReport.latitude}, ${previewReport.longitude}`
                        : 'Not provided'],
                      ['Severity', previewReport?.severity_level || 'Not specified'],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <dt className="text-[10px] uppercase tracking-wide text-slate-500">{label}</dt>
                        <dd className="mt-0.5 break-words text-slate-300">{value || 'Not provided'}</dd>
                      </div>
                    ))}
                  </dl>
                  <p className="mt-2 whitespace-pre-wrap text-slate-400">
                    {previewReport?.description || 'No description provided.'}
                  </p>
                  <p className="mt-2 text-[10px] text-slate-500">
                    Attached media links: {previewReport?.media?.length || 0}
                  </p>
                </div>
              </>
            )}
          </section>
        )}

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
