/**
 * Main Application Component
 *
 * This is the entry point for the workflow automation platform.
 * The application has been modularized into separate concerns:
 *
 * - AppErrorBoundary: Global error handling with fallback UI
 * - AppProviders: Context providers (Router, ReactFlow, Performance)
 * - AppLayout: Main layout structure with header, sidebar, and content
 * - AppRoutes: React Router configuration with lazy-loaded routes
 *
 * @module App
 */

import React, { useEffect } from 'react';
import { AppErrorBoundary, AppProviders, AppRoutes, AppLayout } from './app';
import { useWorkflowStore } from './store/workflowStore';

// Type for workflow store state
type WorkflowStoreState = ReturnType<typeof useWorkflowStore> & Record<string, unknown>;

// Debug logging configuration
const APP_DEBUG = false;
const appLog = (message: string, data?: unknown) => {
  if (APP_DEBUG) {
    console.log(`[App] ${message}`, data || '');
  }
};

/**
 * Root application component that composes all the main pieces:
 * 1. Error boundary for catching unhandled errors
 * 2. Providers for context (routing, state, performance)
 * 3. Layout for consistent structure
 * 4. Routes for navigation
 */
const App: React.FC = () => {
  const { darkMode } = useWorkflowStore() as WorkflowStoreState;

  // Log component lifecycle in debug mode
  useEffect(() => {
    appLog('App component mounted');
    return () => appLog('App component unmounting');
  }, []);

  // Log dark mode changes
  useEffect(() => {
    appLog(`Dark mode: ${darkMode}`);
  }, [darkMode]);

  return (
    <AppErrorBoundary>
      <AppProviders>
        <AppLayout>
          <AppRoutes />
        </AppLayout>
      </AppProviders>
    </AppErrorBoundary>
  );
};

export default App;
