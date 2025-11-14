/**
 * Lazy-loaded routes with code splitting
 * Optimizes bundle size and initial load time
 */

import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';

// Lazy load components
const MainApp = lazy(() => import('../App'));
const WorkflowEditor = lazy(() => import('../components/WorkflowEditor'));
const MonitoringDashboard = lazy(() => import('../components/MonitoringDashboard'));
const ExecutionViewer = lazy(() => import('../components/ExecutionViewer'));
const CredentialsManager = lazy(() => import('../components/CredentialsManager'));
const SettingsPanel = lazy(() => import('../components/SettingsPanel'));
const TemplatesGallery = lazy(() => import('../components/WorkflowTemplates'));
const AIWorkflowGenerator = lazy(() => import('../components/AIWorkflowGenerator'));
const CollaborationPanel = lazy(() => import('../components/CollaborationPanel'));
const LoginPage = lazy(() => import('../components/auth/LoginPage'));
const RegisterPage = lazy(() => import('../components/auth/RegisterPage'));
const ProfilePage = lazy(() => import('../components/auth/ProfilePage'));

// Loading fallback component
function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <LoadingSpinner />
      <div className="ml-4 text-gray-600">Loading...</div>
    </div>
  );
}

// Protected route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = false; // Replace with actual auth check

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export default function LazyRoutes() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <MainApp />
              </ProtectedRoute>
            }
          >
            <Route index element={<WorkflowEditor />} />
            <Route path="workflows/:id" element={<WorkflowEditor />} />
            <Route path="monitoring" element={<MonitoringDashboard />} />
            <Route path="executions" element={<ExecutionViewer />} />
            <Route path="credentials" element={<CredentialsManager />} />
            <Route path="templates" element={<TemplatesGallery />} />
            <Route path="ai-generator" element={<AIWorkflowGenerator />} />
            <Route path="collaboration" element={<CollaborationPanel />} />
            <Route path="settings" element={<SettingsPanel />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>

          {/* 404 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
