/**
 * Node Health List component - displays health assessments for workflow nodes
 */

import React from 'react';
import { Activity, Check, AlertTriangle, RefreshCw } from 'lucide-react';
import type { NodeHealth } from './types';

interface WorkflowNode {
  id: string;
  data: {
    type: string;
    label?: string;
  };
}

interface NodeHealthListProps {
  nodeHealth: NodeHealth[];
  nodes: WorkflowNode[];
  darkMode: boolean;
  onRefresh: () => void;
}

export default function NodeHealthList({
  nodeHealth,
  nodes,
  darkMode,
  onRefresh
}: NodeHealthListProps) {
  const sortedHealth = [...nodeHealth].sort((a, b) => a.healthScore - b.healthScore);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold">Sante des Noeuds</h3>
        <button
          onClick={onRefresh}
          className="px-3 py-1 bg-blue-500 text-white rounded-md text-sm flex items-center space-x-1"
        >
          <RefreshCw size={16} />
          <span>Rafraichir</span>
        </button>
      </div>

      {nodeHealth.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <Activity size={36} className="mx-auto text-gray-400 mb-3" />
          <p className="text-gray-500">Cliquez sur Analyser pour evaluer la sante des noeuds</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedHealth.map(nodeHealthItem => {
            const targetNode = nodes.find(n => n.id === nodeHealthItem.nodeId);
            if (!targetNode) return null;

            const healthColor =
              nodeHealthItem.healthScore >= 80 ? 'bg-green-500' :
              nodeHealthItem.healthScore >= 60 ? 'bg-yellow-500' :
              'bg-red-500';

            return (
              <div
                key={nodeHealthItem.nodeId}
                className={`p-4 rounded-lg ${
                  darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'
                } border shadow-sm`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="font-medium">
                    {targetNode.data.label || targetNode.data.type}
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="text-sm font-bold">{nodeHealthItem.healthScore}/100</div>
                    <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${healthColor}`}
                        style={{ width: `${nodeHealthItem.healthScore}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  {nodeHealthItem.factors.map((factor, idx) => (
                    <div key={idx} className="flex items-start text-sm">
                      <div className={`mt-1 mr-2 ${
                        factor.impact > 0 ? 'text-green-500' : 'text-red-500'
                      }`}>
                        {factor.impact > 0 ? (
                          <Check size={16} />
                        ) : (
                          <AlertTriangle size={16} />
                        )}
                      </div>
                      <div>
                        <div className="font-medium">{factor.factor}</div>
                        <div className="text-xs text-gray-500">{factor.description}</div>
                      </div>
                      <div className={`ml-auto font-bold ${
                        factor.impact > 0 ? 'text-green-500' : 'text-red-500'
                      }`}>
                        {factor.impact > 0 ? '+' : ''}{factor.impact}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
