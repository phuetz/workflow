import React from 'react';
import { useWorkflowStore } from '../store/workflowStore';
import { Group, Ungroup, Square } from 'lucide-react';

export const NodeGroupManager: React.FC = () => {
  const {
    selectedNodes,
    nodeGroups,
    groupSelectedNodes,
    ungroupSelectedNodes
  } = useWorkflowStore();

  const handleGroupNodes = () => {
    if (selectedNodes.length < 2) return;
    groupSelectedNodes();
  };

  const handleUngroupNodes = () => {
    if (selectedNodes.length === 0) return;
    ungroupSelectedNodes();
  };

  const canGroup = selectedNodes.length >= 2;
  const selectedGroups = nodeGroups.filter(group =>
    selectedNodes.some(nodeId => group.nodes.includes(nodeId))
  );

  return (
    <div className="flex items-center gap-2 p-2 bg-white rounded-lg shadow-sm border">
      <button
        onClick={handleGroupNodes}
        disabled={!canGroup}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
          canGroup
            ? 'bg-blue-50 text-blue-700 hover:bg-blue-100'
            : 'bg-gray-50 text-gray-400 cursor-not-allowed'
        }`}
        title="Group selected nodes"
      >
        <Group size={16} />
        Group ({selectedNodes.length})
      </button>

        {selectedGroups.length > 0 && (
          <button
            onClick={handleUngroupNodes}
          className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
          title="Ungroup selected groups"
        >
          <Ungroup size={16} />
          Ungroup
        </button>
      )}

      <div className="w-px h-6 bg-gray-200 mx-1" />

      <div className="flex items-center gap-1">
        <Square size={14} className="text-gray-400" />
        <span className="text-xs text-gray-500">
          {nodeGroups.length} group{nodeGroups.length !== 1 ? 's' : ''}
        </span>
      </div>
    </div>
  );
};