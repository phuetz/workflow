import React from 'react';
import { X } from 'lucide-react';
import { useWorkflowStore } from '../store/workflowStore';
import registry from './nodeConfigRegistry';

export default function NodeConfigPanel() {
  const selectedNode = useWorkflowStore((state) => state.selectedNode);
  const setSelectedNode = useWorkflowStore((state) => state.setSelectedNode);

  const open = Boolean(selectedNode);
  const handleClose = () => setSelectedNode(null);

  const ConfigComponent = selectedNode?.data?.type
    ? registry[selectedNode.data.type] || registry.default
    : null;

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/20 z-40"
        onClick={handleClose}
      />
      
      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-xl z-50 transform transition-transform duration-300">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="font-medium text-lg">Node Configuration</div>
          <button
            onClick={handleClose}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close configuration panel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4 overflow-y-auto h-[calc(100vh-73px)]">
          {selectedNode && ConfigComponent ? (
            <ConfigComponent node={selectedNode} />
          ) : (
            <div className="text-gray-500 text-center py-8">
              No configuration available for this node type.
            </div>
          )}
        </div>
      </div>
    </>
  );
}