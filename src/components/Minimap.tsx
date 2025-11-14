/**
 * Minimap Component for ReactFlow
 * Provides bird's-eye view of large workflows
 */

import React from 'react';
import { MiniMap } from 'reactflow';
import { useWorkflowStore } from '../store/workflowStore';

export default function WorkflowMinimap() {
  const { darkMode } = useWorkflowStore();

  // Color nodes by category
  const nodeColor = (node: any) => {
    const categoryColors: Record<string, string> = {
      trigger: '#f97316',
      communication: '#3b82f6',
      database: '#8b5cf6',
      ai: '#10b981',
      core: '#6b7280',
      flow: '#eab308',
      data: '#6366f1',
      microsoft: '#0078D4',
      firebase: '#FFCA28',
      supabase: '#3ECF8E'
    };

    return categoryColors[node.data?.category] || '#94a3b8';
  };

  return (
    <MiniMap
      nodeColor={nodeColor}
      nodeStrokeWidth={3}
      pannable
      zoomable
      className={`${darkMode ? 'bg-gray-800' : 'bg-gray-50'} rounded-lg shadow-lg border-2 ${
        darkMode ? 'border-gray-700' : 'border-gray-200'
      }`}
      maskColor={darkMode ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.6)'}
      style={{
        width: 200,
        height: 150
      }}
    />
  );
}
