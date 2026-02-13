/**
 * Smart Suggestions Panel
 *
 * Displays AI-powered suggestions for workflow improvements,
 * next nodes, optimizations, and quality recommendations.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { workflowRecommender, NextNodeSuggestion, OptimizationSuggestion } from '../../ai/WorkflowRecommender';
import { qualityAnalyzer, QualityReport } from '../../ai/QualityAnalyzer';
import { autoNamingService } from '../../ai/AutoNaming';
import { useWorkflowStore } from '../../store/workflowStore';
import { logger } from '../../services/SimpleLogger';

interface SmartSuggestionsProps {
  onClose?: () => void;
}

type TabType = 'next-nodes' | 'optimizations' | 'quality' | 'naming';

export const SmartSuggestions: React.FC<SmartSuggestionsProps> = ({ onClose }) => {
  const { nodes, edges, addNode, updateNode, selectedNodes } = useWorkflowStore();
  const [activeTab, setActiveTab] = useState<TabType>('next-nodes');
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState<Map<string, 'up' | 'down'>>(new Map());

  const currentNode = useMemo(() => {
    if (selectedNodes.length === 1) {
      return nodes.find(n => n.id === selectedNodes[0]);
    }
    return undefined;
  }, [nodes, selectedNodes]);

  // Get next node suggestions
  const nextNodeSuggestions = useMemo(() => {
    const context = {
      currentNode,
      allNodes: nodes,
      edges,
      availableNodeTypes: [] // Would be populated from node registry
    };

    return workflowRecommender.suggestNextNodes(context);
  }, [currentNode, nodes, edges]);

  // Get optimization suggestions
  const optimizations = useMemo(() => {
    const context = {
      allNodes: nodes,
      edges,
      availableNodeTypes: []
    };

    return workflowRecommender.suggestOptimizations(context);
  }, [nodes, edges]);

  // Get quality report
  const qualityReport = useMemo(() => {
    if (nodes.length === 0) return null;
    return qualityAnalyzer.analyzeWorkflow(nodes, edges);
  }, [nodes, edges]);

  // Get naming suggestions
  const namingSuggestions = useMemo(() => {
    if (nodes.length === 0) return null;
    return autoNamingService.analyzeWorkflowNaming(nodes);
  }, [nodes]);

  const handleDismiss = (suggestionId: string) => {
    setDismissed(prev => new Set(prev).add(suggestionId));
  };

  const handleFeedback = (suggestionId: string, type: 'up' | 'down') => {
    setFeedback(prev => new Map(prev).set(suggestionId, type));
    // Track feedback for improvement
    logger.debug(`Feedback for ${suggestionId}: ${type}`);
  };

  const handleApplySuggestion = (suggestion: NextNodeSuggestion) => {
    // Add suggested node to workflow
    const newNode = {
      type: suggestion.nodeType,
      label: suggestion.label,
      position: {
        x: currentNode ? currentNode.position.x + 250 : 100,
        y: currentNode ? currentNode.position.y : 100
      }
    };

    // addNode(newNode);
    handleFeedback(suggestion.nodeType, 'up');
  };

  const handleApplyOptimization = (optimization: OptimizationSuggestion) => {
    // Implementation would depend on optimization type
    logger.debug('Applying optimization:', optimization);
  };

  const handleAutoRename = () => {
    const previews = autoNamingService.previewBulkRename(nodes, edges);

    // Apply renames
    for (const preview of previews) {
      if (preview.confidence >= 50 && preview.currentName !== preview.suggestedName) {
        updateNode(preview.nodeId, { label: preview.suggestedName });
      }
    }
  };

  return (
    <div className="smart-suggestions-panel">
      {/* Header */}
      <div className="suggestions-header">
        <h2>Smart Suggestions</h2>
        <button onClick={onClose} className="close-button" aria-label="Close">
          ✕
        </button>
      </div>

      {/* Tabs */}
      <div className="suggestions-tabs">
        <button
          className={`tab ${activeTab === 'next-nodes' ? 'active' : ''}`}
          onClick={() => setActiveTab('next-nodes')}
        >
          Next Nodes
          {nextNodeSuggestions.length > 0 && (
            <span className="badge">{nextNodeSuggestions.length}</span>
          )}
        </button>
        <button
          className={`tab ${activeTab === 'optimizations' ? 'active' : ''}`}
          onClick={() => setActiveTab('optimizations')}
        >
          Optimize
          {optimizations.length > 0 && (
            <span className="badge">{optimizations.length}</span>
          )}
        </button>
        <button
          className={`tab ${activeTab === 'quality' ? 'active' : ''}`}
          onClick={() => setActiveTab('quality')}
        >
          Quality
          {qualityReport && (
            <span className={`badge grade-${qualityReport.grade.toLowerCase()}`}>
              {qualityReport.grade}
            </span>
          )}
        </button>
        <button
          className={`tab ${activeTab === 'naming' ? 'active' : ''}`}
          onClick={() => setActiveTab('naming')}
        >
          Naming
          {namingSuggestions && namingSuggestions.suggestions.length > 0 && (
            <span className="badge">{namingSuggestions.suggestions.length}</span>
          )}
        </button>
      </div>

      {/* Content */}
      <div className="suggestions-content">
        {activeTab === 'next-nodes' && (
          <NextNodeTab
            suggestions={nextNodeSuggestions}
            dismissed={dismissed}
            onDismiss={handleDismiss}
            onApply={handleApplySuggestion}
            onFeedback={handleFeedback}
          />
        )}

        {activeTab === 'optimizations' && (
          <OptimizationsTab
            suggestions={optimizations}
            dismissed={dismissed}
            onDismiss={handleDismiss}
            onApply={handleApplyOptimization}
            onFeedback={handleFeedback}
          />
        )}

        {activeTab === 'quality' && qualityReport && (
          <QualityTab report={qualityReport} />
        )}

        {activeTab === 'naming' && namingSuggestions && (
          <NamingTab
            analysis={namingSuggestions}
            onAutoRename={handleAutoRename}
          />
        )}
      </div>
    </div>
  );
};

