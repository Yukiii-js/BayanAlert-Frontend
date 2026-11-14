import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { TableList } from './pages/TableList';
import { TableForm } from './pages/TableForm';
import { Categories } from './pages/Categories';
import { GuestHome } from './pages/GuestHome';
import { Register } from './pages/Register';
import { VerifyEmail } from './pages/VerifyEmail';
import { ResidentLogin } from './pages/ResidentLogin';
import SubmittedReports from './pages/SubmittedReports';
import { Notifications } from './pages/Notifications';

const ResidentDashboard = lazy(() => import('./pages/ResidentDashboard').then((module) => ({
  default: module.ResidentDashboard,
})));

const PdfReports = lazy(() => import('./pages/PdfReports').then((module) => ({
  default: module.PdfReports,
})));

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public guest homepage */}
          <Route path="/" element={<GuestHome />} />

          {/* Public registration page */}
          <Route path="/register" element={<Register />} />
          <Route path="/verify-email" element={<VerifyEmail />} />

          {/* Public resident login page */}
          <Route path="/resident-login" element={<ResidentLogin />} />

          {/* Protected resident dashboard */}
          <Route
            path="/resident"
            element={
              <ProtectedRoute allowedRoles={['resident', 'user']}>
                <Suspense fallback={<p role="status" className="p-6 text-sm text-slate-400">Loading community dashboard...</p>}>
                  <ResidentDashboard />
                </Suspense>
              </ProtectedRoute>
            }
          />

          {/* Protected submitted reports route */}
          <Route
            path="/resident/submitted-reports"
            element={
              <ProtectedRoute allowedRoles={['resident', 'user']}>
                <SubmittedReports />
              </ProtectedRoute>
            }
          />

          {/* Public Routes */}
          <Route path="/login" element={<Login />} />

          {/* Protected Admin Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/notifications"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Layout>
                  <Notifications />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/reports"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Layout>
                  <Suspense fallback={<p role="status" className="text-sm text-slate-400">Loading report tools...</p>}>
                    <PdfReports />
                  </Suspense>
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/tables/:table"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Layout>
                  <TableList />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/tables/:table/create"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Layout>
                  <TableForm />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/tables/:table/edit/:id"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Layout>
                  <TableForm />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/categories"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Layout>
                  <Categories />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>

    
  );
}
