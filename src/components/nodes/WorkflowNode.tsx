import React, { memo, useCallback } from 'react';
import { Handle, Position } from '@xyflow/react';
import { useWorkflowStore } from '../../store/workflowStore';

interface WorkflowNodeProps {
  data: { label?: string; [key: string]: unknown };
  id: string;
  selected?: boolean;
}

const WorkflowNode = memo(function WorkflowNode({ data, id, selected }: WorkflowNodeProps) {
  const { setSelectedNode, darkMode, nodes } = useWorkflowStore();

  const handleClick = useCallback(() => {
    const node = nodes.find(n => n.id === id);
    if (node) {
      setSelectedNode(node);
    }
  }, [id, nodes, setSelectedNode]);

  return (
    <div
      onClick={handleClick}
      className={`px-4 py-2 rounded-lg border-2 ${
        selected ? 'border-blue-500' : 'border-gray-300'
      } ${darkMode ? 'bg-gray-800 text-white' : 'bg-white'} cursor-pointer hover:shadow-md transition-shadow`}
    >
      <Handle type="target" position={Position.Left} />
      <div className="text-sm font-medium">{data.label}</div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.id === nextProps.id &&
    prevProps.selected === nextProps.selected &&
    prevProps.data.label === nextProps.data.label
  );
});

export default WorkflowNode;