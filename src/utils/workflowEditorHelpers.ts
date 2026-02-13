/**
 * Helper functions for WorkflowEditor component
 * Extracted to reduce complexity and improve maintainability
 */

import { WorkflowNode, WorkflowEdge } from '../types/workflow';

/**
 * Show validation errors as a toast notification
 */
export function showValidationErrors(errors: string[]): void {
  const toast = document.createElement('div');
  const titleDiv = document.createElement('div');
  const contentDiv = document.createElement('div');

  toast.className = 'fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg z-50 max-w-md';

  // Create elements safely to avoid XSS
  titleDiv.className = 'font-bold';
  titleDiv.textContent = 'Validation Errors:';

  contentDiv.className = 'text-sm';
  errors.forEach(error => {
    const errorLine = document.createElement('div');
    errorLine.textContent = error;
    contentDiv.appendChild(errorLine);
  });

  toast.appendChild(titleDiv);
  toast.appendChild(contentDiv);
  document.body.appendChild(toast);

  setTimeout(() => {
    if (document.body.contains(toast)) {
      document.body.removeChild(toast);
    }
  }, 5000);
}

/**
 * Calculate edge styles based on node execution status
 */
export function getEdgeStyle(
  edge: WorkflowEdge,
  nodeExecutionStatus: Record<string, string>
): { style: React.CSSProperties; animated: boolean } {
  const status = nodeExecutionStatus[edge.source] || nodeExecutionStatus[edge.target];

  let style = { ...edge.style };
  let animated = false;

  if (!status) {
    return { style, animated };
  }

  switch (status) {
    case 'running':
      style = { ...style, stroke: '#3b82f6' };
      animated = true;
      break;
    case 'success':
      style = { ...style, stroke: '#16a34a' };
      animated = false;
      break;
    case 'error':
      style = { ...style, stroke: '#dc2626' };
      animated = false;
      break;
    default:
      break;
  }

  return { style, animated };
}

/**
 * Get view button CSS classes based on selection state and dark mode
 */
export function getViewButtonClasses(
  viewId: string,
  selectedView: string,
  darkMode: boolean
): string {
  const baseClasses = 'px-4 py-2 rounded-lg transition-colors duration-200';

  if (selectedView === viewId) {
    return `${baseClasses} bg-blue-500 text-white`;
  }

  return darkMode
    ? `${baseClasses} bg-gray-800 text-gray-300 hover:bg-gray-700`
    : `${baseClasses} bg-white text-gray-700 hover:bg-gray-100`;
}

/**
 * Generate a unique node ID
 */
export function generateNodeId(): string {
  return `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a new workflow node
 */
export function createWorkflowNode(
  id: string,
  type: string,
  position: { x: number; y: number },
  label: string
): WorkflowNode {
  return {
    id,
    type: 'custom',
    position,
    data: {
      id,
      label,
      type,
      position,
      icon: '',
      color: '#6b7280',
      inputs: 1,
      outputs: 1,
      config: {}
    },
  };
}

/**
 * Get node color based on category for MiniMap
 */
export function getNodeColor(category?: string): string {
  const colorMap: Record<string, string> = {
    trigger: '#f97316',
    communication: '#3b82f6',
    database: '#8b5cf6',
    ai: '#10b981',
    cloud: '#06b6d4',
    core: '#6b7280',
    flow: '#6366f1',
  };

  return colorMap[category || ''] || '#6b7280';
}

/**
 * Get environment selector CSS classes based on current environment
 */
export function getEnvironmentClasses(environment: string): string {
  const baseClasses = 'px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 min-w-[160px]';

  const envClasses: Record<string, string> = {
    prod: 'bg-red-500 text-white',
    staging: 'bg-yellow-500 text-white hover:bg-yellow-600',
    dev: 'bg-green-500 text-white hover:bg-green-600',
  };

  return `${baseClasses} ${envClasses[environment] || envClasses.dev}`;
}
