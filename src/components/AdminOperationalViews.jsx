import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  BadgeCheck,
  Building2,
  Copy,
  Edit3,
  Eye,
  Mail,
  MapPin,
  MapPinned,
  MoreHorizontal,
  Navigation,
  Phone,
  Search,
  Trash2,
  Users,
} from 'lucide-react';
import { AdminBarangayMap } from './AdminBarangayMap';
import { AdminStationsMap } from './AdminStationsMap';

const buttonBase = 'inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50';
const pillBase = 'rounded-full border px-3 py-1.5 text-[10px] font-bold transition';

function isEnabled(value) {
  return value === true || value === 1 || value === '1';
}

function hasCoordinates(record) {
  return record?.latitude !== null && record?.latitude !== undefined
    && record?.longitude !== null && record?.longitude !== undefined
    && String(record.latitude).trim() !== '' && String(record.longitude).trim() !== ''
    && Number.isFinite(Number(record.latitude)) && Number.isFinite(Number(record.longitude));
}

function initials(name) {
  return String(name || '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase() || 'U';
}

function formatCoordinates(record) {
  if (!hasCoordinates(record)) return 'Not specified';
  const latitude = Number(record?.latitude);
  const longitude = Number(record?.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return 'Not specified';
  return `${Math.abs(latitude).toFixed(4)}° ${latitude < 0 ? 'S' : 'N'}, ${Math.abs(longitude).toFixed(4)}° ${longitude < 0 ? 'W' : 'E'}`;
}

function StatusBadge({ children, tone = 'slate', title }) {
  const tones = {
    emerald: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300',
    orange: 'border-orange-500/25 bg-orange-500/10 text-orange-300',
    rose: 'border-rose-500/25 bg-rose-500/10 text-rose-300',
    cyan: 'border-cyan-500/25 bg-cyan-500/10 text-cyan-300',
    slate: 'border-slate-700 bg-slate-800/80 text-slate-300',
  };
  return (
    <span title={title} className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider ${tones[tone] || tones.slate}`}>
      {children}
    </span>
  );
}

export function AdminOperationalKpis({ items = [] }) {
  return (
    <section aria-label="Summary metrics" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => {
        const Icon = item.icon || Activity;
        return (
          <div key={item.label} className="rounded-xl border border-slate-800 bg-slate-900/65 px-4 py-3.5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">{item.label}</p>
                <p className="mt-1 text-2xl font-bold tracking-tight text-white">{item.value ?? '—'}</p>
                {item.note && <p className="mt-1 text-[10px] text-slate-500">{item.note}</p>}
              </div>
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl border ${item.tone === 'orange' ? 'border-orange-500/20 bg-orange-500/10 text-orange-300' : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'}`}>
                <Icon className="h-4 w-4" />
              </span>
            </div>
          </div>
        );
      })}
    </section>
  );
}

function SearchToolbar({ search, setSearch, onSearch, children, range }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/65 p-3.5 xl:flex-row xl:items-center xl:justify-between">
      <form onSubmit={onSearch} className="relative w-full xl:max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by name, contact, or location..."
          className="w-full rounded-lg border border-slate-700 bg-slate-950/70 py-2.5 pl-9 pr-3 text-xs text-slate-100 placeholder:text-slate-500 focus:border-orange-500/60 focus:outline-none"
        />
      </form>
      <div className="flex flex-wrap items-center gap-2">
        {children}
        <span className="ml-auto whitespace-nowrap text-[10px] font-medium text-slate-500 xl:ml-2">{range}</span>
      </div>
    </div>
  );
}

function FilterPill({ selected, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${pillBase} ${selected ? 'border-orange-500/40 bg-orange-500/10 text-orange-200' : 'border-slate-700 bg-slate-950/50 text-slate-400 hover:border-slate-600 hover:text-white'}`}
    >
      {children}
    </button>
  );
}

function RoleBadge({ role }) {
  const normalized = String(role || 'resident').toLowerCase();
  const isAdmin = normalized.includes('admin');
  const isStaff = normalized.includes('staff') || normalized.includes('responder');
  const tone = isAdmin
    ? 'border-orange-500/30 bg-orange-500/10 text-orange-300'
    : isStaff
      ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300'
      : 'border-slate-700 bg-slate-800 text-slate-300';
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider ${tone}`}>
      {role || 'Resident'}
    </span>
  );
}

