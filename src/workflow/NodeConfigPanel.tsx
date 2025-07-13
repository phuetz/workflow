import React from 'react';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import { useWorkflowStore } from '../store/workflowStore';
import registry from './nodeConfigRegistry';

export default function NodeConfigPanel() {
  const { selectedNode, setSelectedNode } = useWorkflowStore();

  const open = Boolean(selectedNode);
  const handleClose = () => setSelectedNode(null);

  const ConfigComponent = selectedNode
    ? registry[selectedNode.data.type] || registry.default
    : null;

  return (
    <Drawer anchor="right" open={open} onClose={handleClose}>
      <div className="flex items-center justify-between p-4 border-b">
        <div className="font-medium">Configuration</div>
        <IconButton onClick={handleClose} size="small">
          <CloseIcon fontSize="small" />
        </IconButton>
      </div>
      {selectedNode && ConfigComponent && <ConfigComponent node={selectedNode} />}
    </Drawer>
  );
}
