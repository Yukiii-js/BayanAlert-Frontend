import React from 'react';
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
import { ResidentLogin } from './pages/ResidentLogin';
import { ResidentDashboard } from './pages/ResidentDashboard';
import SubmittedReports from './pages/SubmittedReports';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public guest homepage */}
          <Route path="/" element={<GuestHome />} />

          {/* Public registration page */}
          <Route path="/register" element={<Register />} />

          {/* Public resident login page */}
          <Route path="/resident-login" element={<ResidentLogin />} />

          {/* Protected resident dashboard */}
          <Route
            path="/resident"
            element={
              <ProtectedRoute allowedRoles={['resident', 'user']}>
                <ResidentDashboard />
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
              <ProtectedRoute allowedRoles={['admin', 1]}>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/tables/:table"
            element={
              <ProtectedRoute allowedRoles={['admin', 1]}>
                <Layout>
                  <TableList />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/tables/:table/create"
            element={
              <ProtectedRoute allowedRoles={['admin', 1]}>
                <Layout>
                  <TableForm />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/tables/:table/edit/:id"
            element={
              <ProtectedRoute allowedRoles={['admin', 1]}>
                <Layout>
                  <TableForm />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/categories"
            element={
              <ProtectedRoute allowedRoles={['admin', 1]}>
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
