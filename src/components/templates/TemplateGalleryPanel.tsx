import React, { useState, useMemo, memo, useCallback } from 'react';
import {
  Activity, Briefcase, Code, DollarSign, Folder, Grid3x3,
  Info, Keyboard, LayoutTemplate, MessageCircle, Search, ShoppingCart,
  Target, Users, X
} from 'lucide-react';
import { WORKFLOW_TEMPLATES } from '../../data/workflowTemplates';
import TemplateCard from './TemplateCard';
import TemplatePreview from './TemplatePreview';
import type { WorkflowTemplate } from '../../types/templates';
import { useWorkflowStore } from '../../store/workflowStore';
import { notificationService } from '../../services/NotificationService';
import { logger } from '../../services/SimpleLogger';

interface TemplateGalleryPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const TemplateGalleryPanel = memo<TemplateGalleryPanelProps>(({ isOpen, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'popular' | 'recent' | 'rating'>('popular');
  const [previewTemplate, setPreviewTemplate] = useState<WorkflowTemplate | null>(null);

  const { nodes, edges, setNodes, setEdges, addToHistory } = useWorkflowStore();

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set<string>();
    WORKFLOW_TEMPLATES.forEach(t => cats.add(t.category));
    return Array.from(cats).sort();
  }, []);

  // Category labels and icons
  const categoryConfig: Record<string, { label: string; icon: React.ReactNode; count: number }> = useMemo(() => {
    const config: Record<string, { label: string; icon: React.ReactNode; count: number }> = {
      all: {
        label: 'All Templates',
        icon: <Grid3x3 className="w-4 h-4" />,
        count: WORKFLOW_TEMPLATES.length,
      },
    };

    categories.forEach(category => {
      const count = WORKFLOW_TEMPLATES.filter(t => t.category === category).length;
      const icons: Record<string, React.ReactNode> = {
        business_automation: <Briefcase className="w-4 h-4" />,
        ecommerce: <ShoppingCart className="w-4 h-4" />,
        hr: <Users className="w-4 h-4" />,
        monitoring: <Activity className="w-4 h-4" />,
        development: <Code className="w-4 h-4" />,
        finance: <DollarSign className="w-4 h-4" />,
        marketing: <Target className="w-4 h-4" />,
        communication: <MessageCircle className="w-4 h-4" />,
      };

      config[category] = {
        label: category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
        icon: icons[category] || <Folder className="w-4 h-4" />,
        count,
      };
    });

    return config;
  }, [categories]);

  // Filter and sort templates
  const filteredTemplates = useMemo(() => {
    let filtered = WORKFLOW_TEMPLATES;

    // Filter by search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        t =>
          t.name.toLowerCase().includes(term) ||
          t.description.toLowerCase().includes(term) ||
          t.tags.some(tag => tag.toLowerCase().includes(term))
      );
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(t => t.category === selectedCategory);
    }

    // Filter by difficulty
    if (selectedDifficulty !== 'all') {
      filtered = filtered.filter(t => t.difficulty === selectedDifficulty);
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'popular':
          return b.downloads - a.downloads;
        case 'recent':
          return b.updatedAt.getTime() - a.updatedAt.getTime();
        case 'rating':
          return b.rating - a.rating;
        default:
          return 0;
      }
    });

    return filtered;
  }, [searchTerm, selectedCategory, selectedDifficulty, sortBy]);

  // Handle template usage - memoize for performance
  const handleUseTemplate = useCallback((template: WorkflowTemplate) => {
    try {
      // Save current state to history
      addToHistory(nodes, edges);

      // Calculate offset for new nodes
      const existingNodes = nodes;
      const maxX = existingNodes.length > 0
        ? Math.max(...existingNodes.map(n => n.position.x))
        : 0;
      const offsetX = existingNodes.length > 0 ? maxX + 200 : 100;

      // Create new nodes with offset - convert TemplateNode to WorkflowNode
      const newNodes = template.workflow.nodes.map(node => ({
        id: `${node.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: node.type,
        position: {
          x: node.position.x + offsetX,
          y: node.position.y,
        },
        data: {
          id: `${node.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: node.type,
          label: node.data.label,
          position: {
            x: node.position.x + offsetX,
            y: node.position.y,
          },
          icon: '',
          color: '',
          inputs: 1,
          outputs: 1,
          config: node.data.config,
          enabled: true
        }
      }));

      // Create new edges
      const nodeIdMap = new Map<string, string>();
      template.workflow.nodes.forEach((oldNode, index) => {
        nodeIdMap.set(oldNode.id, newNodes[index].id);
      });

      const newEdges = template.workflow.edges.map(edge => ({
        ...edge,
        id: `${edge.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        source: nodeIdMap.get(edge.source) || edge.source,
        target: nodeIdMap.get(edge.target) || edge.target,
      }));

      // Update store
      setNodes([...existingNodes, ...newNodes]);
      setEdges([...edges, ...newEdges]);

      notificationService.success(
        'Template Added',
        `"${template.name}" has been added to your workflow`
      );

      onClose();
    } catch (error) {
      logger.error('Error adding template:', error);
      notificationService.error('Failed to add template', 'Please try again');
    }
  }, [nodes, edges, addToHistory, setNodes, setEdges, onClose]);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
          aria-hidden="true"
        />

        {/* Panel */}
        <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col animate-slideIn">
          {/* Header */}
          <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-primary-50 to-white dark:from-gray-800 dark:to-gray-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary-100 dark:bg-primary-900 rounded-xl">
                  <LayoutTemplate className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    Template Gallery
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {filteredTemplates.length} {filteredTemplates.length === 1 ? 'template' : 'templates'} available
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                aria-label="Close"
              >
                <X className="w-6 h-6 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            {/* Search and Filters */}
            <div className="mt-5 space-y-4">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Search templates by name, description, or tags..."
                  className="w-full pl-11 pr-4 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-gray-100 placeholder-gray-400"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                  >
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                )}
              </div>

              {/* Filters Row */}
              <div className="flex items-center gap-4 flex-wrap">
                {/* Category Filter */}
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Category:</span>
                  <select
                    value={selectedCategory}
                    onChange={e => setSelectedCategory(e.target.value)}
                    className="px-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-gray-100"
                  >
                    {Object.entries(categoryConfig).map(([key, config]) => (
                      <option key={key} value={key}>
                        {config.label} ({config.count})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Difficulty Filter */}
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Difficulty:</span>
                  <select
                    value={selectedDifficulty}
                    onChange={e => setSelectedDifficulty(e.target.value)}
                    className="px-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-gray-100"
                  >
                    <option value="all">All Levels</option>
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>

                {/* Sort By */}
                <div className="flex items-center gap-2 ml-auto">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Sort by:</span>
                  <select
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value as 'popular' | 'recent' | 'rating')}
                    className="px-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-gray-100"
                  >
                    <option value="popular">Most Popular</option>
                    <option value="recent">Recently Updated</option>
                    <option value="rating">Highest Rated</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Templates Grid */}
          <div className="flex-1 overflow-y-auto p-6">
            {filteredTemplates.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <Search className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  No templates found
                </h3>
                <p className="text-gray-600 dark:text-gray-400 max-w-md">
                  Try adjusting your search or filters to find what you're looking for
                </p>
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedCategory('all');
                    setSelectedDifficulty('all');
                  }}
                  className="mt-4 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTemplates.map(template => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onUseTemplate={handleUseTemplate}
                    onPreview={setPreviewTemplate}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <Info className="w-4 h-4" />
                <span>
                  Templates will be added to your current workflow without replacing existing nodes
                </span>
              </div>
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                <Keyboard className="w-4 h-4" />
                <span>Press <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-xs font-mono">Esc</kbd> to close</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Template Preview Modal */}
      <TemplatePreview
        template={previewTemplate}
        isOpen={!!previewTemplate}
        onClose={() => setPreviewTemplate(null)}
        onUseTemplate={handleUseTemplate}
      />
    </>
  );
});

TemplateGalleryPanel.displayName = 'TemplateGalleryPanel';

export default TemplateGalleryPanel;
