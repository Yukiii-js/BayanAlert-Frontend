import React, { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  Database, 
  Tags, 
  LogOut, 
  User, 
  Megaphone,
  FileText,
  PlugZap,
  Menu,
  X,
} from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { NotificationDropdown } from './NotificationDropdown';

export function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname, location.search, location.hash]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-900/80 shadow-[0_1px_0_rgba(249,115,22,0.08)] backdrop-blur after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-gradient-to-r after:from-transparent after:via-orange-500/40 after:to-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-16 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3 xl:gap-8">
            <Link to="/admin" className="flex items-center gap-2.5 group">
              <div className="flex h-10 w-10 items-center justify-center drop-shadow-[0_0_14px_rgba(249,115,22,0.16)] transition-transform group-hover:scale-105">
                <BrandLogo className="h-10 w-10" />
              </div>
              <div>
                <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                  BayanAlert
                </span>
                <span className="block text-[10px] text-emerald-400 font-semibold uppercase tracking-wider -mt-1">
                  Ops Center
                </span>
              </div>
            </Link>

            <nav className="hidden max-w-[calc(100vw-24rem)] items-center gap-1 overflow-x-auto md:flex xl:max-w-none">
              <NavLink
                to="/admin"
                end
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`
                }
              >
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </NavLink>

              <NavLink
                to="/admin/tables/hazard_reports"
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`
                }
              >
                <Database className="w-4 h-4" />
                Data Registers
              </NavLink>

              <NavLink
                to="/categories"
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`
                }
              >
                <Tags className="w-4 h-4" />
                Hazard Categories
              </NavLink>

              <NavLink
                to="/admin/api-management"
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-orange-500/10 text-orange-300 border border-orange-500/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`
                }
              >
                <PlugZap className="w-4 h-4" />
                API Management
              </NavLink>

              <NavLink
                to="/admin/reports"
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`
                }
              >
                <FileText className="w-4 h-4" />
                PDF Reports
              </NavLink>

              <NavLink
                to="/admin/notifications"
                className={({ isActive }) =>
                  `relative flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`
                }
              >
                <Megaphone className="w-4 h-4" />
                Announcements
              </NavLink>
            </nav>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-4">
            <NotificationDropdown role="admin" />
            <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/60">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <div className="text-xs">
                <span className="text-slate-400">Logged in as </span>
                <span className="font-semibold text-slate-200">{user?.full_name || 'Admin'}</span>
                <span className="text-slate-500 text-[10px] ml-1">({user?.role_name || 'Admin'})</span>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors border border-transparent hover:border-rose-500/20"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((current) => !current)}
              className="inline-flex items-center justify-center rounded-lg border border-slate-700 p-2 text-slate-300 transition hover:border-emerald-500/40 hover:bg-slate-800 hover:text-white md:hidden"
              aria-label={mobileMenuOpen ? 'Close admin navigation' : 'Open admin navigation'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>
        {mobileMenuOpen && (
          <nav aria-label="Admin navigation" className="mx-auto grid max-w-7xl grid-cols-2 gap-2 border-t border-slate-800 px-4 py-3 sm:px-6 md:hidden">
            {[
              { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
              { to: '/admin/tables/hazard_reports', label: 'Hazard Reports', icon: Database },
              { to: '/admin/tables/users', label: 'Users', icon: User },
              { to: '/admin#regional-advisories', label: 'Regional Advisories', icon: Megaphone, end: true },
              { to: '/categories', label: 'Hazard Categories', icon: Tags },
              { to: '/admin/reports', label: 'PDF Reports', icon: FileText },
              { to: '/admin/api-management', label: 'API Management', icon: PlugZap },
              { to: '/admin/notifications', label: 'Announcements', icon: Megaphone },
            ].map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={label}
                to={to}
                end={end}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) => `flex min-h-10 items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                  isActive
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                    : 'border-slate-800 bg-slate-900/70 text-slate-300 hover:border-slate-700 hover:bg-slate-800'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="relative border-t border-slate-800/80 bg-slate-900/30 py-6 text-center text-xs text-slate-500 before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-orange-500/35 before:to-transparent">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>&copy; {new Date().getFullYear()} BayanAlert &bull; Decoupled Architecture (LavaLust API + React)</span>
          <span className="text-slate-600">Secure Emergency Incident Management</span>
        </div>
      </footer>
    </div>
  );
}
