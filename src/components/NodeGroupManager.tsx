import React from 'react';
import { useWorkflowStore } from '../store/workflowStore';

interface NodeGroup {
  id: string;
  name: string;
  color: string;
  nodes: string[];
  position: { x: number; y: number };
  size: { width: number; height: number };
}

export default function NodeGroupManager() {
  const { nodes, nodeGroups, addNodeGroup, updateNodeGroup, darkMode } = useWorkflowStore();

  return (
    <>
      {/* Render Node Groups */}
      {nodeGroups?.map((group: NodeGroup) => (
        <div
          key={group.id}
          className="absolute pointer-events-none"
          style={{
            left: group.position.x,
            top: group.position.y,
            width: group.size.width,
            height: group.size.height,
            backgroundColor: `${group.color}20`,
            border: `2px dashed ${group.color}`,
            borderRadius: '8px',
            zIndex: -1
          }}
        >
          <div
            className="absolute -top-6 left-2 px-2 py-1 rounded text-xs font-medium text-white"
            style={{ backgroundColor: group.color }}
          >
            {group.name}
          </div>
        </div>
      ))}
    </>
  );
}