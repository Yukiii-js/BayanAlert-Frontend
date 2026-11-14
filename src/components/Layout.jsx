import React, { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  Database, 
  Tags, 
  LogOut, 
  User, 
  Bell,
  FileText
} from 'lucide-react';
import { api } from '../api/client';
import { BrandLogo } from './BrandLogo';

export function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let active = true;
    const loadUnreadCount = async () => {
      try {
        const response = await api.getNotifications();
        const notifications = response?.data?.notifications;
        if (!Array.isArray(notifications)) {
          throw new Error('The notifications response was invalid.');
        }
        if (active) {
          setUnreadCount(notifications.filter(
            (notification) => ![1, '1', true].includes(notification.is_read)
          ).length);
        }
      } catch (error) {
        console.error('Unable to refresh admin notification count:', error);
      }
    };

    loadUnreadCount();
    const timer = window.setInterval(loadUnreadCount, 60000);
    window.addEventListener('notifications:updated', loadUnreadCount);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener('notifications:updated', loadUnreadCount);
    };
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/admin" className="flex items-center gap-2.5 group">
              <div className="flex h-10 w-10 items-center justify-center transition-transform group-hover:scale-105">
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

            <nav className="hidden md:flex items-center gap-1">
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
                <Bell className="w-4 h-4" />
                Notifications
                {unreadCount > 0 && (
                  <span className="ml-0.5 min-w-5 rounded-full bg-rose-500 px-1.5 py-0.5 text-center text-[10px] font-bold leading-none text-white">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </NavLink>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <Link
              to="/admin/notifications"
              aria-label="Notifications"
              className="relative rounded-lg border border-slate-700 p-2 text-slate-300 transition hover:border-emerald-500/40 hover:text-white md:hidden"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-rose-500 px-1 text-center text-[9px] font-bold leading-4 text-white">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>
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
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-900/30 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>&copy; {new Date().getFullYear()} BayanAlert &bull; Decoupled Architecture (LavaLust API + React)</span>
          <span className="text-slate-600">Secure Emergency Incident Management</span>
        </div>
      </footer>
    </div>
  );
}
