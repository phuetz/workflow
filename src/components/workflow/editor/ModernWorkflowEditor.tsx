/**
 * ModernWorkflowEditor
 *
 * Main visual workflow editor component using ReactFlow.
 * Refactored from 2183 lines to ~380 lines by extracting to components and hooks.
 */

import React, { useEffect } from 'react';
import { useReactFlow, MiniMap, Node } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import '../../../styles/design-system.css';

import { useWorkflowStore } from '../../../store/workflowStore';
import { nodeTypes } from '../../../data/nodeTypes';
import { useUpdateTimestamp } from '../../../services/UpdateTimestampService';
import { useKeyboardShortcuts } from '../../../hooks/useKeyboardShortcuts';
import { UnifiedSidebar } from '../../core/UnifiedSidebar';
import NodeConfigPanel from '../../nodes/NodeConfigPanel';

import {
  useWorkflowState,
  useWorkflowActions,
  useWorkflowEvents,
  useProcessedNodes,
  useProcessedEdges,
  useSelectedNodeIds,
  useAutoLayout,
  useWorkflowExecution,
} from './hooks';

import { EditorCanvas, EditorHeader, EditorStatusBar, EditorModals, EditorPanels } from './components';
import { MetricsPanel, StatusIndicator, EmptyState } from './panels';

