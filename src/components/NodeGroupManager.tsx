import React from 'react';
import { useWorkflowStore } from '../store/workflowStore';
import { Group, Ungroup, Square, Move3D } from 'lucide-react';

interface NodeGroupManagerProps {
  selectedNodes: string[];
  onGroupNodes: (nodeIds: string[]) => void;
  onUngroupNodes: (groupId: string) => void;
}

export const NodeGroupManager: React.FC<NodeGroupManagerProps> = ({
  selectedNodes,
  onGroupNodes,
  onUngroupNodes
}) => {
  const { nodes, groups, updateGroup, deleteGroup } = useWorkflowStore();

  const handleGroupNodes = () => {
    if (selectedNodes.length < 2) return;
    
    const groupId = `group_${Date.now()}`;
    onGroupNodes(selectedNodes);
    
    // Calculate bounding box for selected nodes
    const selectedNodeObjects = nodes.filter(node => selectedNodes.includes(node.id));
    const minX = Math.min(...selectedNodeObjects.map(n => n.position.x));
    const minY = Math.min(...selectedNodeObjects.map(n => n.position.y));
    const maxX = Math.max(...selectedNodeObjects.map(n => n.position.x + 200));
    const maxY = Math.max(...selectedNodeObjects.map(n => n.position.y + 100));
    
    const newGroup = {
      id: groupId,
      name: `Group ${groups.length + 1}`,
      nodeIds: selectedNodes,
      position: { x: minX - 10, y: minY - 10 },
      size: { width: maxX - minX + 20, height: maxY - minY + 20 },
      color: '#e0e7ff',
      collapsed: false
    };
    
    updateGroup(newGroup);
  };

  const handleUngroupNodes = (groupId: string) => {
    onUngroupNodes(groupId);
    deleteGroup(groupId);
  };

  const canGroup = selectedNodes.length >= 2;
  const selectedGroups = groups.filter(group => 
    selectedNodes.some(nodeId => group.nodeIds.includes(nodeId))
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
          onClick={() => selectedGroups.forEach(group => handleUngroupNodes(group.id))}
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
          {groups.length} group{groups.length !== 1 ? 's' : ''}
        </span>
      </div>
    </div>
  );
};