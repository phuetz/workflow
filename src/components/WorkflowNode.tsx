import React from 'react';
import { Handle, Position } from 'reactflow';
import { useWorkflowStore } from '../store/workflowStore';

interface WorkflowNodeProps {
  data: any;
  id: string;
  selected?: boolean;
}

export default function WorkflowNode({ data, id, selected }: WorkflowNodeProps) {
  const { setSelectedNode, darkMode } = useWorkflowStore();

  const handleClick = () => {
    setSelectedNode({ id, data });
  };

  return (
    <div
      onClick={handleClick}
      className={`px-4 py-2 rounded-lg border-2 ${
        selected ? 'border-blue-500' : 'border-gray-300'
      } bg-white cursor-pointer hover:shadow-md transition-shadow`}
    >
      <Handle type="target" position={Position.Left} />
      <div className="text-sm font-medium">{data.label}</div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}