import React, { useCallback, useRef, useEffect, useState, useMemo } from 'react';
import * as Icons from 'lucide-react';
import ReactFlow, {
  ReactFlowProvider,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  useReactFlow,
  Controls,
  Background,
  MiniMap,
  Panel,
  MarkerType,
  ConnectionMode,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { useWorkflowStore } from './store/workflowStore';
import { nodeTypes } from './data/nodeTypes';
import { WorkflowExecutor } from './components/ExecutionEngine';
import CustomNode from './components/CustomNode';
import NodeConfigPanel from './components/NodeConfigPanel';
import EdgeConfigPanel from './components/EdgeConfigPanel';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import KeyboardShortcuts from './components/KeyboardShortcuts';
import CredentialsManager from './components/CredentialsManager';
import ExpressionBuilder from './components/ExpressionBuilder';
import WebhookManager from './components/WebhookManager';
import ScheduleManager from './components/ScheduleManager';
import MonitoringDashboard from './components/MonitoringDashboard';
import ExecutionViewer from './components/ExecutionViewer';
import WorkflowValidator from './components/WorkflowValidator';
import { UndoRedoManager } from './components/UndoRedoManager';
import { MultiSelectManager } from './components/MultiSelectManager';
import { DebugPanel } from './components/DebugPanel';
import { CollaborationPanel } from './components/CollaborationPanel';
import { PerformanceMonitor } from './components/PerformanceMonitor';
import { AutoSaveManager } from './components/AutoSaveManager';
import { NodeGroupManager } from './components/NodeGroupManager';
import StickyNotes from './components/StickyNotes'; 
import Dashboard from './components/Dashboard';
import WorkflowTemplates from './components/WorkflowTemplates';
import AIWorkflowGenerator from './components/AIWorkflowGenerator'; 
import AFLOWOptimizer from './components/AFLOWOptimizer'; 
import PluginHotReload from './components/PluginHotReload'; 
import VoiceAssistant from './components/VoiceAssistant'; 
import AdvancedOnboarding from './components/AdvancedOnboarding'; 
import AICodeGenerator from './components/AICodeGenerator'; 
import SmartAutoComplete from './components/SmartAutoComplete'; 
import UniversalAPIConnector from './components/UniversalAPIConnector'; 
import GraphQLQueryBuilder from './components/GraphQLQueryBuilder';

// Composant principal de l'éditeur
function WorkflowEditor() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { project } = useReactFlow();
  
  const { 
    nodes,
    edges,
    setNodes,
    setEdges,
    setSelectedNode,
    selectedEdge,
    setSelectedEdge,
    darkMode,
    isExecuting,
    setIsExecuting,
    setExecutionResult,
    setExecutionError,
    setNodeExecutionData,
    setNodeStatus,
    clearNodeStatuses,
    nodeExecutionStatus,
    setCurrentExecutingNode,
    clearExecution,
    addExecutionToHistory,
    validateWorkflow,
    globalVariables,
    environments,
    currentEnvironment,
    credentials,
    addLog,
    saveWorkflow,
    exportWorkflow,
    importWorkflow,
    addToHistory,
    selectedNodes,
    setSelectedNodes,
    stickyNotes,
    addStickyNote,
    updateStickyNote,
    deleteStickyNote,
    workflows
  } = useWorkflowStore();
  
  const [realTimeData, setRealTimeData] = useState<any[]>([]);
  const [selectedView, setSelectedView] = useState('editor');
  
  let id = 0;
  const getId = () => `node_${++id}_${Date.now()}`;

  const displayEdges = useMemo(() => {
    return edges.map((edge: any) => {
      const status = nodeExecutionStatus[edge.source];
      let style = edge.style || {};
      let animated = edge.animated;
      if (status === 'running') {
        style = { ...style, stroke: '#3b82f6' };
        animated = true;
      } else if (status === 'success') {
        style = { ...style, stroke: '#16a34a' };
        animated = false;
      } else if (status === 'error') {
        style = { ...style, stroke: '#dc2626' };
        animated = false;
      }
      return { ...edge, style, animated };
    });
  }, [edges, nodeExecutionStatus]);
  
  // Simulation de données temps réel
  useEffect(() => {
    const interval = setInterval(() => {
      const newDataPoint = {
        timestamp: new Date().toISOString(),
        executions: Math.floor(Math.random() * 10) + 5,
        errors: Math.floor(Math.random() * 3),
        cpu: Math.floor(Math.random() * 30) + 20,
        memory: Math.floor(Math.random() * 40) + 30,
      };
      setRealTimeData(prev => [...prev.slice(-29), newDataPoint]);
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);
  
  const onNodesChange = useCallback(
    (changes: any) => {
      const newNodes = applyNodeChanges(changes, nodes);
      
      // Add to history for undo/redo
      const hasSignificantChange = changes.some((change: any) => 
        change.type === 'add' || change.type === 'remove'
      );
      
      if (hasSignificantChange) {
        addToHistory(nodes, edges);
      }
      
      setNodes(applyNodeChanges(changes, nodes));
    },
    [nodes, setNodes, edges, addToHistory]
  );
  
  const onEdgesChange = useCallback(
    (changes: any) => {
      const hasSignificantChange = changes.some((change: any) => 
        change.type === 'add' || change.type === 'remove'
      );
      
      if (hasSignificantChange) {
        addToHistory(nodes, edges);
      }
      
      setEdges(applyEdgeChanges(changes, edges));
    },
    [edges, setEdges, nodes, addToHistory]
  );
  
  const onConnect = useCallback(
    (params: any) => {
      addToHistory(nodes, edges);
      
      const newEdge = addEdge({ 
        ...params, 
        animated: true,
        style: { stroke: '#9CA3AF', strokeWidth: 1.5 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: '#9CA3AF',
          width: 12,
          height: 12,
        },
      }, edges);
      setEdges(newEdge);
    },
    [edges, setEdges, nodes, addToHistory]
  );
  
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);
  
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      
      const type = event.dataTransfer.getData('application/reactflow');
      
      if (typeof type === 'undefined' || !type) {
        return;
      }
      
      const position = project({
        x: event.clientX - (reactFlowWrapper.current?.getBoundingClientRect().left || 0) - 100,
        y: event.clientY - (reactFlowWrapper.current?.getBoundingClientRect().top || 0) - 30,
      });
      
      const newNode = {
        id: getId(),
        type: 'custom',
        position,
        data: { 
          label: nodeTypes[type].label,
          type: type,
          config: {}
        },
      };
      
      setNodes([...nodes, newNode]);
      addToHistory(nodes, edges);
      
      addLog({
        level: 'info',
        message: `Nœud ajouté: ${nodeTypes[type].label}`,
        data: { nodeId: newNode.id, type }
      });
    },
    [project, nodes, setNodes, edges, addToHistory, addLog]
  );
  
  // Fonction d'exécution du workflow
  const executeWorkflow = async () => {
    const errors = validateWorkflow();
    if (errors.length > 0) {
      // Show validation errors as toast
      const toast = document.createElement('div');
      toast.className = 'fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg z-50 max-w-md';
      toast.innerHTML = `<div class="font-bold">Validation Errors:</div><div class="text-sm">${errors.join('<br>')}</div>`;
      document.body.appendChild(toast);
      setTimeout(() => document.body.removeChild(toast), 5000);
      return;
    }
    
    clearExecution();
    clearNodeStatuses();
    setIsExecuting(true);
    
    const startTime = Date.now();
    
    const executor = new WorkflowExecutor(nodes, edges, {
      globalVariables,
      environment: environments[currentEnvironment],
      credentials,
      loadWorkflow: async (id: string) => workflows[id],
    });
    
    try {
      const result = await executor.execute(
        (nodeId: string) => {
          setCurrentExecutingNode(nodeId);
          setNodeStatus(nodeId, 'running');
        },
        (nodeId: string, input: any, result: any) => {
          setExecutionResult(nodeId, result);
          setNodeExecutionData(nodeId, { input, output: result });
          setNodeStatus(nodeId, 'success');
          setCurrentExecutingNode(null);
        },
        (nodeId: string, error: any) => {
          setExecutionError(nodeId, error);
          setNodeStatus(nodeId, 'error');
          setCurrentExecutingNode(null);
        }
      );
      
      addExecutionToHistory({
        workflowId: 'current',
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime,
        status: result.status,
        nodesExecuted: result.nodesExecuted,
        errors: result.errors,
        environment: currentEnvironment
      });
      
      addLog({
        level: result.status === 'success' ? 'info' : 'error',
        message: `Workflow ${result.status === 'success' ? 'exécuté avec succès' : 'terminé avec des erreurs'}`,
        data: { duration: result.duration, nodes: result.nodesExecuted }
      });
      
    } catch (error: any) {
      console.error('Erreur d\'exécution:', error);
      addLog({
        level: 'error',
        message: 'Erreur critique d\'exécution',
        data: { error: error.message }
      });
    } finally {
      setIsExecuting(false);
      setCurrentExecutingNode(null);
    }
  };
  
  // Raccourcis clavier
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Multi-select with Ctrl/Cmd + A
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        setSelectedNodes(nodes);
        return;
      }
      
      // Save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveWorkflow();
        return;
      }
      
      // Delete
      if (e.key === 'Delete') {
        if (selectedNodes.length > 0) {
          addToHistory(nodes, edges);
          const nodeIdsToDelete = selectedNodes.map(n => n.id);
          setNodes(nodes.filter(n => !nodeIdsToDelete.includes(n.id)));
          setEdges(edges.filter(e => !nodeIdsToDelete.includes(e.source) && !nodeIdsToDelete.includes(e.target)));
          setSelectedNodes([]);
        } else {
          const selectedNode = useWorkflowStore.getState().selectedNode;
          if (selectedNode) {
            addToHistory(nodes, edges);
            setNodes(nodes.filter(n => n.id !== selectedNode.id));
            setEdges(edges.filter(e => e.source !== selectedNode.id && e.target !== selectedNode.id));
            setSelectedNode(null);
          }
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [saveWorkflow, nodes, edges, setNodes, setEdges, setSelectedNode, selectedNodes, setSelectedNodes, addToHistory]);
  
  const nodeTypesMap = {
    custom: CustomNode,
  };
  
  const connectionLineStyle = {
    stroke: '#9CA3AF',
    strokeWidth: 1.5,
  };
  
  // Gestion de l'import de fichier
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      importWorkflow(file);
    }
  };
  
  return (
    <div className={`h-screen w-screen relative ${darkMode ? 'bg-gray-900' : ''}`} ref={reactFlowWrapper}>
      {/* Navigation Views */}
      <div className="absolute top-20 left-4 z-20">
        <div className="flex flex-col space-y-2">
          {[
            { id: 'editor', label: '🔧 Editor', icon: '🔧' },
            { id: 'validator', label: '✅ Validator', icon: '✅' },
            { id: 'credentials', label: '🔐 Credentials', icon: '🔐' },
            { id: 'expressions', label: '📝 Expressions', icon: '📝' },
            { id: 'webhooks', label: '🌐 Webhooks', icon: '🌐' },
            { id: 'schedules', label: '⏰ Schedules', icon: '⏰' },
            { id: 'monitoring', label: '📊 Monitoring', icon: '📊' }
          ].map(view => (
            <button
              key={view.id}
              onClick={() => setSelectedView(view.id)}
              className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                selectedView === view.id
                  ? 'bg-blue-500 text-white'
                  : darkMode 
                    ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {view.label}
            </button>
          ))}
        </div>
      </div>
      
      {/* Conditional Rendering */}
      {selectedView === 'validator' && <WorkflowValidator />}
      {selectedView === 'credentials' && <CredentialsManager />}
      {selectedView === 'expressions' && <ExpressionBuilder />}
      {selectedView === 'webhooks' && <WebhookManager />}
      {selectedView === 'schedules' && <ScheduleManager />}
      {selectedView === 'monitoring' && <MonitoringDashboard />}
      {selectedView === 'dashboard' && <Dashboard />}
      {selectedView === 'templates' && <WorkflowTemplates />}
      
      {selectedView === 'editor' && (
        <>
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; transform: scale(0.8); }
            to { opacity: 1; transform: scale(1); }
          }
          .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
          
          ::-webkit-scrollbar {
            width: 8px;
            height: 8px;
          }
          ::-webkit-scrollbar-track {
            background: ${darkMode ? '#1f2937' : '#f3f4f6'};
          }
          ::-webkit-scrollbar-thumb {
            background: ${darkMode ? '#4b5563' : '#d1d5db'};
            border-radius: 4px;
          }
          .react-flow__handle {
            width: 12px;
            height: 12px;
          }
          .react-flow__edge.animated path {
            stroke-dasharray: 5;
            animation: dashdraw 0.5s linear infinite;
          }
          @keyframes dashdraw {
            to {
              stroke-dashoffset: -10;
            }
          }
        `}
      </style>
      
      <ReactFlow
        nodes={nodes}
        edges={displayEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onEdgeClick={(_, edge) => {
          setSelectedEdge(edge);
          setSelectedNode(null);
        }}
        onConnect={onConnect}
        onDrop={onDrop}
        onDragOver={onDragOver}
        nodeTypes={nodeTypesMap}
        connectionLineStyle={connectionLineStyle}
        connectionMode={ConnectionMode.Loose}
        fitView
        className={darkMode ? 'bg-gray-900' : 'bg-gray-100'}
        deleteKeyCode="Delete"
        multiSelectionKeyCode="Shift"
        zoomOnScroll={true}
        zoomOnPinch={true}
        panOnScroll={false}
        panOnDrag={true}
        preventScrolling={true}
        onPaneClick={() => {
          setSelectedEdge(null);
          setSelectedNode(null);
        }}
        defaultEdgeOptions={{
          style: { strokeWidth: 1.5, stroke: '#9CA3AF' },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#9CA3AF', width: 12, height: 12 },
          animated: true,
          type: 'default'
        }}
      >
        <Controls 
          className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-lg`}
          showZoom={true}
          showFitView={true}
          showInteractive={true}
        />
        <MiniMap 
          className={`${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg rounded-lg`}
          maskColor={darkMode ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.8)'}
          nodeColor={(node) => {
            const nodeType = nodeTypes[node.data.type];
            switch (nodeType?.category) {
              case 'trigger': return '#f97316';
              case 'communication': return '#3b82f6';
              case 'database': return '#8b5cf6';
              case 'ai': return '#10b981';
              case 'cloud': return '#06b6d4';
              case 'core': return '#6b7280';
              case 'flow': return '#6366f1';
              default: return '#6b7280';
            }
          }}
        />
        <Background 
          variant="dots"
          gap={15}
          size={1}
          color={darkMode ? '#374151' : '#d1d5db'}
        />
        
        {/* Barre d'exécution */}
        <Panel position="top-center" className={`${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg rounded-xl border ${darkMode ? 'border-gray-700' : 'border-gray-200'} backdrop-blur-sm`}>
          <div className="p-3 flex items-center justify-center space-x-3">
            {/* Undo/Redo */}
            <UndoRedoManager />
            
            <div className="h-6 w-px bg-gray-300"></div>
            
            <button
              onClick={executeWorkflow}
              disabled={isExecuting || nodes.length === 0}
              className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 font-medium transition-all duration-200 hover:scale-105"
            >
              {isExecuting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  <span>Executing...</span>
                </>
              ) : (
                <>
                  <Icons.Play size={16} />
                  <span>Execute</span>
                </>
              )}
            </button>
            
            <button
              onClick={() => saveWorkflow()}
              disabled={isExecuting}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 flex items-center space-x-2 transition-all duration-200 hover:scale-105"
            >
              <Icons.Save size={16} />
              <span>Save</span>
            </button>
            
            <button
              onClick={exportWorkflow}
              disabled={isExecuting}
              className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 disabled:opacity-50 flex items-center space-x-2 transition-all duration-200 hover:scale-105"
            >
              <Icons.Download size={16} />
              <span>Export</span>
            </button>
            
            <label className="bg-indigo-500 text-white px-4 py-2 rounded-lg hover:bg-indigo-600 cursor-pointer">
              <div className="flex items-center space-x-2">
                <Icons.Upload size={16} />
                <span>Import</span>
              </div>
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                disabled={isExecuting}
                className="hidden"
              />
            </label>
            
            <button
              onClick={clearExecution}
              disabled={isExecuting}
              className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 disabled:opacity-50 flex items-center space-x-2 transition-all duration-200 hover:scale-105"
            >
              <Icons.RotateCcw size={16} />
              <span>Reset</span>
            </button>
            
            <div className="h-6 w-px bg-gray-300 mx-2"></div>
            
            <select
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                currentEnvironment === 'prod' 
                  ? 'bg-red-500 text-white' 
                  : currentEnvironment === 'staging'
                  ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                  : 'bg-green-500 text-white hover:bg-green-600'
              }`}
              value={currentEnvironment}
              onChange={(e) => useWorkflowStore.getState().setCurrentEnvironment(e.target.value)}
            >
              <option value="dev">Development</option>
              <option value="staging">Staging</option>
              <option value="prod">Production</option>
            </select>
          </div>
        </Panel>
      </ReactFlow>
      
      {/* Advanced Components */}
      <MultiSelectManager />
      <NodeGroupManager />
      <StickyNotes
        notes={stickyNotes || []}
        onAddNote={(note) =>
          addStickyNote({ id: `note_${Date.now()}`, ...note })
        }
        onDeleteNote={deleteStickyNote}
        onUpdateNote={updateStickyNote}
      />
      <AutoSaveManager />
      <DebugPanel isOpen={false} onClose={() => {}} />
      <CollaborationPanel isOpen={false} onClose={() => {}} />
      <PerformanceMonitor isOpen={false} onClose={() => {}} />
      <AIWorkflowGenerator />
      <AFLOWOptimizer />
      <PluginHotReload />
      <VoiceAssistant />
      <AdvancedOnboarding />
      <AICodeGenerator />
      <UniversalAPIConnector />
      <GraphQLQueryBuilder />
      
      <Sidebar />
      <NodeConfigPanel />
      <EdgeConfigPanel />

      <KeyboardShortcuts />
      <ExecutionViewer />
      
      {/* État vide */}
      {nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <Icons.Workflow size={32} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Create your first workflow
            </h3>
            <p className="text-gray-500 mb-4 max-w-sm">
              Drag nodes from the sidebar to start building your automation workflow.
            </p>
          </div>
        </div>
      )}
      
      {/* Minimap personnalisée */}
      <div className="absolute bottom-4 right-4 w-48 h-32 bg-white rounded-lg shadow-lg border overflow-hidden">
        <div className="p-2 bg-gray-50 border-b">
          <h3 className="text-xs font-semibold text-gray-700">Workflow Overview</h3>
        </div>
        <div className="p-2 space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span>Nodes:</span>
            <span className="font-medium">{nodes.length}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span>Connections:</span>
            <span className="font-medium">{edges.length}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span>Triggers:</span>
            <span className="font-medium text-orange-600">
              {nodes.filter(n => ['trigger', 'webhook', 'schedule', 'rssFeed'].includes(n.data.type)).length}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span>Status:</span>
            <span className={`font-medium ${
              isExecuting ? 'text-blue-600' : 'text-green-600'
            }`}>
              {isExecuting ? 'Running' : 'Ready'}
            </span>
          </div>
        </div>
      </div>
      
      {/* Barre de statut */}
      <div className={`absolute bottom-0 left-80 right-0 h-8 ${darkMode ? 'bg-gray-800 text-gray-300 border-gray-700' : 'bg-white text-gray-700 border-gray-200'} border-t flex items-center px-4 text-xs`}>
        <div className="flex items-center space-x-4">
          <span>Nodes: {nodes.length}</span>
          <span>Connections: {edges.length}</span>
          <span>Environment: {currentEnvironment}</span>
          <span className="flex items-center">
            <span className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></span>
            Connected
          </span>
          <span className="text-gray-400">|</span>
          <span>Press <kbd className="px-1 bg-gray-100 rounded">?</kbd> for shortcuts</span>
        </div>
        <div className="ml-auto text-gray-500">
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </div>
        </>
      )}
    </div>
  );
}

// App principale avec provider
export default function App() {
  const { darkMode } = useWorkflowStore();
  
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark');
      document.body.style.backgroundColor = '#111827';
    } else {
      document.body.classList.remove('dark');
      document.body.style.backgroundColor = '#ffffff';
    }
  }, [darkMode]);
  
  return (
    <div className={darkMode ? 'dark' : ''}>
      <ReactFlowProvider>
        <Header />
        <WorkflowEditor />
      </ReactFlowProvider>
    </div>
  );
}