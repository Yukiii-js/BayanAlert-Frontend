import {
  Building2,
  ClipboardList,
  Database,
  FileClock,
  FileText,
  FolderKanban,
  LayoutDashboard,
  MapPinned,
  Megaphone,
  PlugZap,
  Radio,
  Siren,
  Tags,
  Users,
} from 'lucide-react';

export const ADMIN_NAVIGATION = [
  {
    title: 'Command & Operations',
    items: [
      {
        label: 'Dashboard',
        subtitle: 'Live map, KPIs, and regional alerts',
        to: '/admin',
        icon: LayoutDashboard,
        count: (metrics) => metrics?.report_count,
        countLabel: 'reports',
        matches: (pathname, hash) => pathname === '/admin' && hash !== '#regional-advisories',
      },
      {
        label: 'Hazard Reports',
        subtitle: 'Triage reports, evidence, and duplicates',
        to: '/admin/tables/hazard_reports',
        icon: Siren,
        count: (metrics) => metrics?.pending_reports,
        countLabel: 'pending',
        matches: (pathname) => pathname.startsWith('/admin/tables/hazard_reports'),
      },
      {
        label: 'Dispatch & Assignments',
        subtitle: 'Assign response units and track resolutions',
        to: '/admin/dispatch',
        icon: ClipboardList,
        count: (metrics) => {
          if (!metrics?.counts) return undefined;
          return Number(metrics.counts.report_assignments || 0) + Number(metrics.counts.resolutions || 0);
        },
        countLabel: 'records',
        matches: (pathname) => pathname.startsWith('/admin/dispatch')
          || pathname.startsWith('/admin/tables/report_assignments')
          || pathname.startsWith('/admin/tables/resolutions'),
      },
      {
        label: 'Regional Advisories',
        subtitle: 'External hazard alerts and intelligence',
        to: '/admin#regional-advisories',
        icon: Radio,
        matches: (pathname, hash) => pathname === '/admin' && hash === '#regional-advisories',
      },
    ],
  },
  {
    title: 'Directory & Infrastructure',
    items: [
      {
        label: 'Response Stations',
        subtitle: 'Manage units, contacts, and map locations',
        to: '/admin/tables/stations',
        icon: Building2,
        count: (metrics) => metrics?.counts?.stations,
        countLabel: 'stations',
        matches: (pathname) => pathname.startsWith('/admin/tables/stations'),
      },
      {
        label: 'Barangays',
        subtitle: 'Manage the Calapan barangay directory',
        to: '/admin/tables/barangays',
        icon: MapPinned,
        count: (metrics) => metrics?.counts?.barangays,
        countLabel: 'barangays',
        matches: (pathname) => pathname.startsWith('/admin/tables/barangays'),
      },
      {
        label: 'Hazard Categories',
        subtitle: 'Manage incident types and defaults',
        to: '/categories',
        icon: Tags,
        count: (metrics) => metrics?.counts?.hazard_categories,
        countLabel: 'types',
        matches: (pathname) => pathname === '/categories',
      },
    ],
  },
  {
    title: 'People & Access',
    items: [
      {
        label: 'Users & Moderation',
        subtitle: 'Accounts, roles, strikes, and suspensions',
        to: '/admin/tables/users',
        icon: Users,
        count: (metrics) => metrics?.active_users,
        countLabel: 'active',
        matches: (pathname) => pathname.startsWith('/admin/tables/users')
          || pathname.startsWith('/admin/tables/roles'),
      },
    ],
  },
  {
    title: 'System, APIs & Reports',
    items: [
      {
        label: 'API Management',
        subtitle: 'External feeds, credentials, and health',
        to: '/admin/api-management',
        icon: PlugZap,
        count: (metrics) => metrics?.api_count,
        countLabel: 'APIs',
        matches: (pathname) => pathname.startsWith('/admin/api-management'),
      },
      {
        label: 'PDF Reports',
        subtitle: 'Generate official incident reports',
        to: '/admin/reports',
        icon: FileText,
        count: (metrics) => metrics?.report_count,
        countLabel: 'reports',
        matches: (pathname) => pathname.startsWith('/admin/reports'),
      },
      {
        label: 'Audit & Status History',
        subtitle: 'Read-only report and system history',
        to: '/admin/tables/report_status_history',
        icon: FileClock,
        count: (metrics) => metrics?.counts?.report_status_history,
        countLabel: 'events',
        matches: (pathname) => pathname.startsWith('/admin/tables/report_status_history'),
      },
      {
        label: 'Announcements',
        subtitle: 'Send resident notices and updates',
        to: '/admin/notifications',
        icon: Megaphone,
        count: (metrics) => metrics?.counts?.notifications,
        countLabel: 'sent',
        matches: (pathname) => pathname.startsWith('/admin/notifications'),
      },
      {
        label: 'Database Registers',
        subtitle: 'Inspect all 14 low-level data tables',
        to: '/admin/registers',
        icon: Database,
        count: (metrics) => metrics?.register_count ?? 14,
        countLabel: 'tables',
        matches: (pathname) => pathname.startsWith('/admin/registers'),
      },
    ],
  },
];

export const REGISTER_GROUP_ICONS = {
  Operations: FolderKanban,
  Directory: MapPinned,
  'People & access': Users,
  'System data': Database,
};