function StrikeMeter({ count = 0, suspended, reason }) {
  const strikes = Math.max(0, Math.min(3, Number(count) || 0));
  return (
    <span
      title={suspended && reason ? `Suspension reason: ${reason}` : `${strikes} of 3 warning strikes`}
      className="inline-flex items-center gap-2 text-[10px] text-slate-400"
    >
      <span className="inline-flex items-center gap-1" aria-hidden="true">
        {[0, 1, 2].map((index) => (
          <i
            key={index}
            className={`h-2 w-2 rounded-full ${index < strikes ? (suspended ? 'bg-rose-400' : 'bg-orange-400') : 'border border-slate-600 bg-transparent'}`}
          />
        ))}
      </span>
      <span>{strikes}/3</span>
    </span>
  );
}

function ModerationMenu({
  row,
  recordId,
  actioning,
  onWarningStrike,
  onSuspensionToggle,
}) {
  const suspended = String(row.status || '').toLowerCase() === 'suspended';
  return (
    <details className="relative">
      <summary
        aria-label={`Moderation actions for ${row.full_name || 'user'}`}
        title="Moderation actions"
        className="inline-flex h-8 cursor-pointer list-none items-center gap-1 rounded-lg border border-slate-700 bg-slate-950 px-2 text-slate-400 transition hover:border-orange-500/40 hover:text-orange-300 [&::-webkit-details-marker]:hidden"
      >
        <MoreHorizontal className="h-4 w-4" />
        <span className="text-[9px] font-semibold">Moderation</span>
      </summary>
      <div className="absolute right-0 top-9 z-20 w-48 rounded-xl border border-slate-700 bg-slate-900 p-1.5 shadow-2xl">
        <button
          type="button"
          disabled={actioning || Number(row.warning_strikes) >= 3}
          onClick={() => onWarningStrike(recordId)}
          className="w-full rounded-lg px-3 py-2 text-left text-xs text-amber-200 transition hover:bg-amber-500/10 disabled:opacity-40"
        >
          Issue warning strike
        </button>
        <button
          type="button"
          disabled={actioning}
          onClick={() => onSuspensionToggle(row)}
          className={`w-full rounded-lg px-3 py-2 text-left text-xs transition disabled:opacity-40 ${suspended ? 'text-emerald-200 hover:bg-emerald-500/10' : 'text-rose-200 hover:bg-rose-500/10'}`}
        >
          {suspended ? 'Reactivate account' : 'Suspend account'}
        </button>
      </div>
    </details>
  );
}

function UserIdentity({ row }) {
  const verified = Boolean(row.email_verified_at);
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-orange-500/20 bg-orange-500/10 text-xs font-bold text-orange-200">
        {initials(row.full_name)}
      </span>
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-1.5 font-semibold text-slate-100">
          <span className="truncate">{row.full_name || 'Unnamed user'}</span>
          {verified && (
            <span title="Email verified" className="inline-flex items-center text-emerald-300">
              <BadgeCheck className="h-3.5 w-3.5" />
              <span className="sr-only">Email verified</span>
            </span>
          )}
        </span>
        <span className="mt-0.5 block truncate text-[10px] text-slate-500">
          {row.username ? `@${row.username} · ` : ''}{row.email || 'No email'}
        </span>
      </span>
    </div>
  );
}

