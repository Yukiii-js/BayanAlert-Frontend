import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  ChevronLeft,
  ChevronRight,
  LogOut,
  Menu,
  UserRound,
  X,
} from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { NotificationDropdown } from './NotificationDropdown';
import { ADMIN_NAVIGATION } from './adminNavigation';
import { api } from '../api/client';

function getActiveView(pathname, hash) {
  for (const group of ADMIN_NAVIGATION) {
    const item = group.items.find((candidate) => candidate.matches(pathname, hash));
    if (item) return item.label;
  }
  if (pathname.startsWith('/admin/tables/')) return 'Database Registers';
  return 'Operations';
}

function NavigationLink({ item, metrics, pathname, hash, onNavigate, compact = false }) {
  const Icon = item.icon;
  const active = item.matches(pathname, hash);
  const count = item.count?.(metrics);
  const badge = Number.isFinite(Number(count)) ? String(Number(count)) : '';

  return (
    <Link
      to={item.to}
      onClick={onNavigate}
      title={compact ? `${item.label}: ${item.subtitle}${badge ? ` (${badge} ${item.countLabel || ''})` : ''}` : undefined}
      aria-current={active ? 'page' : undefined}
      className={`group flex min-w-0 items-center gap-3 rounded-xl border transition ${
        compact ? 'relative justify-center p-2.5' : 'p-3'
      } ${
        active
          ? 'border-orange-500/30 bg-gradient-to-r from-orange-500/15 to-emerald-500/10 text-white'
          : 'border-transparent text-slate-300 hover:border-slate-700 hover:bg-slate-800/80 hover:text-white'
      }`}
    >
      <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-orange-300' : 'text-cyan-300'}`} />
      {!compact && (
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-2">
            <span className="truncate text-xs font-bold">{item.label}</span>
            {badge && (
              <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-bold ${
                active
                  ? 'border-orange-400/20 bg-orange-500/10 text-orange-200'
                  : 'border-slate-700 bg-slate-950 text-slate-300'
              }`}>
                {badge}{item.countLabel ? ` ${item.countLabel}` : ''}
              </span>
            )}
          </span>
          <span className="mt-1 block truncate text-[10px] leading-4 text-slate-500">{item.subtitle}</span>
        </span>
      )}
      {compact && badge && (
        <span className="absolute right-1 top-1 rounded-full bg-orange-500 px-1 text-[8px] font-bold leading-4 text-slate-950">
          {Number(count) > 99 ? '99+' : badge}
        </span>
      )}
    </Link>
  );
}

export function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const menuButtonRef = useRef(null);
  const menuPanelRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [metrics, setMetrics] = useState(null);
  const [metricsError, setMetricsError] = useState(false);
  const activeView = getActiveView(location.pathname, location.hash);

  useEffect(() => {
    let active = true;
    async function loadMetrics() {
      const [dashboardResult, apiResult] = await Promise.allSettled([
        api.getDashboard(),
        api.getSystemApis(),
      ]);
      if (!active) return;

      const dashboardData = dashboardResult.status === 'fulfilled'
        ? dashboardResult.value?.data || {}
        : {};
      const apiConfigs = apiResult.status === 'fulfilled'
        ? apiResult.value?.data?.apis
        : null;
      setMetrics({
        ...dashboardData,
        api_count: Array.isArray(apiConfigs) ? apiConfigs.length : undefined,
      });
      setMetricsError(
        dashboardResult.status === 'rejected' ||
        apiResult.status === 'rejected' ||
        !Array.isArray(apiConfigs)
      );
    }

    loadMetrics();
    const timer = window.setInterval(loadMetrics, 60000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname, location.search, location.hash]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    function dismissMenu(event) {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
        return;
      }
      if (
        event.type === 'pointerdown' &&
        !menuPanelRef.current?.contains(event.target) &&
        !menuButtonRef.current?.contains(event.target)
      ) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('keydown', dismissMenu);
    document.addEventListener('pointerdown', dismissMenu);
    return () => {
      document.removeEventListener('keydown', dismissMenu);
      document.removeEventListener('pointerdown', dismissMenu);
    };
  }, [menuOpen]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="min-h-screen bg-[#080E1E] text-slate-100">
      <header className="sticky top-0 z-50 border-b border-transparent bg-slate-900/90 shadow-[0_1px_0_rgba(249,115,22,0.08)] backdrop-blur-xl after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-gradient-to-r after:from-orange-500/50 after:via-cyan-500/30 after:to-slate-700/80">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3 sm:gap-5">
            <Link to="/admin" className="group flex shrink-0 items-center gap-2.5">
              <span className="relative flex h-10 w-10 items-center justify-center">
                <span className="absolute inset-0 rounded-full bg-gradient-to-tr from-orange-500/20 via-amber-500/10 to-cyan-500/15 blur-lg" />
                <BrandLogo className="relative h-10 w-10 drop-shadow-[0_0_14px_rgba(249,115,22,0.2)] transition-transform group-hover:scale-105" />
              </span>
              <span className="hidden min-[375px]:block">
                <span className="block bg-gradient-to-r from-white to-slate-300 bg-clip-text text-lg font-bold tracking-tight text-transparent">
                  BayanAlert
                </span>
                <span className="-mt-1 block text-[10px] font-semibold uppercase tracking-wider text-orange-400">
                  Ops Center
                </span>
              </span>
            </Link>

            <button
              ref={menuButtonRef}
              type="button"
              onClick={() => setMenuOpen((current) => !current)}
              aria-expanded={menuOpen}
              aria-controls="admin-navigation-panel"
              aria-label={`${menuOpen ? 'Close' : 'Open'} navigation menu. Active view: ${activeView}`}
              className={`inline-flex min-w-0 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                menuOpen
                  ? 'border-orange-500/40 bg-gradient-to-r from-orange-500/15 to-emerald-500/10 text-white'
                  : 'border-slate-700 bg-slate-950/60 text-slate-300 hover:border-orange-500/40 hover:text-white'
              }`}
            >
              {menuOpen ? <X className="h-4 w-4 shrink-0 text-orange-300" /> : <Menu className="h-4 w-4 shrink-0 text-orange-300" />}
              <span className="hidden sm:inline">Menu</span>
              <span className="max-w-28 truncate border-l border-slate-700 pl-2 text-[10px] text-slate-400 sm:max-w-36">
                {activeView}
              </span>
            </button>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <NotificationDropdown role="admin" />
            <div
              className="flex max-w-40 items-center gap-2 rounded-lg border border-orange-500/20 bg-orange-500/[0.07] px-2 py-1.5 sm:max-w-64 sm:px-3"
              title={`${user?.full_name || 'Admin'} · ${user?.role_name || 'Admin'}`}
            >
              <UserRound className="h-4 w-4 shrink-0 text-orange-300" />
              <span className="hidden min-w-0 sm:block">
                <span className="block truncate text-xs font-semibold text-slate-200">
                  {user?.full_name || 'Admin'}
                </span>
                <span className="hidden text-[9px] font-bold uppercase tracking-wide text-orange-300 sm:block">
                  {user?.role_name || 'Admin'}
                </span>
              </span>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              title="Sign out"
              className="inline-flex items-center gap-1.5 rounded-lg border border-transparent px-2.5 py-2 text-xs font-semibold text-slate-400 transition hover:border-orange-500/20 hover:bg-orange-500/10 hover:text-orange-300 sm:px-3"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>

        {menuOpen && <button type="button" aria-label="Close navigation menu" onClick={closeMenu} className="fixed inset-0 z-[39] bg-slate-950/45" />}
        <div
          id="admin-navigation-panel"
          ref={menuPanelRef}
          aria-hidden={!menuOpen}
          className={`absolute inset-x-0 top-full z-[60] mx-auto max-h-[calc(100vh-4.5rem)] max-w-7xl overflow-y-auto rounded-b-2xl border border-slate-700/80 bg-[#080E1E]/[0.98] p-4 shadow-2xl shadow-black/50 transition duration-200 sm:p-5 ${
            menuOpen ? 'visible translate-y-0 opacity-100' : 'invisible -translate-y-2 opacity-0 pointer-events-none'
          }`}
        >
          <div className="mb-4 flex items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-orange-400">Admin navigation</p>
              <p className="mt-1 text-xs text-slate-400">Choose a workflow or open a database register.</p>
            </div>
            <div className="flex items-center gap-2">
              {metricsError && <span role="status" className="hidden text-[10px] text-amber-300 sm:inline">Live counts unavailable</span>}
              <button
                type="button"
                onClick={() => {
                  setSidebarVisible(true);
                  setMenuOpen(false);
                }}
                className="hidden rounded-lg border border-slate-700 px-3 py-2 text-[10px] font-semibold text-slate-300 transition hover:border-orange-500/40 hover:text-white xl:inline-flex"
              >
                Use desktop sidebar
              </button>
              <button type="button" onClick={closeMenu} aria-label="Close navigation menu" className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          {metricsError && (
            <p role="status" className="mb-3 text-[10px] text-amber-300 sm:hidden">
              Live counts are temporarily unavailable.
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {ADMIN_NAVIGATION.map((group) => (
              <section key={group.title} aria-label={group.title} className="min-w-0">
                <h2 className="mb-2 text-[10px] font-extrabold uppercase tracking-wider text-cyan-300">
                  {group.title}
                </h2>
                <div className="space-y-1.5">
                  {group.items.map((item) => (
                    <NavigationLink
                      key={item.label}
                      item={item}
                      metrics={metrics}
                      pathname={location.pathname}
                      hash={location.hash}
                      onNavigate={closeMenu}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </header>

      {sidebarVisible && (
        <aside className={`fixed bottom-0 left-0 top-16 z-40 hidden flex-col border-r border-slate-800 bg-[#080E1E]/[0.98] p-3 shadow-2xl shadow-black/30 transition-all duration-300 xl:flex ${
          sidebarCollapsed ? 'w-16' : 'w-64'
        }`}>
          <div className={`mb-3 flex items-center border-b border-slate-800 pb-3 ${sidebarCollapsed ? 'justify-center' : 'justify-between gap-2 px-1'}`}>
            {!sidebarCollapsed && <span className="text-[10px] font-bold uppercase tracking-wider text-orange-400">Operations menu</span>}
            <button
              type="button"
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar to icons'}
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar to icons'}
              onClick={() => setSidebarCollapsed((current) => !current)}
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-orange-300"
            >
              {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>
          <nav aria-label="Admin sidebar navigation" className="min-h-0 flex-1 space-y-4 overflow-y-auto">
            {ADMIN_NAVIGATION.map((group) => (
              <section key={group.title}>
                {!sidebarCollapsed && <h2 className="mb-1.5 px-2 text-[9px] font-bold uppercase tracking-wider text-slate-500">{group.title}</h2>}
                <div className="space-y-1">
                  {group.items.map((item) => (
                    <NavigationLink
                      key={item.label}
                      item={item}
                      metrics={metrics}
                      pathname={location.pathname}
                      hash={location.hash}
                      onNavigate={closeMenu}
                      compact={sidebarCollapsed}
                    />
                  ))}
                </div>
              </section>
            ))}
          </nav>
          <button
            type="button"
            onClick={() => {
              setSidebarVisible(false);
              setSidebarCollapsed(false);
            }}
            className={`mt-3 flex items-center justify-center gap-2 rounded-lg border border-slate-800 px-2 py-2 text-[10px] font-semibold text-slate-400 hover:border-orange-500/30 hover:text-orange-300 ${sidebarCollapsed ? '' : 'w-full'}`}
            title="Close sidebar"
            aria-label="Close sidebar"
          >
            <X className="h-3.5 w-3.5" />
            {!sidebarCollapsed && 'Close sidebar'}
          </button>
        </aside>
      )}

      <div className={`transition-[margin] duration-300 ${sidebarVisible ? (sidebarCollapsed ? 'xl:ml-16' : 'xl:ml-64') : ''}`}>
        <main className="mx-auto min-h-[calc(100vh-9rem)] w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </main>
        <footer className="relative border-t border-orange-500/20 bg-slate-900/30 py-6 text-center text-xs text-slate-500 before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-orange-500/30 before:via-cyan-500/25 before:to-transparent">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 sm:flex-row sm:px-6 lg:px-8">
            <span>&copy; {new Date().getFullYear()} BayanAlert &bull; Decoupled Architecture (LavaLust API + React)</span>
            <span className="inline-flex items-center gap-2 text-slate-400">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400/60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              Secure Emergency Incident Management
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}