// Next Node Tab Component
const NextNodeTab: React.FC<{
  suggestions: NextNodeSuggestion[];
  dismissed: Set<string>;
  onDismiss: (id: string) => void;
  onApply: (suggestion: NextNodeSuggestion) => void;
  onFeedback: (id: string, type: 'up' | 'down') => void;
}> = ({ suggestions, dismissed, onDismiss, onApply, onFeedback }) => {
  const visibleSuggestions = suggestions.filter(s => !dismissed.has(s.nodeType));

  if (visibleSuggestions.length === 0) {
    return (
      <div className="empty-state">
        <p>No suggestions available. Select a node to see next node recommendations.</p>
      </div>
    );
  }

  return (
    <div className="suggestions-list">
      {visibleSuggestions.map(suggestion => (
        <div key={suggestion.nodeType} className="suggestion-card">
          <div className="suggestion-icon" style={{ backgroundColor: suggestion.color }}>
            {suggestion.icon}
          </div>
          <div className="suggestion-content">
            <h3>{suggestion.label}</h3>
            <p className="description">{suggestion.description}</p>
            <div className="suggestion-meta">
              <span className="confidence">
                Confidence: {suggestion.confidence}%
              </span>
              <span className="reason">{suggestion.reason}</span>
            </div>
          </div>
          <div className="suggestion-actions">
            <button
              onClick={() => onApply(suggestion)}
              className="btn-apply"
              title="Add this node"
            >
              Add
            </button>
            <button
              onClick={() => onFeedback(suggestion.nodeType, 'up')}
              className="btn-feedback"
              title="Helpful"
            >
              👍
            </button>
            <button
              onClick={() => onFeedback(suggestion.nodeType, 'down')}
              className="btn-feedback"
              title="Not helpful"
            >
              👎
            </button>
            <button
              onClick={() => onDismiss(suggestion.nodeType)}
              className="btn-dismiss"
              title="Dismiss"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

// Optimizations Tab Component
const OptimizationsTab: React.FC<{
  suggestions: OptimizationSuggestion[];
  dismissed: Set<string>;
  onDismiss: (id: string) => void;
  onApply: (suggestion: OptimizationSuggestion) => void;
  onFeedback: (id: string, type: 'up' | 'down') => void;
}> = ({ suggestions, dismissed, onDismiss, onApply, onFeedback }) => {
  const visibleSuggestions = suggestions.filter(s => !dismissed.has(s.title));

  if (visibleSuggestions.length === 0) {
    return (
      <div className="empty-state">
        <p>No optimization opportunities found. Great job!</p>
      </div>
    );
  }

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  return (
    <div className="suggestions-list">
      {visibleSuggestions.map(suggestion => (
        <div key={suggestion.title} className="suggestion-card optimization">
          <div className="optimization-header">
            <span className={`type-badge ${suggestion.type}`}>
              {suggestion.type}
            </span>
            <span
              className="impact-badge"
              style={{ backgroundColor: getImpactColor(suggestion.impact) }}
            >
              {suggestion.impact} impact
            </span>
          </div>
          <h3>{suggestion.title}</h3>
          <p className="description">{suggestion.description}</p>
          <div className="optimization-improvement">
            <strong>Estimated improvement:</strong> {suggestion.estimatedImprovement}
          </div>
          <div className="suggestion-actions">
            <button onClick={() => onApply(suggestion)} className="btn-apply">
              {suggestion.action}
            </button>
            <button
              onClick={() => onFeedback(suggestion.title, 'up')}
              className="btn-feedback"
            >
              👍
            </button>
            <button
              onClick={() => onFeedback(suggestion.title, 'down')}
              className="btn-feedback"
            >
              👎
            </button>
            <button onClick={() => onDismiss(suggestion.title)} className="btn-dismiss">
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

// Quality Tab Component
const QualityTab: React.FC<{ report: QualityReport }> = ({ report }) => {
  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return '#10b981';
      case 'B': return '#3b82f6';
      case 'C': return '#f59e0b';
      case 'D': return '#ef4444';
      case 'F': return '#991b1b';
      default: return '#6b7280';
    }
  };

  return (
    <div className="quality-report">
      {/* Overall Score */}
      <div className="quality-score-card">
        <div
          className="grade-circle"
          style={{ borderColor: getGradeColor(report.grade) }}
        >
          <span className="grade">{report.grade}</span>
          <span className="score">{report.score.overall}/100</span>
        </div>
        <p className="summary">{report.summary}</p>
      </div>

      {/* Dimensions */}
      <div className="quality-dimensions">
        <h3>Quality Breakdown</h3>
        {Object.entries(report.score.dimensions).map(([dimension, score]) => (
          <div key={dimension} className="dimension-row">
            <span className="dimension-label">
              {dimension.charAt(0).toUpperCase() + dimension.slice(1).replace(/([A-Z])/g, ' $1')}
            </span>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{
                  width: `${score}%`,
                  backgroundColor: score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444'
                }}
              />
            </div>
            <span className="dimension-score">{score}/100</span>
          </div>
        ))}
      </div>

      {/* Issues */}
      {report.issues.length > 0 && (
        <div className="quality-issues">
          <h3>Issues Found</h3>
          {report.issues.map((issue, index) => (
            <div key={index} className={`issue-card ${issue.severity}`}>
              <div className="issue-header">
                <span className={`severity-badge ${issue.severity}`}>
                  {issue.severity}
                </span>
                <span className="category-badge">{issue.category}</span>
              </div>
              <h4>{issue.title}</h4>
              <p>{issue.description}</p>
              <p className="impact"><strong>Impact:</strong> {issue.impact}</p>
            </div>
          ))}
        </div>
      )}

      {/* Recommendations */}
      {report.recommendations.length > 0 && (
        <div className="quality-recommendations">
          <h3>Recommendations</h3>
          {report.recommendations.map((rec, index) => (
            <div key={index} className="recommendation-card">
              <div className="recommendation-header">
                <span className={`priority-badge priority-${rec.priority}`}>
                  Priority {rec.priority}
                </span>
                <span className="improvement-badge">
                  +{rec.estimatedImprovement} points
                </span>
              </div>
              <h4>{rec.title}</h4>
              <p>{rec.description}</p>
              <p className="benefit"><strong>Benefit:</strong> {rec.benefit}</p>
            </div>
          ))}
        </div>
      )}

      {/* Predictions */}
      <div className="quality-predictions">
        <h3>Performance Predictions</h3>
        <div className="prediction-grid">
          <div className="prediction-item">
            <span className="prediction-label">Execution Time</span>
            <span className="prediction-value">{report.predictions.estimatedExecutionTime}</span>
          </div>
          <div className="prediction-item">
            <span className="prediction-label">Estimated Cost</span>
            <span className="prediction-value">{report.predictions.estimatedCost}</span>
          </div>
          <div className="prediction-item">
            <span className="prediction-label">CPU Usage</span>
            <span className={`prediction-value ${report.predictions.resourceUsage.cpu}`}>
              {report.predictions.resourceUsage.cpu}
            </span>
          </div>
          <div className="prediction-item">
            <span className="prediction-label">Memory Usage</span>
            <span className={`prediction-value ${report.predictions.resourceUsage.memory}`}>
              {report.predictions.resourceUsage.memory}
            </span>
          </div>
          <div className="prediction-item">
            <span className="prediction-label">Scalability</span>
            <span className="prediction-value">{report.predictions.scalabilityScore}/100</span>
          </div>
          <div className="prediction-item">
            <span className="prediction-label">Reliability</span>
            <span className="prediction-value">{report.predictions.reliabilityScore}/100</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Naming Tab Component
const NamingTab: React.FC<{
  analysis: { score: number; issues: string[]; suggestions: any[] };
  onAutoRename: () => void;
}> = ({ analysis, onAutoRename }) => {
  return (
    <div className="naming-analysis">
      <div className="naming-score-card">
        <h3>Naming Quality Score</h3>
        <div className="score-display">
          <span className="score-value">{analysis.score}/100</span>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{
                width: `${analysis.score}%`,
                backgroundColor: analysis.score >= 80 ? '#10b981' : '#f59e0b'
              }}
            />
          </div>
        </div>
      </div>

      {analysis.issues.length > 0 && (
        <div className="naming-issues">
          <h3>Naming Issues</h3>
          <ul>
            {analysis.issues.map((issue, index) => (
              <li key={index}>{issue}</li>
            ))}
          </ul>
        </div>
      )}

      {analysis.suggestions.length > 0 && (
        <div className="naming-suggestions">
          <h3>Suggested Improvements</h3>
          {analysis.suggestions.map((suggestion, index) => (
            <div key={index} className="naming-suggestion-card">
              <div className="name-comparison">
                <div className="current-name">
                  <span className="label">Current:</span>
                  <span className="name">{suggestion.currentName}</span>
                </div>
                <span className="arrow">→</span>
                <div className="suggested-name">
                  <span className="label">Suggested:</span>
                  <span className="name">{suggestion.suggestion}</span>
                </div>
              </div>
              <p className="reason">{suggestion.reason}</p>
            </div>
          ))}
        </div>
      )}

      <div className="naming-actions">
        <button onClick={onAutoRename} className="btn-primary">
          Auto-Rename All Nodes
        </button>
      </div>
    </div>
  );
};

export default SmartSuggestions;
