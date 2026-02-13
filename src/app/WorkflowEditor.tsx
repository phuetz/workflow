import React, { Suspense, lazy } from 'react';

const ModernWorkflowEditor = lazy(() => import('../components/workflow/editor/ModernWorkflowEditor'));

/**
 * WorkflowEditor - Entry point for the workflow editor route.
 * Renders ModernWorkflowEditor which handles the full n8n-style layout.
 */
export const WorkflowEditor: React.FC = () => {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen bg-[var(--linear-bg-primary)]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
            <p className="text-[var(--linear-text-secondary)]">Loading Editor...</p>
          </div>
        </div>
      }
    >
      <ModernWorkflowEditor />
    </Suspense>
  );
};

export default WorkflowEditor;
