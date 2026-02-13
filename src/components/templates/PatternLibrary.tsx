/**
 * Pattern Library UI Component
 * Browse, search, and apply workflow patterns
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  Search,
  Filter,
  BookOpen,
  Zap,
  Shield,
  Database,
  GitBranch,
  Lightbulb,
  AlertTriangle,
  CheckCircle,
  X,
  Plus,
  TrendingUp,
} from 'lucide-react';
import { useWorkflowStore } from '../../store/workflowStore';
import { useToast } from '../ui/Toast';
import {
  PATTERN_CATALOG,
  getPatternsByCategory,
  getPatternsByComplexity,
} from '../../patterns/PatternCatalog';
import { PatternDetector } from '../../patterns/PatternDetector';
import { PatternSuggester } from '../../patterns/PatternSuggester';
import { AntiPatternDetector } from '../../patterns/AntiPatternDetector';
import { PatternTemplateGenerator } from '../../patterns/PatternTemplate';
import type { PatternDefinition, PatternCategory, PatternComplexity } from '../../types/patterns';

/**
 * Pattern Library Component
 */
export const PatternLibrary: React.FC = () => {
  const toast = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<PatternCategory | 'all'>('all');
  const [selectedComplexity, setSelectedComplexity] = useState<PatternComplexity | 'all'>('all');
  const [selectedPattern, setSelectedPattern] = useState<PatternDefinition | null>(null);
  const [activeTab, setActiveTab] = useState<'browse' | 'detect' | 'suggest' | 'health'>('browse');

  const { nodes, edges, addNode, setEdges } = useWorkflowStore();

  // Filter patterns
  const filteredPatterns = useMemo(() => {
    let patterns = PATTERN_CATALOG;

    // Filter by category
    if (selectedCategory !== 'all') {
      patterns = patterns.filter((p) => p.category === selectedCategory);
    }

    // Filter by complexity
    if (selectedComplexity !== 'all') {
      patterns = patterns.filter((p) => p.complexity === selectedComplexity);
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      patterns = patterns.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          p.description.toLowerCase().includes(term) ||
          p.tags.some((tag) => tag.toLowerCase().includes(term))
      );
    }

    return patterns;
  }, [searchTerm, selectedCategory, selectedComplexity]);

  // Detect patterns
  const detectedPatterns = useMemo(() => {
    if (nodes.length === 0) return [];
    const detector = new PatternDetector({ confidenceThreshold: 0.5 });
    return detector.detect(nodes, edges);
  }, [nodes, edges]);

  // Get suggestions
  const suggestions = useMemo(() => {
    if (nodes.length === 0) return [];
    return PatternSuggester.suggest(nodes, edges);
  }, [nodes, edges]);

  // Health check
  const health = useMemo(() => {
    if (nodes.length === 0) return null;
    return AntiPatternDetector.calculateHealthScore(nodes, edges);
  }, [nodes, edges]);

  // Apply template
  const handleApplyTemplate = useCallback(
    (pattern: PatternDefinition) => {
      const template = PatternTemplateGenerator.generateTemplate(pattern);
      const { nodes: templateNodes, edges: templateEdges } =
        PatternTemplateGenerator.applyTemplate(template, {
          x: 100,
          y: 100,
        });

      // Add nodes
      for (const node of templateNodes) {
        addNode(node);
      }

      // Add edges by merging with existing edges
      setEdges([...edges, ...templateEdges]);

      toast.success(`Template "${pattern.name}" applied successfully!`);
    },
    [addNode, setEdges, edges]
  );

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Pattern Library</h1>
        <p className="text-sm text-gray-600">
          Browse 50+ workflow patterns, detect current patterns, and get AI-powered suggestions
        </p>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b px-6">
        <div className="flex space-x-6">
          <button
            onClick={() => setActiveTab('browse')}
            className={`py-3 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'browse'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <BookOpen className="inline w-4 h-4 mr-2" />
            Browse Patterns
          </button>
          <button
            onClick={() => setActiveTab('detect')}
            className={`py-3 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'detect'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Search className="inline w-4 h-4 mr-2" />
            Detect ({detectedPatterns.length})
          </button>
          <button
            onClick={() => setActiveTab('suggest')}
            className={`py-3 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'suggest'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Lightbulb className="inline w-4 h-4 mr-2" />
            Suggestions ({suggestions.length})
          </button>
          <button
            onClick={() => setActiveTab('health')}
            className={`py-3 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'health'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <TrendingUp className="inline w-4 h-4 mr-2" />
            Health Check
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Browse Tab */}
        {activeTab === 'browse' && (
          <>
            {/* Sidebar Filters */}
            <div className="w-80 bg-white border-r p-6 overflow-y-auto">
              <div className="space-y-6">
                {/* Search */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Search Patterns
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by name, description..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                </div>

                {/* Category Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="all">All Categories</option>
                    <option value="messaging">Messaging</option>
                    <option value="integration">Integration</option>
                    <option value="reliability">Reliability</option>
                    <option value="data">Data</option>
                    <option value="workflow">Workflow</option>
                    <option value="architecture">Architecture</option>
                  </select>
                </div>

                {/* Complexity Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Complexity
                  </label>
                  <select
                    value={selectedComplexity}
                    onChange={(e) => setSelectedComplexity(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="all">All Levels</option>
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                    <option value="expert">Expert</option>
                  </select>
                </div>

                {/* Stats */}
                <div className="pt-4 border-t">
                  <p className="text-sm text-gray-600">
                    {filteredPatterns.length} pattern(s) found
                  </p>
                </div>
              </div>
            </div>

            {/* Pattern List */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filteredPatterns.map((pattern) => (
                  <PatternCard
                    key={pattern.id}
                    pattern={pattern}
                    onSelect={setSelectedPattern}
                    onApply={handleApplyTemplate}
                  />
                ))}
              </div>
            </div>
          </>
        )}

        {/* Detect Tab */}
        {activeTab === 'detect' && (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-lg font-semibold mb-4">Detected Patterns</h2>
              {nodes.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Search className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p>Create a workflow to detect patterns</p>
                </div>
              ) : detectedPatterns.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p>No patterns detected in current workflow</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {detectedPatterns.map((detection, index) => (
                    <div key={index} className="bg-white rounded-lg shadow p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold">{detection.pattern.name}</h3>
                          <p className="text-sm text-gray-600 mt-1">
                            {detection.pattern.description}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                            {(detection.confidence * 100).toFixed(0)}% match
                          </span>
                        </div>
                      </div>
                      {detection.suggestions.length > 0 && (
                        <div className="mt-4 p-3 bg-blue-50 rounded">
                          <p className="text-sm font-medium text-blue-900 mb-2">Suggestions:</p>
                          <ul className="text-sm text-blue-800 space-y-1">
                            {detection.suggestions.map((s, i) => (
                              <li key={i}>• {s}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Suggest Tab */}
        {activeTab === 'suggest' && (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-lg font-semibold mb-4">Pattern Suggestions</h2>
              {nodes.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Lightbulb className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p>Create a workflow to get pattern suggestions</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {suggestions.slice(0, 5).map((suggestion, index) => (
                    <div key={index} className="bg-white rounded-lg shadow p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold">{suggestion.pattern.name}</h3>
                          <p className="text-sm text-gray-600 mt-1">{suggestion.reason}</p>
                        </div>
                        <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium ml-4">
                          {(suggestion.relevance * 100).toFixed(0)}% relevant
                        </span>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleApplyTemplate(suggestion.pattern)}
                          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                        >
                          Apply Template
                        </button>
                        <button
                          onClick={() => setSelectedPattern(suggestion.pattern)}
                          className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 text-sm"
                        >
                          Learn More
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Health Tab */}
        {activeTab === 'health' && (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-lg font-semibold mb-4">Workflow Health Check</h2>
              {nodes.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <TrendingUp className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p>Create a workflow to check health</p>
                </div>
              ) : health ? (
                <div className="space-y-6">
                  {/* Health Score */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="text-center">
                      <div
                        className={`text-6xl font-bold mb-2 ${
                          health.grade === 'A'
                            ? 'text-green-600'
                            : health.grade === 'B'
                            ? 'text-blue-600'
                            : health.grade === 'C'
                            ? 'text-yellow-600'
                            : 'text-red-600'
                        }`}
                      >
                        {health.score.toFixed(0)}
                      </div>
                      <div className="text-2xl font-semibold text-gray-700 mb-2">
                        Grade: {health.grade}
                      </div>
                      <p className="text-gray-600">Overall Workflow Health</p>
                    </div>
                  </div>

                  {/* Issues */}
                  {health.issues.length > 0 && (
                    <div className="bg-white rounded-lg shadow p-6">
                      <h3 className="text-lg font-semibold mb-4">Detected Issues</h3>
                      <div className="space-y-3">
                        {health.issues.map((issue, index) => (
                          <div
                            key={index}
                            className={`p-4 rounded border-l-4 ${
                              issue.antiPattern.severity === 'critical'
                                ? 'bg-red-50 border-red-500'
                                : issue.antiPattern.severity === 'high'
                                ? 'bg-orange-50 border-orange-500'
                                : issue.antiPattern.severity === 'medium'
                                ? 'bg-yellow-50 border-yellow-500'
                                : 'bg-blue-50 border-blue-500'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-semibold">{issue.antiPattern.name}</p>
                                <p className="text-sm text-gray-600 mt-1">
                                  {issue.antiPattern.description}
                                </p>
                              </div>
                              <span className="text-xs font-medium uppercase">
                                {issue.antiPattern.severity}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>

      {/* Pattern Detail Modal */}
      {selectedPattern && (
        <PatternDetailModal
          pattern={selectedPattern}
          onClose={() => setSelectedPattern(null)}
          onApply={handleApplyTemplate}
        />
      )}
    </div>
  );
};

/**
 * Pattern Card Component
 */
const PatternCard: React.FC<{
  pattern: PatternDefinition;
  onSelect: (pattern: PatternDefinition) => void;
  onApply: (pattern: PatternDefinition) => void;
}> = ({ pattern, onSelect, onApply }) => {
  const getCategoryIcon = (category: string) => {
    const icons: Record<string, any> = {
      messaging: GitBranch,
      integration: Zap,
      reliability: Shield,
      data: Database,
      workflow: BookOpen,
      architecture: GitBranch,
    };
    const Icon = icons[category] || BookOpen;
    return <Icon className="w-5 h-5" />;
  };

  const getComplexityColor = (complexity: string) => {
    const colors: Record<string, string> = {
      beginner: 'bg-green-100 text-green-800',
      intermediate: 'bg-blue-100 text-blue-800',
      advanced: 'bg-orange-100 text-orange-800',
      expert: 'bg-red-100 text-red-800',
    };
    return colors[complexity] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
            {getCategoryIcon(pattern.category)}
          </div>
          <div>
            <h3 className="font-semibold text-lg">{pattern.name}</h3>
            <span className="text-xs text-gray-500 capitalize">{pattern.category}</span>
          </div>
        </div>
        <span
          className={`px-2 py-1 rounded text-xs font-medium ${getComplexityColor(
            pattern.complexity
          )}`}
        >
          {pattern.complexity}
        </span>
      </div>

      <p className="text-sm text-gray-600 mb-4 line-clamp-2">{pattern.description}</p>

      <div className="flex flex-wrap gap-1 mb-4">
        {pattern.tags.slice(0, 3).map((tag) => (
          <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
            {tag}
          </span>
        ))}
      </div>

      <div className="flex space-x-2">
        <button
          onClick={() => onApply(pattern)}
          className="flex-1 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
        >
          <Plus className="inline w-4 h-4 mr-1" />
          Apply
        </button>
        <button
          onClick={() => onSelect(pattern)}
          className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-50 text-sm"
        >
          Details
        </button>
      </div>
    </div>
  );
};

/**
 * Pattern Detail Modal
 */
const PatternDetailModal: React.FC<{
  pattern: PatternDefinition;
  onClose: () => void;
  onApply: (pattern: PatternDefinition) => void;
}> = ({ pattern, onClose, onApply }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">{pattern.name}</h2>
            <p className="text-sm text-gray-600 capitalize">{pattern.category} Pattern</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-gray-700">{pattern.description}</p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Problem</h3>
              <p className="text-gray-700">{pattern.problem}</p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Solution</h3>
              <p className="text-gray-700">{pattern.solution}</p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Benefits</h3>
              <ul className="list-disc list-inside space-y-1">
                {pattern.benefits.map((benefit, index) => (
                  <li key={index} className="text-gray-700">
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Trade-offs</h3>
              <ul className="list-disc list-inside space-y-1">
                {pattern.tradeoffs.map((tradeoff, index) => (
                  <li key={index} className="text-gray-700">
                    {tradeoff}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Use Cases</h3>
              <ul className="list-disc list-inside space-y-1">
                {pattern.useCases.map((useCase, index) => (
                  <li key={index} className="text-gray-700">
                    {useCase}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="p-6 border-t flex space-x-3">
          <button
            onClick={() => {
              onApply(pattern);
              onClose();
            }}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
          >
            Apply Template
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default PatternLibrary;
