import React, { ReactNode, Suspense, lazy, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useWorkflowStore } from '../store/workflowStore';
import ErrorBoundary from '../components/error-handling/ErrorBoundary';
import { LinearLayout } from '../components/core/LinearLayout';
import NotificationContainer from '../components/core/NotificationContainer';

// Lazy load performance warning component
const PerformanceWarning = lazy(() => import('../components/performance/PerformanceWarning'));

// Type for workflow store state
type WorkflowStoreState = ReturnType<typeof useWorkflowStore> & Record<string, unknown>;

interface AppLayoutProps {
  children: ReactNode;
}

/**
 * Main application layout component.
 *
 * Layout strategy:
 * - Editor routes (/workflows) get full-screen layout (no header/sidebar chrome)
 * - All other routes use LinearLayout (header + sidebar + padded content)
 */
export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { darkMode } = useWorkflowStore() as WorkflowStoreState;
  const location = useLocation();

  // Editor routes get full-screen layout without LinearLayout
  const isEditorRoute = location.pathname.startsWith('/workflows');

  // Apply dark mode to body element
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark');
      document.body.classList.add('linear-dark');
      document.body.style.backgroundColor = 'var(--linear-bg-primary)';
    } else {
      document.body.classList.remove('dark');
      document.body.classList.remove('linear-dark');
      document.body.style.backgroundColor = '#ffffff';
    }
  }, [darkMode]);

  return (
    <div className={darkMode ? 'dark' : ''}>
      {/* Skip link for keyboard accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 bg-blue-600 text-white px-4 py-2 rounded-md font-medium"
        onFocus={e => e.target.scrollIntoView()}
      >
        Skip to main content
      </a>

      <ErrorBoundary level="page" maxRetries={3}>
        {isEditorRoute ? (
          /* Editor: full-screen, no dashboard chrome */
          <>
            <NotificationContainer />
            <div id="main-content" className="focus:outline-none" tabIndex={-1}>
              {children}
            </div>
          </>
        ) : (
          /* Dashboard pages: header + sidebar + padded content */
          <LinearLayout>
            <NotificationContainer />
            <main id="main-content" className="focus:outline-none p-6" tabIndex={-1}>
              {children}
            </main>
          </LinearLayout>
        )}

        {/* Performance warning overlay */}
        <Suspense fallback={null}>
          <PerformanceWarning />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
};

export default AppLayout;
