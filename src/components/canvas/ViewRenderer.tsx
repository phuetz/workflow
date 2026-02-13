/**
 * ViewRenderer Component
 * Handles conditional rendering of different views
 * Extracted from App.tsx to reduce complexity
 */

import React, { Suspense } from 'react';

interface ViewRendererProps {
  view: string;
  ModernWorkflowEditor: React.LazyExoticComponent<React.ComponentType>;
  ModernDashboard: React.LazyExoticComponent<React.ComponentType>;
  WorkflowTemplates: React.LazyExoticComponent<React.ComponentType>;
  WorkflowValidator: React.LazyExoticComponent<React.ComponentType>;
  CredentialsManager: React.LazyExoticComponent<React.ComponentType>;
  ExpressionBuilder: React.LazyExoticComponent<React.ComponentType>;
  WebhookManager: React.LazyExoticComponent<React.ComponentType>;
  ScheduleManager: React.LazyExoticComponent<React.ComponentType>;
  MonitoringDashboard: React.LazyExoticComponent<React.ComponentType>;
  LegacyEditor: React.ReactNode;
}

const ViewRenderer: React.FC<ViewRendererProps> = ({
  view,
  ModernWorkflowEditor,
  ModernDashboard,
  WorkflowTemplates,
  WorkflowValidator,
  CredentialsManager,
  ExpressionBuilder,
  WebhookManager,
  ScheduleManager,
  MonitoringDashboard,
  LegacyEditor,
}) => {
  const views: Record<string, React.ReactNode> = {
    'modern-editor': (
      <Suspense fallback={<div>Loading Modern Editor...</div>}>
        <ModernWorkflowEditor />
      </Suspense>
    ),
    'dashboard': (
      <Suspense fallback={<div>Loading Dashboard...</div>}>
        <ModernDashboard />
      </Suspense>
    ),
    'templates': (
      <Suspense fallback={<div>Loading Templates...</div>}>
        <WorkflowTemplates />
      </Suspense>
    ),
    'validator': (
      <Suspense fallback={<div>Loading Validator...</div>}>
        <WorkflowValidator />
      </Suspense>
    ),
    'credentials': (
      <Suspense fallback={<div>Loading Credentials...</div>}>
        <CredentialsManager />
      </Suspense>
    ),
    'expressions': (
      <Suspense fallback={<div>Loading Expressions...</div>}>
        <ExpressionBuilder />
      </Suspense>
    ),
    'webhooks': (
      <Suspense fallback={<div>Loading Webhooks...</div>}>
        <WebhookManager />
      </Suspense>
    ),
    'schedules': (
      <Suspense fallback={<div>Loading Schedules...</div>}>
        <ScheduleManager />
      </Suspense>
    ),
    'monitoring': (
      <Suspense fallback={<div>Loading Monitoring...</div>}>
        <MonitoringDashboard />
      </Suspense>
    ),
    'editor': LegacyEditor,
  };

  return <>{views[view] || null}</>;
};

export default ViewRenderer;
