
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  Map,
  List,
  PlusCircle,
  Bell,
  User,
  LogOut,
  Search,
  MapPin,
  Clock,
  FileText,
  Eye,
  X,
  Pencil,
  Upload,
  LoaderCircle,
  AlertCircle,
  CheckCircle,
  RefreshCw,
} from 'lucide-react';
import { api, REPORTS_UPDATED_EVENT } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { HazardMap } from '../components/HazardMap';

const EMPTY_FORM = {
  category_id: '',
  station_id: '',
  title: '',
  description: '',
  address_details: '',
  latitude: '',
  longitude: '',
};

function formatStatus(status) {
  if (!status) return 'Pending';

  return status
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value) {
  if (!value) return 'Date unavailable';

  const date = new Date(value.replace(' ', 'T'));

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString();
}

function statusStyle(status) {
  const styles = {
    pending: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
    verified: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    assigned: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
    in_progress: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300',
    resolved: 'border-teal-500/30 bg-teal-500/10 text-teal-300',
    rejected: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
    duplicate: 'border-slate-600 bg-slate-800 text-slate-300',
  };

  return styles[status] || styles.duplicate;
}

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold ${statusStyle(status)}`}
    >
      {formatStatus(status)}
    </span>
  );
}

function getList(data, possibleKeys) {
  if (Array.isArray(data)) return data;

  for (const key of possibleKeys) {
    if (Array.isArray(data?.[key])) return data[key];
    if (Array.isArray(data?.data?.[key])) return data.data[key];
  }

  if (Array.isArray(data?.data)) return data.data;

  return [];
}

function normalizeReport(report) {
  return {
    ...report,
    report_id: report.report_id ?? report.id,
    category_name:
      report.category_name ??
      report.category?.category_name ??
      report.category?.name ??
      'Uncategorized',
    station_name:
      report.station_name ??
      report.station?.station_name ??
      report.station?.name ??
      'Not assigned',
    status: String(report.status || 'pending').toLowerCase(),
  };
}

export default function SubmittedReports() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const [reports, setReports] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stations, setStations] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pageError, setPageError] = useState('');
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Statuses');

  const [showForm, setShowForm] = useState(false);
  const [editingReport, setEditingReport] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);

  const [form, setForm] = useState(EMPTY_FORM);
  const [evidenceFiles, setEvidenceFiles] = useState([]);
  const [existingEvidence, setExistingEvidence] = useState([]);

  async function loadPageData() {
    setLoading(true);
    setPageError('');

    try {
      const results = await Promise.all([
        api.getResidentReports(),
        api.getReportCategories(),
        api.getStations(),
      ]);

      const reportList = getList(results[0], ['reports']).map(normalizeReport);
      const categoryList = getList(results[1], [
        'categories',
        'hazard_categories',
      ]);
      const stationList = getList(results[2], ['stations']);

      setReports(reportList);
      setCategories(categoryList);
      setStations(stationList);
    } catch (error) {
      setPageError(
        `${error.message}. Check that the reports, hazard-categories, and stations API routes exist in your LavaLust backend.`
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPageData();
  }, []);

  const filteredReports = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return reports.filter((report) => {
      const matchesStatus =
        statusFilter === 'All Statuses' ||
        report.status === statusFilter;

      const searchableText = [
        report.reference_number,
        report.title,
        report.description,
        report.address_details,
        report.category_name,
        report.station_name,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return matchesStatus && searchableText.includes(query);
    });
  }, [reports, searchTerm, statusFilter]);

  const summary = useMemo(
    () => ({
      total: reports.length,
      pending: reports.filter((r) => r.status === 'pending').length,
      verified: reports.filter((r) => r.status === 'verified').length,
      inProgress: reports.filter(
        (r) => r.status === 'in_progress' || r.status === 'assigned'
      ).length,
    }),
    [reports]
  );
  const statusOptions = useMemo(
    () => ['All Statuses', ...new Set(reports.map((report) => report.status).filter(Boolean))],
    [reports]
  );

  function resetForm() {
    setForm(EMPTY_FORM);
    setEvidenceFiles([]);
    setExistingEvidence([]);
    setEditingReport(null);
    setFormError('');
    setShowForm(false);
  }

  function openCreateForm() {
    setEditingReport(null);
    setForm(EMPTY_FORM);
    setEvidenceFiles([]);
    setExistingEvidence([]);
    setFormError('');
    setSuccessMessage('');
    setShowForm(true);
    setSelectedReport(null);
  }

  function openEditForm(report) {
    if (!canEdit(report)) {
      setFormError('This report cannot be edited because of its current status.');
      return;
    }

    setEditingReport(report);
    setForm({
      category_id: String(report.category_id ?? ''),
      station_id: String(report.station_id ?? ''),
      title: report.title || '',
      description: report.description || '',
      address_details: report.address_details || '',
      latitude: report.latitude || '',
      longitude: report.longitude || '',
    });
    setEvidenceFiles([]);
    setExistingEvidence(report.evidence || []);
    setFormError('');
    setSuccessMessage('');
    setSelectedReport(null);
    setShowForm(true);
  }

  function canEdit(report) {
    // Residents may edit their own pending reports.
    // The backend MUST enforce ownership and status permissions too.
    return String(report.status).toLowerCase() === 'pending';
  }

  function handleFormChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function handleFileChange(event) {
    const selected = Array.from(event.target.files || []);
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'video/mp4',
      'application/pdf',
    ];

    const invalid = selected.find(
      (file) => !allowedTypes.includes(file.type)
    );

    if (invalid) {
      setFormError(
        'Unsupported file type. Upload JPG, PNG, WEBP, MP4, or PDF files.'
      );
      event.target.value = '';
      return;
    }

    const tooLarge = selected.find((file) => file.size > 10 * 1024 * 1024);

    if (tooLarge) {
      setFormError('Each evidence file must be 10 MB or smaller.');
      event.target.value = '';
      return;
    }

    setFormError('');
    setEvidenceFiles((previous) => [...previous, ...selected]);
    event.target.value = '';
  }

  function removeNewFile(index) {
    setEvidenceFiles((previous) =>
      previous.filter((_, fileIndex) => fileIndex !== index)
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError('');
    setSuccessMessage('');

    if (!form.category_id || !form.title.trim() ||
        !form.description.trim() || !form.address_details.trim()) {
      setFormError('Please fill in the category, title, description, and address.');
      return;
    }

    setSaving(true);

    try {
      const isEditing = Boolean(editingReport);
      let body;
      const hasFiles = evidenceFiles.length > 0;

      if (hasFiles) {
        body = new FormData();
        body.append('category_id', form.category_id);
        body.append('station_id', form.station_id);
        body.append('title', form.title.trim());
        body.append('description', form.description.trim());
        body.append('address_details', form.address_details.trim());
        body.append('latitude', form.latitude);
        body.append('longitude', form.longitude);

        evidenceFiles.forEach((file) => {
          body.append('evidence[]', file);
        });
      } else {
        body = {
          category_id: Number(form.category_id),
          station_id: form.station_id ? Number(form.station_id) : null,
          title: form.title.trim(),
          description: form.description.trim(),
          address_details: form.address_details.trim(),
          latitude: form.latitude || null,
          longitude: form.longitude || null,
        };
      }

      if (isEditing) {
        await api.updateResidentReport(editingReport.report_id, body);
      } else {
        await api.createResidentReport(body);
      }

      resetForm();
      setSuccessMessage(
        isEditing
          ? 'Your report was updated successfully.'
          : 'Your hazard report was submitted successfully.'
      );
      window.dispatchEvent(new Event(REPORTS_UPDATED_EVENT));

      await loadPageData();
    } catch (error) {
      setFormError(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    await logout();
    navigate('/resident-login', { replace: true });
  }

  const navItems = [
    { label: 'Map & Dashboard', to: '/resident', icon: Map },
    {
      label: 'Submitted Reports',
      to: '/resident/submitted-reports',
      icon: List,
    },
    {
      label: 'Submit Report',
      to: '/resident/submitted-reports',
      icon: PlusCircle,
      action: openCreateForm,
    },
    { label: 'Alerts', to: '/resident#alerts', icon: Bell },
    { label: 'My Profile', to: '/resident/profile', icon: User },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-30 border-b border-slate-700 bg-slate-950 text-white shadow-md">
        <div className="mx-auto flex min-h-[64px] max-w-[1500px] items-center justify-between gap-3 px-4 lg:px-7">
          <Link to="/resident" className="flex shrink-0 items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 shadow-lg shadow-emerald-900/30">
              <ShieldAlert className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-sm font-extrabold">BayanAlert</span>
              <span className="block text-[9px] text-slate-400">
                Community Hazard Reporting
              </span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            {navItems.map(({ label, to, icon: Icon, action }) => (
              <button
                key={label}
                type="button"
                onClick={action || (() => navigate(to))}
                className={`flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-2 text-[11px] font-semibold transition ${
                  label === 'Submitted Reports'
                    ? 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </nav>

          <button
            type="button"
            onClick={handleLogout}
            className="flex shrink-0 items-center gap-1.5 rounded-md border border-slate-700 px-3 py-2 text-[10px] text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            <LogOut className="h-3.5 w-3.5" />
            Logout
          </button>
        </div>

        <nav className="flex gap-1 overflow-x-auto border-t border-slate-800 px-3 py-2 lg:hidden">
          {navItems.map(({ label, to, icon: Icon, action }) => (
            <button
              key={label}
              type="button"
              onClick={action || (() => navigate(to))}
              className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-2 text-[10px] font-semibold ${
                label === 'Submitted Reports'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:bg-slate-800'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-[1500px] space-y-5 p-4 lg:p-7">
        <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-emerald-400">
              Resident Portal
            </p>
            <h1 className="text-2xl font-extrabold text-white">
              My Submitted Reports
            </h1>
            <p className="mt-2 max-w-2xl text-xs leading-5 text-slate-400">
              Create reports, update pending submissions, attach evidence, and
              track report status.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateForm}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-xs font-bold text-white shadow-lg shadow-emerald-900/30 transition hover:bg-emerald-500"
          >
            <PlusCircle className="h-4 w-4" />
            Create New Report
          </button>
        </section>

        {successMessage && (
          <div className="flex items-start gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-xs text-emerald-300">
            <CheckCircle className="h-4 w-4 shrink-0" />
            {successMessage}
          </div>
        )}

        {pageError && (
          <div className="flex items-start gap-3 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4">
            <AlertCircle className="h-5 w-5 shrink-0 text-rose-400" />
            <div className="flex-1">
              <p className="text-xs font-bold text-rose-300">
                Unable to load reports
              </p>
              <p className="mt-1 text-xs leading-5 text-rose-300">{pageError}</p>
              <button
                type="button"
                onClick={loadPageData}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-rose-500/20 bg-slate-950 px-3 py-2 text-xs font-bold text-rose-300 hover:bg-rose-500/10"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* Summary cards */}
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: 'My Reports', count: summary.total, color: 'text-emerald-300', icon: FileText },
            { label: 'Pending', count: summary.pending, color: 'text-amber-300', icon: Clock },
            { label: 'Verified', count: summary.verified, color: 'text-teal-300', icon: CheckCircle },
            { label: 'Assigned / In Progress', count: summary.inProgress, color: 'text-sky-300', icon: MapPin },
          ].map(({ label, count, color, icon: Icon }) => (
            <div key={label} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-lg shadow-black/10">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-semibold text-slate-400">{label}</p>
                <Icon className={`h-4 w-4 ${color}`} />
              </div>
              <p className={`mt-2 text-2xl font-extrabold ${color}`}>{count}</p>
            </div>
          ))}
        </section>

        {/* Create/edit form */}
        {showForm && (
          <section className="overflow-hidden rounded-2xl border border-emerald-500/20 bg-slate-900/80 shadow-xl shadow-black/20">
            <div className="flex items-center justify-between gap-3 border-b border-slate-800 bg-emerald-950/30 p-4 sm:p-5">
              <div>
                <h2 className="text-sm font-extrabold text-white">
                  {editingReport ? 'Edit Hazard Report' : 'Create Hazard Report'}
                </h2>
                <p className="mt-1 text-[11px] text-slate-400">
                  Complete the report details accurately.
                </p>
              </div>
              <button
                type="button"
                onClick={resetForm}
                aria-label="Close report form"
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 p-4 sm:p-6">
              {formError && (
                <div className="flex items-start gap-2 rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-300">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="category_id" className="mb-1.5 block text-xs font-bold text-slate-300">
                    Hazard Category <span className="text-rose-400">*</span>
                  </label>
                  <select
                    id="category_id"
                    name="category_id"
                    value={form.category_id}
                    onChange={handleFormChange}
                    required
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-xs text-slate-100 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="">Select a hazard category</option>
                    {categories.map((category) => (
                      <option
                        key={category.category_id}
                        value={category.category_id}
                      >
                        {category.category_name || category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="station_id" className="mb-1.5 block text-xs font-bold text-slate-300">
                    Station (optional)
                  </label>
                  <select
                    id="station_id"
                    name="station_id"
                    value={form.station_id}
                    onChange={handleFormChange}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-xs text-slate-100 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="">No station selected</option>
                    {stations.map((station) => (
                      <option
                        key={station.station_id}
                        value={station.station_id}
                      >
                        {station.station_name || station.name}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-[10px] text-slate-500">
                    Leave blank if the report has not been assigned to a station.
                  </p>
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="title" className="mb-1.5 block text-xs font-bold text-slate-300">
                    Report Title <span className="text-rose-400">*</span>
                  </label>
                  <input
                    id="title"
                    name="title"
                    value={form.title}
                    onChange={handleFormChange}
                    maxLength={200}
                    required
                    placeholder="Enter a short title for the hazard"
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-xs text-slate-100 placeholder:text-slate-600 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="description" className="mb-1.5 block text-xs font-bold text-slate-300">
                    Description <span className="text-rose-400">*</span>
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={form.description}
                    onChange={handleFormChange}
                    required
                    rows={4}
                    placeholder="Describe the hazard, its severity, and any risks to residents."
                    className="w-full resize-y rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-xs leading-5 text-slate-100 placeholder:text-slate-600 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="address_details" className="mb-1.5 block text-xs font-bold text-slate-300">
                    Hazard Location / Address <span className="text-rose-400">*</span>
                  </label>
                  <input
                    id="address_details"
                    name="address_details"
                    value={form.address_details}
                    onChange={handleFormChange}
                    maxLength={255}
                    required
                    placeholder="Enter the barangay, street, or specific location"
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-xs text-slate-100 placeholder:text-slate-600 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div className="md:col-span-2">
                  <HazardMap
                    selectable
                    height="h-[320px]"
                    selectedLocation={form.latitude && form.longitude
                      ? { latitude: form.latitude, longitude: form.longitude }
                      : null}
                    onLocationSelect={({ latitude, longitude }) => {
                      setForm((previous) => ({ ...previous, latitude, longitude }));
                    }}
                  />
                  <p className="mt-2 text-[10px] text-slate-400">
                    {form.latitude && form.longitude
                      ? `Selected location: ${form.latitude}, ${form.longitude}`
                      : 'Select a point on the map to include precise hazard coordinates (optional).'}
                  </p>
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="evidence" className="mb-1.5 block text-xs font-bold text-slate-300">
                    Evidence (optional)
                  </label>

                  <label
                    htmlFor="evidence"
                    className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-700 bg-slate-950/70 p-6 text-center transition hover:border-emerald-500/50 hover:bg-emerald-500/5"
                  >
                    <Upload className="mb-2 h-6 w-6 text-emerald-400" />
                    <span className="text-xs font-bold text-slate-200">
                      Choose evidence files
                    </span>
                    <span className="mt-1 text-[10px] text-slate-500">
                      JPG, PNG, WEBP, MP4, or PDF · Maximum 10 MB per file
                    </span>
                    <input
                      id="evidence"
                      type="file"
                      multiple
                      accept="image/jpeg,image/png,image/webp,video/mp4,application/pdf"
                      onChange={handleFileChange}
                      className="sr-only"
                    />
                  </label>

                  {existingEvidence.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <p className="text-[11px] font-bold text-slate-300">
                        Existing evidence
                      </p>
                      {existingEvidence.map((item, index) => (
                        <div key={item.evidence_id || index} className="rounded-lg bg-slate-950 px-3 py-2 text-xs text-slate-300">
                          {item.file_path?.split('/').pop() || `Evidence ${index + 1}`}
                        </div>
                      ))}
                    </div>
                  )}

                  {evidenceFiles.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <p className="text-[11px] font-bold text-slate-300">
                        New files
                      </p>
                      {evidenceFiles.map((file, index) => (
                        <div key={`${file.name}-${index}`} className="flex items-center justify-between gap-3 rounded-lg border border-slate-700 px-3 py-2">
                          <span className="truncate text-xs text-slate-300">
                            {file.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeNewFile(index)}
                            className="shrink-0 text-[10px] font-bold text-rose-400 hover:underline"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col-reverse justify-end gap-2 border-t border-slate-800 pt-4 sm:flex-row">
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={saving}
                  className="rounded-lg border border-slate-700 px-4 py-2.5 text-xs font-bold text-slate-300 hover:bg-slate-800 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving && <LoaderCircle className="h-4 w-4 animate-spin" />}
                  {saving
                    ? 'Saving...'
                    : editingReport
                      ? 'Save Changes'
                      : 'Submit Report'}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* Reports list */}
        <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 shadow-xl shadow-black/10">
          <div className="border-b border-slate-800 p-4 sm:p-5">
            <h2 className="text-sm font-extrabold text-white">
              Report History
            </h2>
            <p className="mt-1 text-[11px] text-slate-400">
              Search, view, and edit your pending reports.
            </p>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search reference number, title, or location..."
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2.5 pl-9 pr-3 text-xs text-slate-100 placeholder:text-slate-600 outline-none focus:border-emerald-500"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-xs text-slate-200 outline-none focus:border-emerald-500"
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status === 'All Statuses' ? status : formatStatus(status)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-xs text-slate-400">
              <LoaderCircle className="h-5 w-5 animate-spin" />
              Loading reports...
            </div>
          ) : filteredReports.length > 0 ? (
            <div className="divide-y divide-slate-800">
              {filteredReports.map((report) => (
                <article
                  key={report.report_id}
                  className="flex flex-col gap-4 p-4 transition hover:bg-slate-800/40 sm:flex-row sm:items-center sm:justify-between sm:p-5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-xs font-extrabold text-slate-100">
                        {report.title}
                      </h3>
                      <StatusBadge status={report.status} />
                    </div>

                    <p className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-400">
                      <MapPin className="h-3.5 w-3.5 text-emerald-400" />
                      {report.address_details}
                    </p>

                    <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-300">
                      {report.description}
                    </p>

                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] text-slate-500">
                      <span>
                        Ref: {report.reference_number || report.report_id}
                      </span>
                      <span>{report.category_name}</span>
                      <span>{report.station_name}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(report.submitted_at)}
                      </span>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-end">
                    <button
                      type="button"
                      onClick={() => setSelectedReport(report)}
                      className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-[10px] font-bold text-slate-300 transition hover:border-emerald-500/40 hover:text-emerald-300"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Details
                    </button>

                    {canEdit(report) && (
                      <button
                        type="button"
                        onClick={() => openEditForm(report)}
                        className="flex items-center gap-1.5 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-[10px] font-bold text-amber-300 hover:bg-amber-500/20"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="px-4 py-14 text-center">
              <FileText className="mx-auto mb-3 h-9 w-9 text-slate-600" />
              <h3 className="text-sm font-bold text-slate-200">
                No reports found
              </h3>
              <p className="mt-1 text-xs text-slate-400">
                Try changing your search or status filter, or create a new report.
              </p>
              <button
                type="button"
                onClick={openCreateForm}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-500"
              >
                <PlusCircle className="h-4 w-4" />
                Create Report
              </button>
            </div>
          )}
        </section>

        <footer className="py-3 text-center text-[10px] text-slate-500">
          BayanAlert · Community Hazard Reporting and Verification System
        </footer>
      </main>

      {/* Report details modal */}
      {selectedReport && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
          onClick={() => setSelectedReport(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-details-title"
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 text-slate-100 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 p-4">
              <div>
                <h2 id="report-details-title" className="text-sm font-extrabold text-white">
                  Report Details
                </h2>
                <p className="mt-1 text-[10px] text-slate-400">
                  {selectedReport.reference_number || selectedReport.report_id}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                aria-label="Close report details"
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-extrabold text-white">
                  {selectedReport.title}
                </h3>
                <StatusBadge status={selectedReport.status} />
              </div>

              {[
                ['Category', selectedReport.category_name],
                ['Station', selectedReport.station_name],
                ['Location', selectedReport.address_details],
                ['Submitted', formatDate(selectedReport.submitted_at)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                  <p className="text-[10px] text-slate-500">{label}</p>
                  <p className="mt-1 break-words text-xs font-semibold text-slate-200">
                    {value || 'Not provided'}
                  </p>
                </div>
              ))}

              <div>
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  Description
                </p>
                <p className="rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs leading-6 text-slate-300">
                  {selectedReport.description}
                </p>
              </div>

              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3">
                <p className="text-xs font-bold text-emerald-300">Current status</p>
                <p className="mt-1 text-[11px] leading-5 text-emerald-200">
                  {formatStatus(selectedReport.status)}
                </p>
              </div>

              {Array.isArray(selectedReport.evidence) &&
                selectedReport.evidence.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-bold text-slate-300">
                      Evidence
                    </p>
                    <div className="space-y-2">
                      {selectedReport.evidence.map((item, index) => (
                        <div
                          key={item.evidence_id || index}
                          className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs text-slate-300"
                        >
                          <FileText className="h-4 w-4 shrink-0 text-emerald-400" />
                          <span className="break-all">
                            {item.file_path?.split('/').pop() ||
                              `Evidence ${index + 1}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>

            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-800 p-4">
              {canEdit(selectedReport) && (
                <button
                  type="button"
                  onClick={() => openEditForm(selectedReport)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-2.5 text-xs font-bold text-amber-300 hover:bg-amber-500/20"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit Report
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                className="rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-500"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
