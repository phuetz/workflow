import React, { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import ErrorBoundary from '../components/error-handling/ErrorBoundary';

// Lazy load all route components
const BentoDashboard = lazy(() => import('../components/dashboards/BentoDashboard'));
const AppMarketplace = lazy(() => import('../components/marketplace/AppMarketplace'));
const AnalyticsDashboard = lazy(() =>
  import('../components/dashboards/AnalyticsDashboard').then(m => ({ default: m.AnalyticsDashboard }))
);
const WorkflowLifecycleMetrics = lazy(() => import('../components/monitoring/WorkflowLifecycleMetrics'));
const UserAnalyticsDashboard = lazy(() => import('../components/dashboards/UserAnalyticsDashboard'));
const Settings = lazy(() => import('../components/settings/Settings'));
const Documentation = lazy(() => import('../components/documentation/Documentation'));
const SchedulingDashboard = lazy(() => import('../components/dashboards/SchedulingDashboard'));
const ImportExportDashboard = lazy(() =>
  import('../components/dashboards/ImportExportDashboard').then(m => ({ default: m.ImportExportDashboard }))
);
const VariablesManager = lazy(() =>
  import('../components/variables/VariablesManager').then(m => ({ default: m.VariablesManager }))
);
const SubWorkflowManager = lazy(() => import('../components/workflow/editor/SubWorkflowManager'));
const SLADashboard = lazy(() => import('../components/dashboards/SLADashboard'));
const DataTransformPlayground = lazy(() => import('../components/data/DataTransformPlayground'));
const WorkflowSharingHub = lazy(() => import('../components/collaboration/WorkflowSharingHub'));
const APIDashboard = lazy(() => import('../components/dashboards/APIDashboard'));
const CommunityMarketplace = lazy(() => import('../components/marketplace/CommunityMarketplace'));
const DeploymentDashboard = lazy(() => import('../components/dashboards/DeploymentDashboard'));
const BackupDashboard = lazy(() => import('../components/dashboards/BackupDashboard'));
const BrowserCleanup = lazy(() => import('../components/utilities/BrowserCleanup'));

// WorkflowEditor is lazy loaded separately as it's a complex component
const WorkflowEditor = lazy(() => import('./WorkflowEditor'));

// Debug logging
const DEBUG = false;
const logRoute = (message: string, data?: unknown) => {
  if (DEBUG) {
    console.log(`[AppRoutes] ${message}`, data || '');
  }
};

/**
 * Route logger component - logs route changes for debugging
 */
export const RouteLogger: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();

  useEffect(() => {
    logRoute(`Route changed to: ${location.pathname}`, {
      search: location.search,
      hash: location.hash,
    });
  }, [location]);

  return <>{children}</>;
};

/**
 * Loading fallback for lazy-loaded route components
 */
const RouteLoadingFallback: React.FC<{ name?: string }> = ({ name = 'Page' }) => (
  <div className="flex items-center justify-center min-h-[400px]">
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
      <p className="text-gray-600 dark:text-gray-400">Loading {name}...</p>
    </div>
  </div>
);

/**
 * Wraps a route component with error boundary and suspense
 */
const RouteWrapper: React.FC<{ children: React.ReactNode; name?: string }> = ({
  children,
  name = 'Page',
}) => (
  <ErrorBoundary level="component">
    <Suspense fallback={<RouteLoadingFallback name={name} />}>{children}</Suspense>
  </ErrorBoundary>
);

/**
 * Application routes configuration
 */
export const AppRoutes: React.FC = () => {
  return (
    <RouteLogger>
      <Routes>
        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* Main dashboard */}
        <Route
          path="/dashboard"
          element={
            <RouteWrapper name="Dashboard">
              <BentoDashboard />
            </RouteWrapper>
          }
        />

        {/* Workflow routes */}
        <Route
          path="/workflows"
          element={
            <RouteWrapper name="Workflow Editor">
              <WorkflowEditor />
            </RouteWrapper>
          }
        />
        <Route
          path="/workflows/:id"
          element={
            <RouteWrapper name="Workflow Editor">
              <WorkflowEditor />
            </RouteWrapper>
          }
        />

        {/* Marketplace */}
        <Route
          path="/marketplace"
          element={
            <RouteWrapper name="Marketplace">
              <AppMarketplace isOpen={true} onClose={() => window.history.back()} />
            </RouteWrapper>
          }
        />

        {/* Analytics routes */}
        <Route
          path="/analytics"
          element={
            <RouteWrapper name="Analytics">
              <AnalyticsDashboard />
            </RouteWrapper>
          }
        />
        <Route
          path="/lifecycle-metrics"
          element={
            <RouteWrapper name="Lifecycle Metrics">
              <WorkflowLifecycleMetrics />
            </RouteWrapper>
          }
        />
        <Route
          path="/user-analytics"
          element={
            <RouteWrapper name="User Analytics">
              <UserAnalyticsDashboard />
            </RouteWrapper>
          }
        />

        {/* Settings and documentation */}
        <Route
          path="/settings"
          element={
            <RouteWrapper name="Settings">
              <Settings />
            </RouteWrapper>
          }
        />
        <Route
          path="/documentation"
          element={
            <RouteWrapper name="Documentation">
              <Documentation />
            </RouteWrapper>
          }
        />

        {/* Operations routes */}
        <Route
          path="/scheduling"
          element={
            <RouteWrapper name="Scheduling">
              <SchedulingDashboard />
            </RouteWrapper>
          }
        />
        <Route
          path="/import-export"
          element={
            <RouteWrapper name="Import/Export">
              <ImportExportDashboard />
            </RouteWrapper>
          }
        />
        <Route
          path="/variables"
          element={
            <RouteWrapper name="Variables">
              <VariablesManager />
            </RouteWrapper>
          }
        />
        <Route
          path="/subworkflows"
          element={
            <RouteWrapper name="Subworkflows">
              <SubWorkflowManager />
            </RouteWrapper>
          }
        />

        {/* Monitoring and SLA */}
        <Route
          path="/sla"
          element={
            <RouteWrapper name="SLA Dashboard">
              <SLADashboard />
            </RouteWrapper>
          }
        />

        {/* Data tools */}
        <Route
          path="/data-transform"
          element={
            <RouteWrapper name="Data Transform">
              <DataTransformPlayground />
            </RouteWrapper>
          }
        />

        {/* Collaboration */}
        <Route
          path="/sharing"
          element={
            <RouteWrapper name="Sharing">
              <WorkflowSharingHub />
            </RouteWrapper>
          }
        />

        {/* API and integrations */}
        <Route
          path="/api"
          element={
            <RouteWrapper name="API Dashboard">
              <APIDashboard />
            </RouteWrapper>
          }
        />

        {/* Community */}
        <Route
          path="/community"
          element={
            <RouteWrapper name="Community">
              <CommunityMarketplace />
            </RouteWrapper>
          }
        />

        {/* DevOps */}
        <Route
          path="/deployment"
          element={
            <RouteWrapper name="Deployment">
              <DeploymentDashboard />
            </RouteWrapper>
          }
        />
        <Route
          path="/backup"
          element={
            <RouteWrapper name="Backup">
              <BackupDashboard />
            </RouteWrapper>
          }
        />

        {/* Utilities */}
        <Route
          path="/cleanup"
          element={
            <RouteWrapper name="Cleanup">
              <BrowserCleanup />
            </RouteWrapper>
          }
        />

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </RouteLogger>
  );
};

export default AppRoutes;
