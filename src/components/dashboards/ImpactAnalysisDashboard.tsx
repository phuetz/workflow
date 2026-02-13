/**
 * Impact Analysis Dashboard
 * Interactive tool for analyzing change impact on workflows
 */

import React, { useState, useCallback } from 'react';
import {
  LineageGraph,
  LineageId,
  ImpactAnalysisResult,
  ComplianceFramework
} from '../../types/lineage';
import { logger } from '../../services/SimpleLogger';

// Type definitions for ImpactAnalyzer
interface ImpactAnalysisOptions {
  direction: 'upstream' | 'downstream' | 'bidirectional';
  maxDepth: number;
  includeCompliance?: boolean;
  includeRiskAssessment?: boolean;
}

// Stub implementation of ImpactAnalyzer
class ImpactAnalyzer {
  constructor(private graph: LineageGraph) {}

  analyzeNodeImpact(nodeId: LineageId, options: ImpactAnalysisOptions): ImpactAnalysisResult {
    // Stub implementation
    return {
      targetNodeId: nodeId,
      impactType: options.direction || 'downstream',
      timestamp: new Date().toISOString(),
      affectedNodes: [],
      affectedDataSources: [],
      affectedTransformations: [],
      riskAssessment: {
        overallRisk: 'low',
        riskFactors: [],
        mitigationStrategies: []
      },
      complianceImpact: {
        affectedFrameworks: [],
        requiredActions: [],
        breachRisk: false
      }
    };
  }

  recommendMitigations(result: ImpactAnalysisResult): Array<{
    priority: 'critical' | 'high' | 'medium' | 'low';
    strategy: string;
    description: string;
  }> {
    return [
      {
        priority: 'high',
        strategy: 'Review changes',
        description: 'Carefully review all changes before deployment'
      }
    ];
  }
}

interface ImpactAnalysisDashboardProps {
  graph: LineageGraph;
  onNodeSelect?: (nodeId: LineageId) => void;
}

