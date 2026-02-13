import React, { ReactNode, Suspense, lazy } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { ReactFlowProvider } from '@xyflow/react';
import { ToastProvider } from '../components/ui/Toast';
import '@xyflow/react/dist/style.css';
import '../styles/design-system.css';
import '../styles/linear-design-system.css';
import '../styles/accessibility.css';

// Lazy load performance provider
const WorkflowPerformanceProvider = lazy(() =>
  import('../components/performance/WorkflowPerformanceProvider').then(m => ({
    default: m.WorkflowPerformanceProvider,
  }))
);

interface AppProvidersProps {
  children: ReactNode;
}

/**
 * Loading fallback for providers
 */
const ProviderLoadingFallback: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
      <p className="text-gray-600 dark:text-gray-400">Loading application...</p>
    </div>
  </div>
);

/**
 * Composes all application providers in the correct order.
 * Provider order matters - inner providers have access to outer providers.
 *
 * Provider hierarchy:
 * 1. Router - Enables routing throughout the app
 * 2. WorkflowPerformanceProvider - Performance monitoring context
 * 3. ReactFlowProvider - React Flow context for workflow editor
 * 4. ToastProvider - Toast notifications context
 */
export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  return (
    <Router>
      <Suspense fallback={<ProviderLoadingFallback />}>
        <WorkflowPerformanceProvider>
          <ReactFlowProvider>
            <ToastProvider>{children}</ToastProvider>
          </ReactFlowProvider>
        </WorkflowPerformanceProvider>
      </Suspense>
    </Router>
  );
};

export default AppProviders;