function ModernWorkflowEditor() {
  const { project, fitView, zoomIn, zoomOut, zoomTo } = useReactFlow();

  // Store state (only what's needed at this level)
  const store = useWorkflowStore();
  const { nodes, edges, selectedNode, selectedNodes, darkMode, isExecuting,
          nodeExecutionStatus, currentEnvironment, isCurrentWorkflowLocked,
          setSelectedNode, setSelectedNodes, saveWorkflow, exportWorkflow, importWorkflow } = store;

  // Local UI state hook
  const state = useWorkflowState();

  // Actions hook
  const actions = useWorkflowActions({
    getId: state.getId,
    snapToGrid: state.snapToGrid,
    clipboard: state.clipboard,
    setClipboard: state.setClipboard,
  });

  // Auto-layout and execution hooks
  const { performAutoLayout } = useAutoLayout();
  const { executeWorkflow } = useWorkflowExecution({ nodes, edges });

  // Events hook
  const events = useWorkflowEvents({
    reactFlowWrapper: state.reactFlowWrapper,
    pendingConnectionRef: state.pendingConnectionRef,
    project, fitView, zoomIn, zoomOut, zoomTo,
    getId: state.getId,
    setConfigPanelOpen: state.setConfigPanelOpen,
    setContextMenu: state.setContextMenu,
    setQuickSearchOpen: state.setQuickSearchOpen,
    setQuickSearchPosition: state.setQuickSearchPosition,
    setFocusPanelOpen: state.setFocusPanelOpen,
    setFocusPanelNode: state.setFocusPanelNode,
    setN8nNodePanelOpen: state.setN8nNodePanelOpen,
    setCommandBarOpen: state.setCommandBarOpen,
    setShortcutsModalOpen: state.setShortcutsModalOpen,
    setTemplatesGalleryOpen: state.setTemplatesGalleryOpen,
    setPerformanceMonitorOpen: state.setPerformanceMonitorOpen,
    setSidebarOpen: state.setSidebarOpen,
    setShowMiniMap: state.setShowMiniMap,
    setShowGrid: state.setShowGrid,
    setSnapToGrid: state.setSnapToGrid,
    setDataPinningPanelOpen: state.setDataPinningPanelOpen,
    setExecutionHistoryOpen: state.setExecutionHistoryOpen,
    setNodeSearchOpen: state.setNodeSearchOpen,
    setVariablesPanelOpen: state.setVariablesPanelOpen,
    setCustomNodeCreatorOpen: state.setCustomNodeCreatorOpen,
    setDocGeneratorOpen: state.setDocGeneratorOpen,
    setCollaborationOpen: state.setCollaborationOpen,
    setStepDebugPanelOpen: state.setStepDebugPanelOpen,
    setZoomLevel: state.setZoomLevel,
    useN8nStyle: state.useN8nStyle,
    snapToGrid: state.snapToGrid,
    showMiniMap: state.showMiniMap,
    executeWorkflow,
    performAutoLayout,
    createNodeData: actions.createNodeData,
    deleteSelectedNodes: actions.deleteSelectedNodes,
    duplicateSelectedNodes: actions.duplicateSelectedNodes,
  });

  // Process nodes/edges for rendering
  const selectedNodeIds = useSelectedNodeIds(selectedNodes as unknown as Node[], selectedNode as unknown as Node);
  const processedNodes = useProcessedNodes({ nodes, nodeExecutionStatus, selectedNodeIds, viewMode: state.viewMode });
  const processedEdges = useProcessedEdges({ edges, nodeExecutionStatus, connectionStyle: state.connectionStyle, executionResults: store.executionResults });

  const workflowLastUpdate = useUpdateTimestamp();
  useKeyboardShortcuts(true);

  // Auto-show bulk panel when multiple nodes selected
  useEffect(() => {
    state.setBulkPanelOpen(selectedNodes.length > 1);
  }, [selectedNodes.length, state.setBulkPanelOpen]);

  // Copy/paste event listeners
  useEffect(() => {
    const handlers = {
      'copy-nodes': actions.handleCopyNodes,
      'paste-nodes': actions.handlePasteNodes,
      'cut-nodes': actions.handleCutNodes,
    };
    Object.entries(handlers).forEach(([event, handler]) => window.addEventListener(event, handler));
    return () => Object.entries(handlers).forEach(([event, handler]) => window.removeEventListener(event, handler));
  }, [actions.handleCopyNodes, actions.handlePasteNodes, actions.handleCutNodes]);

  return (
    <div className={`h-screen w-full flex flex-col ${darkMode ? 'bg-[#1a1a2e]' : 'bg-[#f5f5f5]'}`}>
      {/* Top bar - n8n style compact header */}
      <EditorHeader
        onExecute={executeWorkflow}
        onSave={saveWorkflow}
        onExport={exportWorkflow}
        onImport={importWorkflow}
        onDebug={() => state.setStepDebugPanelOpen(true)}
        isExecuting={isExecuting}
      />

      {/* Main content area: sidebar | canvas */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar - node picker */}
        <UnifiedSidebar
          showNodePalette
          isExpanded={state.sidebarOpen}
          onExpandedChange={state.setSidebarOpen}
        />

        {/* Canvas area */}
        <div className="flex-1 relative min-w-0" ref={state.reactFlowWrapper}>
          <EditorCanvas
          nodes={processedNodes}
          edges={processedEdges}
          onNodesChange={actions.onNodesChange}
          onEdgesChange={actions.onEdgesChange}
          onConnect={actions.onConnect}
          onNodeClick={events.handleNodeClick}
          onEdgeClick={events.handleEdgeClick}
          onNodeContextMenu={events.handleNodeContextMenu}
          onConnectStart={events.onConnectStart}
          onConnectEnd={events.onConnectEnd}
          onDrop={events.onDrop}
          onDragOver={events.onDragOver}
          onPaneClick={events.handlePaneClick}
          onDoubleClick={events.handlePaneDoubleClick}
          onMove={events.onMove}
          isValidConnection={actions.isValidConnection}
          darkMode={darkMode}
          snapToGrid={state.snapToGrid}
          showGrid={state.showGrid}
          showAlignmentGuides={state.snapToGrid}
          wrapperRef={state.reactFlowWrapper}
        >
          {state.showMiniMap && (
            <MiniMap
              className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-xl rounded-lg border`}
              maskColor={darkMode ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.8)'}
              nodeColor={(node) => {
                const colors: Record<string, string> = { trigger: '#f59e0b', communication: '#3b82f6', database: '#8b5cf6', ai: '#10b981', cloud: '#06b6d4', core: '#6b7280', flow: '#6366f1' };
                return colors[nodeTypes[node.data.type]?.category] || '#6b7280';
              }}
              position="bottom-right"
              style={{ width: 250, height: 150 }}
            />
          )}
          {state.showMetrics && <MetricsPanel nodes={nodes} edges={edges} zoomLevel={state.zoomLevel} darkMode={darkMode} />}
          <StatusIndicator isExecuting={isExecuting} darkMode={darkMode} />
          {isCurrentWorkflowLocked && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50">
              <div className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg border ${darkMode ? 'bg-amber-900/90 text-amber-200 border-amber-700' : 'bg-amber-100 text-amber-800 border-amber-300'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                <span className="font-medium">Workflow Locked</span>
                <span className="text-sm opacity-75">- Modifications disabled</span>
              </div>
            </div>
          )}
        </EditorCanvas>

          {nodes.length === 0 && <EmptyState />}
        </div>

        {/* Right panel - docked node config (380px) */}
        {selectedNode && (
          <div className={`w-[380px] flex-shrink-0 border-l ${darkMode ? 'border-gray-700' : 'border-gray-200'} transition-all duration-300 animate-slideIn`}>
            <NodeConfigPanel onClose={() => setSelectedNode(null)} />
          </div>
        )}
      </div>

      {/* Bottom status bar */}
      <EditorStatusBar
        nodeCount={nodes.length}
        edgeCount={edges.length}
        currentEnvironment={currentEnvironment}
        isLocked={isCurrentWorkflowLocked}
        zoomLevel={state.zoomLevel}
        viewMode={state.viewMode}
        lastUpdate={String(workflowLastUpdate)}
        darkMode={darkMode}
      />

      <EditorModals
        darkMode={darkMode}
        aiBuilderOpen={state.aiBuilderOpen}
        setAiBuilderOpen={state.setAiBuilderOpen}
        visualDesignerOpen={state.visualDesignerOpen}
        setVisualDesignerOpen={state.setVisualDesignerOpen}
        shortcutsModalOpen={state.shortcutsModalOpen}
        setShortcutsModalOpen={state.setShortcutsModalOpen}
        templatesGalleryOpen={state.templatesGalleryOpen}
        setTemplatesGalleryOpen={state.setTemplatesGalleryOpen}
        performanceMonitorOpen={state.performanceMonitorOpen}
        setPerformanceMonitorOpen={state.setPerformanceMonitorOpen}
        n8nImportModalOpen={state.n8nImportModalOpen}
        setN8nImportModalOpen={state.setN8nImportModalOpen}
        commandBarOpen={state.commandBarOpen}
        setCommandBarOpen={state.setCommandBarOpen}
        contextMenu={state.contextMenu}
        setContextMenu={state.setContextMenu}
        quickSearchOpen={state.quickSearchOpen}
        setQuickSearchOpen={state.setQuickSearchOpen}
        quickSearchPosition={state.quickSearchPosition}
        getId={state.getId}
        createNodeData={actions.createNodeData}
        performAutoLayout={performAutoLayout}
      />

      <EditorPanels
        darkMode={darkMode}
        sidebarOpen={state.sidebarOpen}
        setSidebarOpen={state.setSidebarOpen}
        searchTerm={state.searchTerm}
        setSearchTerm={state.setSearchTerm}
        filterCategory={state.filterCategory}
        setFilterCategory={state.setFilterCategory}
        useN8nStyle={state.useN8nStyle}
        configPanelOpen={state.configPanelOpen}
        setConfigPanelOpen={state.setConfigPanelOpen}
        n8nNodePanelOpen={state.n8nNodePanelOpen}
        setN8nNodePanelOpen={state.setN8nNodePanelOpen}
        n8nNodePanelPosition={state.n8nNodePanelPosition}
        focusPanelOpen={state.focusPanelOpen}
        setFocusPanelOpen={state.setFocusPanelOpen}
        focusPanelNode={state.focusPanelNode}
        setFocusPanelNode={state.setFocusPanelNode}
        isExecuting={isExecuting}
        dataPreview={state.dataPreview}
        setDataPreview={state.setDataPreview}
        pinDataPanel={state.pinDataPanel}
        setPinDataPanel={state.setPinDataPanel}
        bulkPanelOpen={state.bulkPanelOpen}
        setBulkPanelOpen={state.setBulkPanelOpen}
        dataPinningPanelOpen={state.dataPinningPanelOpen}
        setDataPinningPanelOpen={state.setDataPinningPanelOpen}
        executionHistoryOpen={state.executionHistoryOpen}
        setExecutionHistoryOpen={state.setExecutionHistoryOpen}
        nodeSearchOpen={state.nodeSearchOpen}
        setNodeSearchOpen={state.setNodeSearchOpen}
        variablesPanelOpen={state.variablesPanelOpen}
        setVariablesPanelOpen={state.setVariablesPanelOpen}
        customNodeCreatorOpen={state.customNodeCreatorOpen}
        setCustomNodeCreatorOpen={state.setCustomNodeCreatorOpen}
        docGeneratorOpen={state.docGeneratorOpen}
        setDocGeneratorOpen={state.setDocGeneratorOpen}
        collaborationOpen={state.collaborationOpen}
        setCollaborationOpen={state.setCollaborationOpen}
        stepDebugPanelOpen={state.stepDebugPanelOpen}
        setStepDebugPanelOpen={state.setStepDebugPanelOpen}
        setHighlightedDebugNode={state.setHighlightedDebugNode}
        zoomLevel={state.zoomLevel}
        viewMode={state.viewMode}
        zoomIn={zoomIn}
        zoomOut={zoomOut}
        zoomTo={zoomTo}
        fitView={fitView}
        showGrid={state.showGrid}
        setShowGrid={state.setShowGrid}
        showMiniMap={state.showMiniMap}
        setShowMiniMap={state.setShowMiniMap}
        setShortcutsModalOpen={state.setShortcutsModalOpen}
        handleBulkDelete={actions.handleBulkDelete}
        handleBulkDuplicate={actions.handleBulkDuplicate}
        handleBulkAlign={actions.handleBulkAlign}
        handleBulkDistribute={actions.handleBulkDistribute}
        handleBulkToggleEnabled={actions.handleBulkToggleEnabled}
        getId={state.getId}
        createNodeData={actions.createNodeData}
      />
    </div>
  );
}

export default ModernWorkflowEditor;