export function UsersModerationView({
  rows = [],
  page,
  pageSize,
  total,
  search,
  setSearch,
  onSearch,
  primaryKey,
  currentUserId,
  actioningId,
  onDetails,
  onWarningStrike,
  onSuspensionToggle,
  onEdit,
  onDelete,
}) {
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [view, setView] = useState('table');
  const filteredRows = useMemo(() => rows.filter((row) => {
    const suspended = String(row.status || '').toLowerCase() === 'suspended';
    const accountStatus = String(row.account_status || '').toLowerCase();
    const statusMatches = statusFilter === 'all'
      || (statusFilter === 'active' && !suspended && accountStatus === 'active')
      || (statusFilter === 'suspended' && suspended)
      || (statusFilter === 'pending' && ['pending', 'inactive'].includes(accountStatus));
    const role = String(row.role_name || '').toLowerCase();
    const roleMatches = roleFilter === 'all'
      || (roleFilter === 'resident' && ['resident', 'user'].includes(role))
      || (roleFilter === 'staff' && (role.includes('staff') || role.includes('responder')))
      || (roleFilter === 'admin' && role.includes('admin'));
    return statusMatches && roleMatches;
  }), [rows, statusFilter, roleFilter]);
  const start = total ? (page - 1) * pageSize + 1 : 0;
  const end = Math.min(page * pageSize, total);

  const actions = (row) => {
    const id = row[primaryKey];
    const isCurrentUser = String(id) === String(currentUserId);
    return (
      <div className="flex items-center justify-end gap-1.5">
        <button type="button" onClick={() => onDetails(row)} title="View details" aria-label="View details" className="grid h-8 w-8 place-items-center rounded-lg border border-slate-700 text-slate-400 transition hover:border-emerald-500/30 hover:bg-emerald-500/10 hover:text-emerald-300">
          <Eye className="h-4 w-4" />
        </button>
        {!isCurrentUser && (
          <>
            <ModerationMenu
              row={row}
              recordId={id}
              actioning={String(actioningId) === String(id)}
              onWarningStrike={onWarningStrike}
              onSuspensionToggle={onSuspensionToggle}
            />
            <Link to={onEdit(id)} title="Edit user" aria-label="Edit user" className="grid h-8 w-8 place-items-center rounded-lg border border-slate-700 text-slate-400 transition hover:border-cyan-500/30 hover:bg-cyan-500/10 hover:text-cyan-300">
              <Edit3 className="h-4 w-4" />
            </Link>
            <button type="button" onClick={() => onDelete(id)} title="Delete user" aria-label="Delete user" className="grid h-8 w-8 place-items-center rounded-lg border border-slate-700 text-slate-400 transition hover:border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-300">
              <Trash2 className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
    );
  };

  return (
    <section className="space-y-3">
      <SearchToolbar search={search} setSearch={setSearch} onSearch={onSearch} range={`Showing ${start}–${end} of ${total}`}>
        <div className="flex flex-wrap gap-1.5" aria-label="Account status filter">
          {['all', 'active', 'suspended', 'pending'].map((filter) => (
            <FilterPill key={filter} selected={statusFilter === filter} onClick={() => setStatusFilter(filter)}>
              {filter === 'all' ? 'All status' : filter}
            </FilterPill>
          ))}
        </div>
        <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} aria-label="Filter by role" className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1.5 text-[10px] font-bold text-slate-300">
          <option value="all">All roles</option>
          <option value="admin">Admin</option>
          <option value="staff">Staff</option>
          <option value="resident">Resident</option>
        </select>
        <div className="flex rounded-lg border border-slate-700 bg-slate-950 p-1" aria-label="Users view">
          <button type="button" onClick={() => setView('table')} aria-pressed={view === 'table'} className={`rounded-md px-2.5 py-1 text-[10px] font-bold ${view === 'table' ? 'bg-slate-800 text-white' : 'text-slate-500'}`}>Table</button>
          <button type="button" onClick={() => setView('grid')} aria-pressed={view === 'grid'} className={`rounded-md px-2.5 py-1 text-[10px] font-bold ${view === 'grid' ? 'bg-slate-800 text-white' : 'text-slate-500'}`}>Grid</button>
        </div>
      </SearchToolbar>
      <p className="px-1 text-[10px] text-slate-500">Status and role filters apply to the currently loaded page.</p>

      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60">
        {filteredRows.length === 0 ? (
          <div className="px-5 py-16 text-center text-sm text-slate-500">No users match these filters on this page.</div>
        ) : view === 'table' ? (
          <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[740px] text-left text-xs">
              <thead className="border-b border-slate-800 bg-slate-950/80 text-[9px] uppercase tracking-[0.16em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Account status</th>
                  <th className="px-4 py-3">Warnings</th>
                  <th className="sticky right-0 bg-slate-950 px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {filteredRows.map((row) => {
                  const suspended = String(row.status || '').toLowerCase() === 'suspended';
                  const accountStatus = String(row.account_status || 'unknown');
                  return (
                    <tr key={row[primaryKey]} className="transition hover:bg-slate-800/30">
                      <td className="max-w-[360px] px-4 py-3.5"><UserIdentity row={row} /></td>
                      <td className="px-4 py-3.5"><RoleBadge role={row.role_name} /></td>
                      <td className="px-4 py-3.5">
                        <StatusBadge tone={suspended ? 'rose' : accountStatus === 'active' ? 'emerald' : 'orange'} title={suspended && row.suspension_reason ? `Suspension reason: ${row.suspension_reason}` : undefined}>
                          {suspended ? 'Suspended' : accountStatus}
                        </StatusBadge>
                      </td>
                      <td className="px-4 py-3.5"><StrikeMeter count={row.warning_strikes} suspended={suspended} reason={row.suspension_reason} /></td>
                      <td className="sticky right-0 bg-slate-900 px-4 py-3.5 text-right">{actions(row)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="grid gap-3 p-3 md:hidden">
            {filteredRows.map((row) => {
              const suspended = String(row.status || '').toLowerCase() === 'suspended';
              const accountStatus = String(row.account_status || 'unknown');
              return (
                <article key={row[primaryKey]} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <UserIdentity row={row} />
                    {actions(row)}
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <RoleBadge role={row.role_name} />
                    <StatusBadge tone={suspended ? 'rose' : accountStatus === 'active' ? 'emerald' : 'orange'}>{suspended ? 'Suspended' : accountStatus}</StatusBadge>
                    <StrikeMeter count={row.warning_strikes} suspended={suspended} reason={row.suspension_reason} />
                  </div>
                </article>
              );
            })}
          </div>
          </>
        ) : (
          <div className="grid gap-3 p-3 md:grid-cols-2">
            {filteredRows.map((row) => {
              const suspended = String(row.status || '').toLowerCase() === 'suspended';
              const accountStatus = String(row.account_status || 'unknown');
              return (
                <article key={row[primaryKey]} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <UserIdentity row={row} />
                    {actions(row)}
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <RoleBadge role={row.role_name} />
                    <StatusBadge tone={suspended ? 'rose' : accountStatus === 'active' ? 'emerald' : 'orange'}>{suspended ? 'Suspended' : accountStatus}</StatusBadge>
                    <StrikeMeter count={row.warning_strikes} suspended={suspended} reason={row.suspension_reason} />
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

export function BarangaysDirectoryView({
  rows = [],
  allBarangays = [],
  incidentCounts = null,
  primaryKey,
  page,
  pageSize,
  total,
  search,
  setSearch,
  onSearch,
  selectedBarangayId,
  setSelectedBarangayId,
  actioningId,
  onToggle,
  onDetails,
  onDelete,
  editPath,
}) {
  const [statusFilter, setStatusFilter] = useState('all');
  const [showMap, setShowMap] = useState(true);
  const filteredRows = rows.filter((row) => (
    statusFilter === 'all'
    || (statusFilter === 'active' && isEnabled(row.is_active))
    || (statusFilter === 'inactive' && !isEnabled(row.is_active))
  ));
  const start = total ? (page - 1) * pageSize + 1 : 0;
  const end = Math.min(page * pageSize, total);

  return (
    <section className="space-y-3">
      <SearchToolbar search={search} setSearch={setSearch} onSearch={onSearch} range={`Showing ${start}–${end} of ${total}`}>
        <div className="flex flex-wrap gap-1.5" aria-label="Barangay status filter">
          {['all', 'active', 'inactive'].map((filter) => (
            <FilterPill key={filter} selected={statusFilter === filter} onClick={() => setStatusFilter(filter)}>
              {filter === 'all' ? 'All barangays' : filter}
            </FilterPill>
          ))}
        </div>
        <div className="flex rounded-lg border border-slate-700 bg-slate-950 p-1" aria-label="Barangays view">
          <button type="button" onClick={() => setShowMap(true)} aria-pressed={showMap} className={`rounded-md px-2.5 py-1 text-[10px] font-bold ${showMap ? 'bg-slate-800 text-white' : 'text-slate-500'}`}>Split map</button>
          <button type="button" onClick={() => setShowMap(false)} aria-pressed={!showMap} className={`rounded-md px-2.5 py-1 text-[10px] font-bold ${!showMap ? 'bg-slate-800 text-white' : 'text-slate-500'}`}>List</button>
        </div>
      </SearchToolbar>
      <div className={`grid items-start gap-4 ${showMap ? 'lg:grid-cols-12' : 'grid-cols-1'}`}>
        <div className={`space-y-2 ${showMap ? 'lg:col-span-7' : ''}`}>
          {filteredRows.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-5 py-16 text-center text-sm text-slate-500">No barangays match these filters on this page.</div>
          ) : filteredRows.map((row) => {
            const active = isEnabled(row.is_active);
            const selected = String(selectedBarangayId) === String(row[primaryKey]);
            const incidents = incidentCounts
              ? incidentCounts[String(row[primaryKey])] || 0
              : '—';
            return (
              <article
                key={row[primaryKey]}
                className={`rounded-xl border bg-slate-900/65 p-4 transition ${selected ? 'border-orange-500/45 shadow-lg shadow-orange-950/20' : 'border-slate-800 hover:border-slate-700'}`}
                onClick={() => setSelectedBarangayId(row[primaryKey])}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-300">
                      <MapPinned className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-bold text-white">{row.barangay_name || 'Unnamed barangay'}</h3>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <StatusBadge tone={active ? 'emerald' : 'slate'}>{active ? 'Monitored' : 'Inactive'}</StatusBadge>
                        <span title="Reports submitted by residents registered in this barangay" className="inline-flex items-center gap-1 rounded-full border border-orange-500/20 bg-orange-500/5 px-2.5 py-1 text-[9px] font-bold text-orange-200">
                          <Activity className="h-3 w-3" />{incidents} reports
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={active}
                    aria-label={`${active ? 'Deactivate' : 'Activate'} ${row.barangay_name}`}
                    disabled={String(actioningId) === String(row[primaryKey])}
                    onClick={(event) => { event.stopPropagation(); onToggle(row); }}
                    className={`relative h-6 w-11 shrink-0 rounded-full border transition ${active ? 'border-emerald-400/40 bg-emerald-500/30' : 'border-slate-700 bg-slate-800'} disabled:opacity-50`}
                  >
                    <span className={`absolute top-0.5 h-4 w-4 rounded-full transition ${active ? 'left-[22px] bg-emerald-300' : 'left-0.5 bg-slate-400'}`} />
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
                  <span className="rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1.5 font-mono">{formatCoordinates(row)}</span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-800/80 pt-3">
                  <button type="button" onClick={(event) => { event.stopPropagation(); setSelectedBarangayId(row[primaryKey]); }} className={`${buttonBase} border-cyan-500/25 bg-cyan-500/5 text-cyan-200 hover:bg-cyan-500/10`}>
                    <Navigation className="h-3.5 w-3.5" />Locate
                  </button>
                  <button type="button" onClick={(event) => { event.stopPropagation(); onDetails(row); }} className={`${buttonBase} border-slate-700 bg-slate-950 text-slate-300 hover:text-white`}>
                    <Eye className="h-3.5 w-3.5" />Details
                  </button>
                  <Link onClick={(event) => event.stopPropagation()} to={editPath(row[primaryKey])} className={`${buttonBase} border-slate-700 bg-slate-950 text-slate-300 hover:text-white`}>
                    Edit
                  </Link>
                  <button type="button" onClick={(event) => { event.stopPropagation(); onDelete(row[primaryKey]); }} className={`${buttonBase} border-rose-500/25 bg-rose-500/5 text-rose-300 hover:bg-rose-500/10`}>
                    Delete
                  </button>
                </div>
              </article>
            );
          })}
        </div>
        {showMap && (
          <div className="lg:sticky lg:top-4 lg:col-span-5">
            <div className="mb-2 flex items-center justify-between px-1">
              <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-slate-300">Calapan barangay map</h2>
              <span className="text-[10px] text-slate-500">{allBarangays.length || rows.length} directory entries</span>
            </div>
            <AdminBarangayMap
              barangays={allBarangays.length ? allBarangays : rows}
              selectedBarangayId={selectedBarangayId}
              onSelect={(record) => setSelectedBarangayId(record[primaryKey])}
            />
          </div>
        )}
      </div>
    </section>
  );
}

const DEPARTMENT_TONES = {
  BFP: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
  CDRRMO: 'border-orange-500/30 bg-orange-500/10 text-orange-300',
  PCG: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300',
  DOH: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
};

function StationMeta({ icon: Icon, label, value, href, onCopy }) {
  const displayValue = value ? String(value) : 'Not specified';
  return (
    <div className="flex min-w-0 items-start gap-2.5">
      <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-slate-800 bg-slate-950 text-slate-500">
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-500">{label}</p>
        {href && value ? (
          <a href={href} className="mt-1 block break-all text-xs text-slate-200 transition hover:text-cyan-300">{displayValue}</a>
        ) : (
          <p className="mt-1 break-words text-xs text-slate-200">{displayValue}</p>
        )}
      </div>
      {onCopy && value && (
        <button type="button" onClick={() => onCopy(String(value))} title={`Copy ${label}`} aria-label={`Copy ${label}`} className="mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-800 hover:text-white">
          <Copy className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

export function ResponseStationsView({
  rows = [],
  allStations = [],
  primaryKey,
  page,
  pageSize,
  total,
  search,
  setSearch,
  onSearch,
  onDetails,
  onDelete,
  editPath,
  onCopy,
}) {
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedStationId, setSelectedStationId] = useState(null);
  const [showMap, setShowMap] = useState(true);
  const filteredRows = rows.filter((row) => (
    statusFilter === 'all'
    || (statusFilter === 'active' && isEnabled(row.is_active))
    || (statusFilter === 'inactive' && !isEnabled(row.is_active))
  ));
  const start = total ? (page - 1) * pageSize + 1 : 0;
  const end = Math.min(page * pageSize, total);

  return (
    <section className="space-y-3">
      <SearchToolbar search={search} setSearch={setSearch} onSearch={onSearch} range={`Showing ${start}–${end} of ${total}`}>
        <div className="flex flex-wrap gap-1.5" aria-label="Station status filter">
          {['all', 'active', 'inactive'].map((filter) => (
            <FilterPill key={filter} selected={statusFilter === filter} onClick={() => setStatusFilter(filter)}>
              {filter === 'all' ? 'All stations' : filter}
            </FilterPill>
          ))}
        </div>
        <button type="button" onClick={() => setShowMap((current) => !current)} aria-expanded={showMap} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-[10px] font-semibold text-slate-300 transition hover:border-orange-500/30 hover:text-white">
          {showMap ? 'Hide map preview' : 'Show map preview'}
        </button>
      </SearchToolbar>
      {showMap && (
        <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/65">
          <div className="flex items-center justify-between gap-3 border-b border-slate-800 px-4 py-3">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-slate-200">Station map preview</h2>
              <p className="mt-1 text-[10px] text-slate-500">Select a pin or use “View on map” to focus a response station.</p>
            </div>
            <span className="text-[10px] text-slate-500">{(allStations.length ? allStations : rows).filter(hasCoordinates).length} pinned</span>
          </div>
          <AdminStationsMap
            stations={allStations.length ? allStations : rows}
            selectedStationId={selectedStationId}
            onSelect={(station) => setSelectedStationId(station.station_id)}
          />
        </section>
      )}
      {filteredRows.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-5 py-16 text-center text-sm text-slate-500">No stations match these filters on this page.</div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filteredRows.map((station) => {
            const department = String(station.department_code || '').toUpperCase();
            const departmentTone = DEPARTMENT_TONES[department] || 'border-slate-700 bg-slate-800 text-slate-300';
            const active = isEnabled(station.is_active);
            const latitude = Number(station.latitude);
            const longitude = Number(station.longitude);
            const stationHasCoordinates = hasCoordinates(station);
            const mapUrl = stationHasCoordinates
              ? `https://www.google.com/maps?q=${encodeURIComponent(`${latitude},${longitude}`)}`
              : null;
            return (
              <article key={station[primaryKey]} className={`overflow-hidden rounded-2xl border bg-slate-900/70 shadow-sm transition hover:border-slate-700 hover:shadow-lg hover:shadow-black/10 ${String(selectedStationId) === String(station[primaryKey]) ? 'border-orange-500/45' : 'border-slate-800'}`}>
                <div className="flex items-start justify-between gap-3 border-b border-slate-800 px-4 py-4 sm:px-5">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border ${departmentTone}`}>
                      <Building2 className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider ${departmentTone}`}>{department || 'UNIT'}</span>
                        <StatusBadge tone={active ? 'emerald' : 'slate'}>{active ? 'Active' : 'Inactive'}</StatusBadge>
                      </div>
                      <h3 className="mt-2 break-words text-sm font-bold text-white">{station.station_name || 'Unnamed response station'}</h3>
                    </div>
                  </div>
                  <button type="button" onClick={() => onDetails(station)} title="View station details" aria-label="View station details" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-slate-700 text-slate-400 transition hover:border-cyan-500/30 hover:text-cyan-300">
                    <Eye className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid gap-x-4 gap-y-4 px-4 py-4 sm:grid-cols-2 sm:px-5">
                  <StationMeta icon={MapPin} label="Address" value={station.address_details} />
                  <StationMeta icon={Phone} label="Hotline / contact" value={station.contact_number} onCopy={onCopy} />
                  <StationMeta icon={Mail} label="Contact email" value={station.contact_email} href={station.contact_email ? `mailto:${station.contact_email}` : null} />
                  <StationMeta icon={MapPinned} label="Pinned coordinates" value={stationHasCoordinates ? formatCoordinates(station) : null} href={null} />
                </div>
                {station.station_info && (
                  <p className="mx-4 mb-4 rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs leading-5 text-slate-400 sm:mx-5">
                    {station.station_info}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-2 border-t border-slate-800 bg-slate-950/35 px-4 py-3 sm:px-5">
                  {mapUrl ? (
                    <button type="button" onClick={() => setSelectedStationId(station[primaryKey])} className={`${buttonBase} border-cyan-500/25 bg-cyan-500/5 text-cyan-200 hover:bg-cyan-500/10`}>
                      <MapPin className="h-3.5 w-3.5" />View on map
                    </button>
                  ) : (
                    <span className={`${buttonBase} cursor-not-allowed border-slate-800 bg-slate-950 text-slate-600`} title="Coordinates not specified">
                      <MapPin className="h-3.5 w-3.5" />No map pin
                    </span>
                  )}
                  <Link to={editPath(station[primaryKey])} className={`${buttonBase} border-slate-700 bg-slate-950 text-slate-300 hover:text-white`}>Edit station</Link>
                  <button type="button" onClick={() => onDelete(station[primaryKey])} className={`${buttonBase} border-rose-500/25 bg-rose-500/5 text-rose-300 hover:bg-rose-500/10`}>Delete</button>
                </div>
              </article>
            );
          })}
        </div>
      )}
      {allStations.length > 0 && (
        <p className="px-1 text-[10px] text-slate-500">Contact details are provided for {allStations.length} response {allStations.length === 1 ? 'station' : 'stations'}.</p>
      )}
    </section>
  );
}
