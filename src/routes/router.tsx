/**
 * TanStack Router Configuration
 *
 * This file sets up type-safe routing with TanStack Router.
 * Benefits over React Router:
 * - 100% type-safe routes
 * - Automatic code splitting
 * - Built-in search params validation with Zod
 * - First-class TypeScript support
 */

import { createRootRoute, createRoute, createRouter, Outlet } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';
import { z } from 'zod';

// Lazy load route components for code splitting
const Dashboard = lazy(() => import('@/components/dashboards/BentoDashboard'));
const WorkflowEditor = lazy(() => import('@/components/workflow/editor/ModernWorkflowEditor'));
const Marketplace = lazy(() => import('@/components/marketplace/WorkflowMarketplace'));
const Settings = lazy(() => import('@/components/settings/SettingsPanel'));
const Credentials = lazy(() => import('@/components/credentials/CredentialsManager'));
const Executions = lazy(() => import('@/components/workflow/execution/ExecutionHistory'));
const Templates = lazy(() => import('@/components/templates/TemplateGallery'));
const Analytics = lazy(() => import('@/components/dashboards/AnalyticsDashboard'));

// Loading component
function RouteLoader() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
        <span className="text-sm text-secondary-500">Loading...</span>
      </div>
    </div>
  );
}

// Root layout component
function RootLayout() {
  return (
    <div className="min-h-screen bg-secondary-50 dark:bg-secondary-900">
      <Suspense fallback={<RouteLoader />}>
        <Outlet />
      </Suspense>
    </div>
  );
}

// Root route
const rootRoute = createRootRoute({
  component: RootLayout,
});

// Dashboard route
const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => (
    <Suspense fallback={<RouteLoader />}>
      <Dashboard />
    </Suspense>
  ),
});

// Workflow editor route with type-safe params
const workflowEditorRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/workflows/$workflowId',
  component: () => (
    <Suspense fallback={<RouteLoader />}>
      <WorkflowEditor />
    </Suspense>
  ),
  // Type-safe URL params validation
  parseParams: (params) => ({
    workflowId: params.workflowId,
  }),
});

// New workflow route
const newWorkflowRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/workflows/new',
  component: () => (
    <Suspense fallback={<RouteLoader />}>
      <WorkflowEditor />
    </Suspense>
  ),
});

// Workflows list route with search params
const workflowsListSearchSchema = z.object({
  page: z.number().optional().default(1),
  limit: z.number().optional().default(20),
  search: z.string().optional(),
  status: z.enum(['all', 'active', 'inactive', 'error']).optional().default('all'),
  sortBy: z.enum(['name', 'createdAt', 'updatedAt', 'lastRun']).optional().default('updatedAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

const workflowsListRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/workflows',
  component: () => (
    <Suspense fallback={<RouteLoader />}>
      <Dashboard />
    </Suspense>
  ),
  validateSearch: workflowsListSearchSchema,
});

// Marketplace route
const marketplaceRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/marketplace',
  component: () => (
    <Suspense fallback={<RouteLoader />}>
      <Marketplace />
    </Suspense>
  ),
});

// Templates route
const templatesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/templates',
  component: () => (
    <Suspense fallback={<RouteLoader />}>
      <Templates />
    </Suspense>
  ),
});

// Executions route with search params
const executionsSearchSchema = z.object({
  workflowId: z.string().optional(),
  status: z.enum(['all', 'running', 'success', 'error']).optional().default('all'),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.number().optional().default(1),
});

const executionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/executions',
  component: () => (
    <Suspense fallback={<RouteLoader />}>
      <Executions />
    </Suspense>
  ),
  validateSearch: executionsSearchSchema,
});

// Execution detail route
const executionDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/executions/$executionId',
  component: () => (
    <Suspense fallback={<RouteLoader />}>
      <Executions />
    </Suspense>
  ),
});

// Credentials route
const credentialsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/credentials',
  component: () => (
    <Suspense fallback={<RouteLoader />}>
      <Credentials />
    </Suspense>
  ),
});

// Settings route
const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: () => (
    <Suspense fallback={<RouteLoader />}>
      <Settings />
    </Suspense>
  ),
});

// Analytics route
const analyticsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/analytics',
  component: () => (
    <Suspense fallback={<RouteLoader />}>
      <Analytics />
    </Suspense>
  ),
});

// Create route tree
const routeTree = rootRoute.addChildren([
  dashboardRoute,
  workflowsListRoute,
  workflowEditorRoute,
  newWorkflowRoute,
  marketplaceRoute,
  templatesRoute,
  executionsRoute,
  executionDetailRoute,
  credentialsRoute,
  settingsRoute,
  analyticsRoute,
]);

// Create and export the router
export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 0,
});

// Register router for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

// Export route types for use in components
export type RouterType = typeof router;
export type RouteIds = keyof typeof router['routeIds'];
