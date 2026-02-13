import React from 'react';
import {
  Activity, BadgeCheck, Box, Download, Eye, GitBranch,
  Info, Layers, Plus, Star, Tag, X
} from 'lucide-react';
import { ReactFlow, Background, Controls, MiniMap, BackgroundVariant } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { WorkflowTemplate } from '../../types/templates';
import { nodeTypes } from '../../data/nodeTypes';

interface TemplatePreviewProps {
  template: WorkflowTemplate | null;
  isOpen: boolean;
  onClose: () => void;
  onUseTemplate: (template: WorkflowTemplate) => void;
}

const TemplatePreview: React.FC<TemplatePreviewProps> = ({
  template,
  isOpen,
  onClose,
  onUseTemplate,
}) => {
  if (!isOpen || !template) return null;

  // Prepare nodes for ReactFlow
  const flowNodes = template.workflow.nodes.map(node => ({
    ...node,
    type: 'custom',
    draggable: false,
    selectable: false,
  }));

  const flowEdges = template.workflow.edges.map(edge => ({
    ...edge,
    animated: true,
    style: { strokeWidth: 2, stroke: '#94a3b8' },
  }));

  // Category badge
  const categoryColors: Record<string, string> = {
    business_automation: 'bg-blue-100 text-blue-700',
    ecommerce: 'bg-pink-100 text-pink-700',
    hr: 'bg-purple-100 text-purple-700',
    monitoring: 'bg-green-100 text-green-700',
    development: 'bg-orange-100 text-orange-700',
    finance: 'bg-emerald-100 text-emerald-700',
    marketing: 'bg-red-100 text-red-700',
    communication: 'bg-indigo-100 text-indigo-700',
  };

  const categoryColor = categoryColors[template.category] || 'bg-gray-100 text-gray-700';

  // Difficulty badge
  const difficultyConfig: Record<string, { label: string; color: string }> = {
    beginner: { label: 'Beginner', color: 'bg-green-100 text-green-700' },
    intermediate: { label: 'Intermediate', color: 'bg-yellow-100 text-yellow-700' },
    advanced: { label: 'Advanced', color: 'bg-red-100 text-red-700' },
  };

  const difficulty = difficultyConfig[template.difficulty] || difficultyConfig.beginner;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col animate-fadeIn">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-primary-50 to-white dark:from-gray-800 dark:to-gray-800">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {template.name}
                </h2>
                {template.authorType === 'official' && (
                  <span className="inline-flex items-center gap-1 bg-blue-500 text-white px-2.5 py-1 rounded-full text-xs font-medium">
                    <BadgeCheck className="w-3.5 h-3.5" />
                    Official
                  </span>
                )}
              </div>

              <p className="text-gray-600 dark:text-gray-400 mb-3">
                {template.description}
              </p>

              <div className="flex items-center gap-3 flex-wrap">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${categoryColor}`}>
                  {template.category.replace('_', ' ')}
                </span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${difficulty.color}`}>
                  {difficulty.label}
                </span>
                <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium">{template.rating.toFixed(1)}</span>
                </div>
                <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                  <Download className="w-4 h-4" />
                  <span>{template.downloads.toLocaleString()} downloads</span>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors ml-4"
              aria-label="Close"
            >
              <X className="w-6 h-6 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
        </div>

        {/* Content - Two columns */}
        <div className="flex-1 overflow-hidden flex">
          {/* Left: Workflow Preview */}
          <div className="flex-1 relative bg-gray-50 dark:bg-gray-900">
            <div className="absolute inset-0">
              <ReactFlow
                nodes={flowNodes}
                edges={flowEdges}
                fitView
                minZoom={0.5}
                maxZoom={1.5}
                nodesDraggable={false}
                nodesConnectable={false}
                elementsSelectable={false}
                zoomOnScroll={false}
                panOnScroll={false}
                className="bg-gray-50 dark:bg-gray-900"
              >
                <Background
                  variant={BackgroundVariant.Dots}
                  gap={20}
                  size={1}
                  color="#d1d5db"
                  className="dark:opacity-20"
                />
                <Controls
                  position="bottom-right"
                  showInteractive={false}
                  className="bg-white dark:bg-gray-800"
                />
                <MiniMap
                  position="bottom-left"
                  className="bg-white dark:bg-gray-800"
                  maskColor="rgba(0,0,0,0.1)"
                />
              </ReactFlow>
            </div>

            {/* Overlay label */}
            <div className="absolute top-4 left-4 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm px-4 py-2 rounded-lg shadow-lg">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                <Eye className="w-4 h-4" />
                Workflow Preview
              </div>
            </div>
          </div>

          {/* Right: Details */}
          <div className="w-96 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-y-auto">
            <div className="p-6 space-y-6">
              {/* Workflow Stats */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary-600" />
                  Workflow Statistics
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                    <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {template.workflow.nodes.length}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1">
                      <Box className="w-3 h-3" />
                      Nodes
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                    <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {template.workflow.edges.length}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1">
                      <GitBranch className="w-3 h-3" />
                      Connections
                    </div>
                  </div>
                </div>
              </div>

              {/* Tags */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-primary-600" />
                  Tags
                </h3>
                <div className="flex flex-wrap gap-2">
                  {template.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Nodes Breakdown */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-primary-600" />
                  Node Types
                </h3>
                <div className="space-y-2">
                  {template.workflow.nodes.map((node, index) => {
                    const nodeType = nodeTypes[node.type as keyof typeof nodeTypes];
                    return (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-900 rounded-lg"
                      >
                        <div className="w-8 h-8 rounded bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                          <Box className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                            {node.data.label}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {nodeType?.label || node.type}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Version & Author */}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-600 dark:text-gray-400">Version</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {template.version}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Author</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {template.author}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <Info className="w-4 h-4" />
                This template will be added to your current workflow
              </span>
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onUseTemplate(template);
                  onClose();
                }}
                className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors font-medium flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Use This Template
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplatePreview;
