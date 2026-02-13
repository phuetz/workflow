import React from 'react';
import { Handle, Position } from '@xyflow/react';

interface NodePortsProps {
  inputCount: number;
  outputCount: number;
  nodeType: string;
  hasErrorHandle?: boolean;
}

/**
 * Node input/output ports (handles)
 * n8n-style: small dots that grow on hover with blue highlight
 */
export const NodePorts: React.FC<NodePortsProps> = ({
  inputCount,
  outputCount,
  nodeType,
  hasErrorHandle = true
}) => {
  return (
    <>
      {/* Input Handles */}
      {inputCount > 0 && Array.from({ length: inputCount }).map((_, index) => (
        <Handle
          key={`input-${index}`}
          type="target"
          position={Position.Left}
          id={`input-${index}`}
          className="!w-2.5 !h-2.5 !bg-gray-400 !rounded-full !border-2 !border-white hover:!bg-blue-500 hover:!w-3.5 hover:!h-3.5 !transition-all !duration-150 !shadow-sm"
          style={{
            left: -5,
            top: inputCount === 1 ? '50%' : `${30 + (index * 40)}%`,
            transform: 'translateY(-50%)'
          }}
        />
      ))}

      {/* Output Handles */}
      {outputCount > 0 && Array.from({ length: outputCount }).map((_, index) => {
        // For condition nodes, use specific IDs
        const handleId = nodeType === 'condition'
          ? (index === 0 ? 'true' : 'false')
          : `output-${index}`;

        return (
          <Handle
            key={`output-${index}`}
            type="source"
            position={Position.Right}
            id={handleId}
            className="!w-2.5 !h-2.5 !bg-gray-400 !rounded-full !border-2 !border-white hover:!bg-blue-500 hover:!w-3.5 hover:!h-3.5 !transition-all !duration-150 !shadow-sm"
            style={{
              right: -5,
              top: outputCount === 1 ? '50%' : `${30 + (index * 40)}%`,
              transform: 'translateY(-50%)'
            }}
          />
        );
      })}

      {/* Error Handle */}
      {hasErrorHandle && (
        <Handle
          type="source"
          position={Position.Bottom}
          id="error"
          className="!w-2 !h-2 !bg-red-400 !rounded-full !border-2 !border-white hover:!bg-red-500 hover:!w-3 hover:!h-3 !transition-all !duration-150 !shadow-sm"
          style={{ bottom: -4 }}
        />
      )}

      {/* Condition Labels */}
      {nodeType === 'condition' && outputCount > 1 && (
        <>
          <div className="absolute -right-8 top-3 text-[10px] text-green-600 font-semibold">
            true
          </div>
          <div className="absolute -right-8 bottom-3 text-[10px] text-amber-600 font-semibold">
            false
          </div>
        </>
      )}
    </>
  );
};