export const ImpactAnalysisDashboard: React.FC<ImpactAnalysisDashboardProps> = ({
  graph,
  onNodeSelect
}) => {
  const [selectedNode, setSelectedNode] = useState<LineageId | null>(null);
  const [analysisResult, setAnalysisResult] = useState<ImpactAnalysisResult | null>(null);
  const [options, setOptions] = useState<ImpactAnalysisOptions>({
    direction: 'downstream',
    maxDepth: 10,
    includeCompliance: true,
    includeRiskAssessment: true
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const analyzer = new ImpactAnalyzer(graph);

  // Perform impact analysis
  const performAnalysis = useCallback(async () => {
    if (!selectedNode) return;

    setIsAnalyzing(true);

    try {
      const result = analyzer.analyzeNodeImpact(selectedNode, options);
      setAnalysisResult(result);
    } catch (error) {
      logger.error('Impact analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  }, [selectedNode, options, graph]);

  // Handle node selection
  const handleNodeSelect = useCallback((nodeId: LineageId) => {
    setSelectedNode(nodeId);
    setAnalysisResult(null);
    onNodeSelect?.(nodeId);
  }, [onNodeSelect]);

  return (
    <div className="impact-analysis-dashboard bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900">Impact Analysis</h2>
        <p className="mt-2 text-sm text-gray-600">
          Analyze the impact of changes on your workflow data lineage
        </p>
      </div>

      <div className="grid grid-cols-12 gap-6 p-6">
        {/* Configuration Panel */}
        <div className="col-span-4 space-y-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-4">Analysis Configuration</h3>

            {/* Node Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target Node
              </label>
              <select
                value={selectedNode || ''}
                onChange={e => handleNodeSelect(e.target.value as LineageId)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select a node...</option>
                {Array.from(graph.nodes.values()).map(node => (
                  <option key={node.id} value={node.id}>
                    {node.metadata.nodeName} ({node.metadata.nodeType})
                  </option>
                ))}
              </select>
            </div>

            {/* Direction */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Analysis Direction
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="upstream"
                    checked={options.direction === 'upstream'}
                    onChange={e => setOptions({ ...options, direction: 'upstream' })}
                    className="mr-2"
                  />
                  <span className="text-sm">Upstream (Dependencies)</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="downstream"
                    checked={options.direction === 'downstream'}
                    onChange={e => setOptions({ ...options, direction: 'downstream' })}
                    className="mr-2"
                  />
                  <span className="text-sm">Downstream (Impacts)</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="bidirectional"
                    checked={options.direction === 'bidirectional'}
                    onChange={e => setOptions({ ...options, direction: 'bidirectional' })}
                    className="mr-2"
                  />
                  <span className="text-sm">Bidirectional (Both)</span>
                </label>
              </div>
            </div>

            {/* Max Depth */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Maximum Depth
              </label>
              <input
                type="number"
                value={options.maxDepth}
                onChange={e => setOptions({ ...options, maxDepth: parseInt(e.target.value) })}
                min={1}
                max={50}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Options */}
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={options.includeCompliance}
                  onChange={e => setOptions({ ...options, includeCompliance: e.target.checked })}
                  className="mr-2"
                />
                <span className="text-sm">Include compliance analysis</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={options.includeRiskAssessment}
                  onChange={e => setOptions({ ...options, includeRiskAssessment: e.target.checked })}
                  className="mr-2"
                />
                <span className="text-sm">Include risk assessment</span>
              </label>
            </div>

            {/* Analyze Button */}
            <button
              onClick={performAnalysis}
              disabled={!selectedNode || isAnalyzing}
              className={`w-full mt-6 px-4 py-2 rounded-md font-medium ${
                !selectedNode || isAnalyzing
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isAnalyzing ? 'Analyzing...' : 'Analyze Impact'}
            </button>
          </div>

          {/* Quick Actions */}
          {analysisResult && (
            <div className="bg-yellow-50 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-yellow-900 mb-3">
                Recommended Actions
              </h4>
              <div className="space-y-2">
                {analyzer.recommendMitigations(analysisResult).slice(0, 3).map((rec, index) => (
                  <div key={index} className="text-xs">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded text-white ${
                        rec.priority === 'critical' ? 'bg-red-500' :
                        rec.priority === 'high' ? 'bg-orange-500' :
                        rec.priority === 'medium' ? 'bg-yellow-500' :
                        'bg-blue-500'
                      }`}>
                        {rec.priority}
                      </span>
                      <span className="font-medium">{rec.strategy}</span>
                    </div>
                    <p className="mt-1 text-gray-600">{rec.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Results Panel */}
        <div className="col-span-8">
          {!analysisResult && (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <svg className="w-24 h-24 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <p className="text-lg font-medium">Select a node and click "Analyze Impact"</p>
                <p className="mt-2 text-sm">Understand how changes affect your workflow</p>
              </div>
            </div>
          )}

          {analysisResult && (
            <div className="space-y-6">
              {/* Overview Cards */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="text-sm text-blue-600 font-medium">Affected Nodes</div>
                  <div className="text-3xl font-bold text-blue-900 mt-2">
                    {analysisResult.affectedNodes.length}
                  </div>
                </div>

                <div className={`rounded-lg p-4 ${
                  analysisResult.riskAssessment.overallRisk === 'critical' ? 'bg-red-50' :
                  analysisResult.riskAssessment.overallRisk === 'high' ? 'bg-orange-50' :
                  analysisResult.riskAssessment.overallRisk === 'medium' ? 'bg-yellow-50' :
                  'bg-green-50'
                }`}>
                  <div className={`text-sm font-medium ${
                    analysisResult.riskAssessment.overallRisk === 'critical' ? 'text-red-600' :
                    analysisResult.riskAssessment.overallRisk === 'high' ? 'text-orange-600' :
                    analysisResult.riskAssessment.overallRisk === 'medium' ? 'text-yellow-600' :
                    'text-green-600'
                  }`}>
                    Risk Level
                  </div>
                  <div className={`text-3xl font-bold mt-2 ${
                    analysisResult.riskAssessment.overallRisk === 'critical' ? 'text-red-900' :
                    analysisResult.riskAssessment.overallRisk === 'high' ? 'text-orange-900' :
                    analysisResult.riskAssessment.overallRisk === 'medium' ? 'text-yellow-900' :
                    'text-green-900'
                  }`}>
                    {(analysisResult.riskAssessment.overallRisk || 'low').toUpperCase()}
                  </div>
                </div>

                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="text-sm text-purple-600 font-medium">Data Sources</div>
                  <div className="text-3xl font-bold text-purple-900 mt-2">
                    {analysisResult.affectedDataSources.length}
                  </div>
                </div>
              </div>

              {/* Risk Assessment */}
              {options.includeRiskAssessment && (
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-4">Risk Assessment</h3>

                  {analysisResult.riskAssessment.riskFactors.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Risk Factors</h4>
                      <ul className="space-y-1">
                        {analysisResult.riskAssessment.riskFactors.map((factor, index) => (
                          <li key={index} className="text-sm text-gray-600 flex items-start">
                            <svg className="w-4 h-4 mr-2 mt-0.5 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                            {factor}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {analysisResult.riskAssessment.mitigationStrategies.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Mitigation Strategies</h4>
                      <ul className="space-y-1">
                        {analysisResult.riskAssessment.mitigationStrategies.map((strategy, index) => (
                          <li key={index} className="text-sm text-gray-600 flex items-start">
                            <svg className="w-4 h-4 mr-2 mt-0.5 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            {strategy}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {analysisResult.riskAssessment.estimatedDowntime !== undefined && (
                    <div className="mt-4 p-3 bg-gray-50 rounded">
                      <span className="text-sm text-gray-700">Estimated Downtime: </span>
                      <span className="text-sm font-medium text-gray-900">
                        {analysisResult.riskAssessment.estimatedDowntime} minutes
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Affected Nodes List */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4">Affected Nodes</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {analysisResult.affectedNodes.map(node => (
                    <div
                      key={node.nodeId}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded hover:bg-gray-100"
                    >
                      <div>
                        <div className="font-medium text-gray-900">{node.description}</div>
                        <div className="text-sm text-gray-600">
                          Distance: {node.distance} • Impact: {node.impact}
                        </div>
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded ${
                        node.riskLevel === 'critical' ? 'bg-red-100 text-red-800' :
                        node.riskLevel === 'high' ? 'bg-orange-100 text-orange-800' :
                        node.riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {node.riskLevel}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Compliance Impact */}
              {options.includeCompliance && analysisResult.complianceImpact.affectedFrameworks.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-4">Compliance Impact</h3>

                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Affected Frameworks</h4>
                    <div className="flex flex-wrap gap-2">
                      {analysisResult.complianceImpact.affectedFrameworks.map(framework => (
                        <span
                          key={framework}
                          className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                        >
                          {framework.toUpperCase()}
                        </span>
                      ))}
                    </div>
                  </div>

                  {analysisResult.complianceImpact.breachRisk && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
                      <div className="flex items-center">
                        <svg className="w-5 h-5 mr-2 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm font-medium text-red-800">Breach Risk Detected</span>
                      </div>
                    </div>
                  )}

                  {analysisResult.complianceImpact.requiredActions.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Required Actions</h4>
                      <ul className="space-y-1">
                        {analysisResult.complianceImpact.requiredActions.map((action, index) => (
                          <li key={index} className="text-sm text-gray-600 flex items-start">
                            <svg className="w-4 h-4 mr-2 mt-0.5 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                            </svg>
                            {action}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImpactAnalysisDashboard;
