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

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />

          {/* Protected Admin Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/tables/:table"
            element={
              <ProtectedRoute>
                <Layout>
                  <TableList />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/tables/:table/create"
            element={
              <ProtectedRoute>
                <Layout>
                  <TableForm />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/tables/:table/edit/:id"
            element={
              <ProtectedRoute>
                <Layout>
                  <TableForm />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/categories"
            element={
              <ProtectedRoute>
                <Layout>
                  <Categories />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="/" element={<Navigate to="/admin" replace />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
