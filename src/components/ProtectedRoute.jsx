import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

const normalizeRole = (role) => String(role ?? '').trim().toLowerCase();

export function ProtectedRoute({ children, allowedRoles = [] }) {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
          <p className="text-sm font-medium">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles.length) {
    const userRoleName = normalizeRole(user?.role_name);
    const allowed = allowedRoles.some((role) => normalizeRole(role) === userRoleName);

    if (!allowed) {
      const fallback = userRoleName === 'admin' ? '/admin' : '/resident';
      return <Navigate to={fallback} replace />;
    }
  }

  return children;
}
