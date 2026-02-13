/**
 * App module barrel exports
 *
 * This module contains the main application structure components:
 * - AppErrorBoundary: Global error boundary for the application
 * - AppProviders: Composition of all context providers
 * - AppRoutes: React Router configuration with lazy loading
 * - AppLayout: Main layout structure (header, sidebar, content)
 * - WorkflowEditor: Main workflow editor component
 */

export { AppErrorBoundary } from './AppErrorBoundary';
export { AppProviders } from './AppProviders';
export { AppRoutes, RouteLogger } from './AppRoutes';
export { AppLayout } from './AppLayout';
export { WorkflowEditor } from './WorkflowEditor';
