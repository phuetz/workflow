import React from 'react';
import { useWorkflowStore } from '../store/workflowStore';
import { Group, Ungroup, Square } from 'lucide-react';

export const NodeGroupManager: React.FC = () => {
  const {
    nodes,
    nodeGroups,
    selectedNodes,
    addNodeGroup,
    deleteNodeGroup,
    darkMode,
  } = useWorkflowStore();

  const handleGroupNodes = () => {
    if (selectedNodes.length < 2) return;
    
    const groupId = `group_${Date.now()}`;
    
    // Calculate bounding box for selected nodes
    const selectedNodeObjects = nodes.filter(node => selectedNodes.includes(node.id));
    const minX = Math.min(...selectedNodeObjects.map(n => n.position.x));
    const minY = Math.min(...selectedNodeObjects.map(n => n.position.y));
    const maxX = Math.max(...selectedNodeObjects.map(n => n.position.x + 200));
    const maxY = Math.max(...selectedNodeObjects.map(n => n.position.y + 100));
    
    const newGroup = {
      id: groupId,
      name: `Group ${nodeGroups.length + 1}`,
      nodeIds: selectedNodes,
      position: { x: minX - 10, y: minY - 10 },
      size: { width: maxX - minX + 20, height: maxY - minY + 20 },
      color: '#e0e7ff',
      collapsed: false,
    };

    addNodeGroup(newGroup);
  };

  const handleUngroupNodes = (groupId: string) => {
    deleteNodeGroup(groupId);
  };

  const canGroup = selectedNodes.length >= 2;
  const selectedGroups = nodeGroups.filter(group =>
    selectedNodes.some(nodeId => group.nodeIds.includes(nodeId))
  );

  return (
    <div
      className={`flex items-center gap-2 p-2 rounded-lg shadow-sm border ${
        darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}
    >
      <button
        onClick={handleGroupNodes}
        disabled={!canGroup}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
          canGroup
            ? darkMode
              ? 'bg-blue-700 text-white hover:bg-blue-600'
              : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
            : darkMode
              ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
              : 'bg-gray-50 text-gray-400 cursor-not-allowed'
        }`}
        title="Group selected nodes"
      >
        <Group size={16} />
        Group ({selectedNodes.length})
      </button>

      {selectedGroups.length > 0 && (
        <button
          onClick={() => selectedGroups.forEach(group => handleUngroupNodes(group.id))}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${darkMode ? 'bg-red-700 text-white hover:bg-red-600' : 'bg-red-50 text-red-700 hover:bg-red-100'}`}
          title="Ungroup selected groups"
        >
          <Ungroup size={16} />
          Ungroup
        </button>
      )}

      <div className={`w-px h-6 mx-1 ${darkMode ? 'bg-gray-600' : 'bg-gray-200'}`} />

      <div className="flex items-center gap-1">
        <Square size={14} className={darkMode ? 'text-gray-400' : 'text-gray-400'} />
        <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          {nodeGroups.length} group{nodeGroups.length !== 1 ? 's' : ''}
        </span>
      </div>
    </div>
  );
};