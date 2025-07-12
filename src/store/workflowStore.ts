import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Store Zustand complet avec toutes les fonctionnalités
export const useWorkflowStore = create(
  persist(
    (set, get) => ({
      // État de base
      nodes: [],
      edges: [],
      selectedNode: null,
      isExecuting: false,
      executionResults: {},
      executionErrors: {},
      currentExecutingNode: null,
      
      // Workflows et templates
      workflows: {},
      currentWorkflowId: null,
      
      // Nouvelles propriétés manquantes
      nodeStats: {},
      systemMetrics: {
        cpu: 0,
        memory: 0,
        uptime: 0,
        requestCount: 0,
        errorCount: 0,
        lastBackup: null,
      },
      alerts: [],
      expressions: {},
      customFunctions: {},
      testSessions: {},
      workflowTemplates: {
        'welcome-email': {
          name: 'Email de bienvenue',
          description: 'Envoie un email de bienvenue aux nouveaux utilisateurs',
          category: 'Marketing',
          nodes: [],
          edges: [],
        },
        'data-sync': {
          name: 'Synchronisation de données',
          description: 'Synchronise les données entre deux systèmes',
          category: 'Data',
          nodes: [],
          edges: [],
        },
        'social-media': {
          name: 'Publication réseaux sociaux',
          description: 'Publie automatiquement sur plusieurs réseaux',
          category: 'Social',
          nodes: [],
          edges: [],
        }
      },
      
      // Credentials management
      credentials: {
        google: { clientId: '', clientSecret: '', refreshToken: '' },
        aws: { accessKeyId: '', secretAccessKey: '', region: 'us-east-1' },
        openai: { apiKey: '' },
        stripe: { apiKey: '' },
        slack: { webhookUrl: '' },
        github: { token: '' },
      },
      
      // Exécution et historique
      executionHistory: [],
      executionLogs: [],
      globalVariables: {},
      environments: {
        dev: { name: 'Development', apiUrl: 'http://localhost:3000', apiKey: 'dev-key' },
        staging: { name: 'Staging', apiUrl: 'https://staging.api.com', apiKey: 'staging-key' },
        prod: { name: 'Production', apiUrl: 'https://api.com', apiKey: 'prod-key' }
      },
      currentEnvironment: 'dev',
      
      // Configuration avancée
      debugMode: false,
      stepByStep: false,
      darkMode: false,
      collaborators: [],
      workflowVersions: {},
      webhookEndpoints: {},
      scheduledJobs: {},
      nodeGroups: [],
      stickyNotes: [],
      
      // Statistiques détaillées
      executionStats: {
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        averageExecutionTime: 0,
        nodeStats: {},
        errorStats: {},
      },
      
      // Actions de base
      setNodes: (nodes) => set({ nodes }),
      setEdges: (edges) => set({ edges }),
      setSelectedNode: (node) => set({ selectedNode: node }),
      
      addNode: (node) => set((state) => ({ 
        nodes: [...state.nodes, node],
        nodeStats: {
          ...state.nodeStats,
          [node.data.type]: (state.nodeStats[node.data.type] || 0) + 1
        }
      })),
      
      updateNode: (id, data) => set((state) => ({
        nodes: state.nodes.map(node => 
          node.id === id ? { ...node, data: { ...node.data, ...data } } : node
        )
      })),
      
      deleteNode: (id) => set((state) => ({
        nodes: state.nodes.filter(node => node.id !== id),
        edges: state.edges.filter(edge => edge.source !== id && edge.target !== id)
      })),
      
      duplicateNode: (id) => {
        const node = get().nodes.find(n => n.id === id);
        if (node) {
          const newNode = {
            ...node,
            id: `${node.id}_copy_${Date.now()}`,
            position: {
              x: node.position.x + 50,
              y: node.position.y + 50,
            },
          };
          set((state) => ({ nodes: [...state.nodes, newNode] }));
        }
      },
      
      // Gestion des credentials
      updateCredentials: (service, credentials) => set((state) => ({
        credentials: {
          ...state.credentials,
          [service]: { ...state.credentials[service], ...credentials }
        }
      })),
      
      // Variables globales
      setGlobalVariable: (key, value) => set((state) => ({
        globalVariables: { ...state.globalVariables, [key]: value }
      })),
      
      deleteGlobalVariable: (key) => set((state) => {
        const { [key]: _, ...rest } = state.globalVariables;
        return { globalVariables: rest };
      }),
      
      // Webhooks
      generateWebhookUrl: (workflowId) => {
        const webhookId = `wh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const url = `https://app.workflow-editor.com/webhook/${webhookId}`;
        set((state) => ({
          webhookEndpoints: {
            ...state.webhookEndpoints,
            [webhookId]: { workflowId, url, created: new Date().toISOString() }
          }
        }));
        return url;
      },
      
      // Scheduling
      scheduleWorkflow: (workflowId, cronExpression) => {
        const jobId = `job_${Date.now()}`;
        set((state) => ({
          scheduledJobs: {
            ...state.scheduledJobs,
            [jobId]: {
              workflowId,
              cronExpression,
              enabled: true,
              lastRun: null,
              nextRun: null,
            }
          }
        }));
        return jobId;
      },
      
      // Logs et monitoring
      addLog: (log) => set((state) => ({
        executionLogs: [...state.executionLogs, {
          ...log,
          timestamp: new Date().toISOString(),
          id: `log_${Date.now()}`
        }].slice(-1000)
      })),
      
      searchLogs: (query) => {
        const logs = get().executionLogs;
        return logs.filter(log => 
          JSON.stringify(log).toLowerCase().includes(query.toLowerCase())
        );
      },
      
      // Collaboration
      addCollaborator: (email, permissions) => set((state) => ({
        collaborators: [...state.collaborators, {
          email,
          permissions,
          addedAt: new Date().toISOString()
        }]
      })),
      
      // Workflow management
      saveWorkflow: (name = null) => {
        const { nodes, edges, currentWorkflowId } = get();
        const workflowId = currentWorkflowId || `workflow_${Date.now()}`;
        const workflow = {
          id: workflowId,
          name: name || `Workflow ${new Date().toLocaleDateString()}`,
          nodes,
          edges,
          version: '3.0',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          tags: [],
          description: '',
        };
        
        set((state) => ({
          workflows: { ...state.workflows, [workflowId]: workflow },
          currentWorkflowId: workflowId
        }));
        
        return workflowId;
      },
      
      loadWorkflow: (workflowId) => {
        const workflow = get().workflows[workflowId];
        if (workflow) {
          set({
            nodes: workflow.nodes,
            edges: workflow.edges,
            currentWorkflowId: workflowId
          });
        }
      },
      
      exportWorkflow: () => {
        const { nodes, edges, currentWorkflowId } = get();
        const workflow = {
          nodes,
          edges,
          exportDate: new Date().toISOString(),
          version: '3.0'
        };
        
        const blob = new Blob([JSON.stringify(workflow, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `workflow_${currentWorkflowId || 'export'}.json`;
        a.click();
        URL.revokeObjectURL(url);
      },
      
      importWorkflow: (file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const workflow = JSON.parse(e.target.result);
            set({
              nodes: workflow.nodes || [],
              edges: workflow.edges || []
            });
          } catch (error) {
            console.error('Error importing workflow:', error);
          }
        };
        reader.readAsText(file);
      },
      
      // Exécution
      setExecutionResult: (nodeId, result) => set((state) => ({
        executionResults: { ...state.executionResults, [nodeId]: result }
      })),
      
      setExecutionError: (nodeId, error) => set((state) => ({
        executionErrors: { ...state.executionErrors, [nodeId]: error }
      })),
      
      clearExecution: () => set({
        executionResults: {},
        executionErrors: {},
        currentExecutingNode: null,
      }),
      
      addExecutionToHistory: (execution) => set((state) => ({
        executionHistory: [execution, ...state.executionHistory].slice(0, 100)
      })),
      
      // Validation
      validateWorkflow: () => {
        const { nodes, edges } = get();
        const errors = [];
        
        if (nodes.length === 0) {
          errors.push('Le workflow doit contenir au moins un nœud');
        }
        
        // Vérifier les nœuds orphelins
        const connectedNodes = new Set([...edges.map(e => e.source), ...edges.map(e => e.target)]);
        const orphanNodes = nodes.filter(node => !connectedNodes.has(node.id) && nodes.length > 1);
        if (orphanNodes.length > 0) {
          errors.push(`${orphanNodes.length} nœud(s) non connecté(s)`);
        }
        
        return errors;
      },
      
      testWorkflow: async (testData) => {
        const { nodes, edges } = get();
        console.log('Testing workflow with data:', testData);
        return { success: true, results: [] };
      },
      
      setIsExecuting: (isExecuting) => set({ isExecuting }),
      setCurrentExecutingNode: (nodeId) => set({ currentExecutingNode: nodeId }),
      setCurrentEnvironment: (env) => set({ currentEnvironment: env }),
      toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
      toggleDebugMode: () => set((state) => ({ debugMode: !state.debugMode })),
      toggleStepByStep: () => set((state) => ({ stepByStep: !state.stepByStep })),

  // Undo/Redo functionality
  undoHistory: [],
  redoHistory: [],

  undo: () => {
    const state = get();
    if (state.undoHistory.length === 0) return;
    
    const lastState = state.undoHistory[state.undoHistory.length - 1];
    const currentState = { nodes: state.nodes, edges: state.edges };
    
    set({
      nodes: lastState.nodes,
      edges: lastState.edges,
      undoHistory: state.undoHistory.slice(0, -1),
      redoHistory: [...state.redoHistory, currentState]
    });
  },

  redo: () => {
    const state = get();
    if (state.redoHistory.length === 0) return;
    
    const nextState = state.redoHistory[state.redoHistory.length - 1];
    const currentState = { nodes: state.nodes, edges: state.edges };
    
    set({
      nodes: nextState.nodes,
      edges: nextState.edges,
      undoHistory: [...state.undoHistory, currentState],
      redoHistory: state.redoHistory.slice(0, -1)
    });
  },

  clearHistory: () => set({ undoHistory: [], redoHistory: [] }),

  addToHistory: (nodes, edges) => {
    const state = get();
    set({
      undoHistory: [...state.undoHistory.slice(-19), { nodes: state.nodes, edges: state.edges }],
      redoHistory: [] // Clear redo history when new action is performed
    });
  },

  // Multi-selection functionality
  selectedNodes: [],
  
  setSelectedNodes: (nodes) => set({ selectedNodes: nodes }),
  
  deleteSelectedNodes: () => {
    const state = get();
    const nodeIdsToDelete = state.selectedNodes.map(n => n.id);
    set({
      nodes: state.nodes.filter(n => !nodeIdsToDelete.includes(n.id)),
      edges: state.edges.filter(e => !nodeIdsToDelete.includes(e.source) && !nodeIdsToDelete.includes(e.target)),
      selectedNodes: []
    });
  },
  
  copySelectedNodes: () => {
    const state = get();
    localStorage.setItem('copiedNodes', JSON.stringify(state.selectedNodes));
  },
  
  groupSelectedNodes: () => {
    const state = get();
    if (state.selectedNodes.length < 2) return;
    
    const groupId = `group_${Date.now()}`;
    const positions = state.selectedNodes.map(n => n.position);
    const minX = Math.min(...positions.map(p => p.x));
    const minY = Math.min(...positions.map(p => p.y));
    const maxX = Math.max(...positions.map(p => p.x));
    const maxY = Math.max(...positions.map(p => p.y));
    
    const group = {
      id: groupId,
      name: `Group ${Object.keys(state.nodeGroups || {}).length + 1}`,
      color: '#3b82f6',
      nodes: state.selectedNodes.map(n => n.id),
      position: { x: minX - 20, y: minY - 20 },
      size: { width: maxX - minX + 240, height: maxY - minY + 140 }
    };
    
    set({
      nodeGroups: [...(state.nodeGroups || []), group],
      selectedNodes: []
    });
  },
  
  ungroupSelectedNodes: () => {
    const state = get();
    const nodeIds = state.selectedNodes.map(n => n.id);
    set({
      nodeGroups: (state.nodeGroups || []).filter(group => 
        !group.nodes.some(nodeId => nodeIds.includes(nodeId))
      ),
      selectedNodes: []
    });
  },

  // Debug functionality
  debugSession: null,
  currentDebugNode: null,
  
  addBreakpoint: (nodeId) => set((state) => ({
    breakpoints: { ...state.breakpoints, [nodeId]: true }
  })),
  
  removeBreakpoint: (nodeId) => set((state) => {
    const { [nodeId]: _, ...rest } = state.breakpoints;
    return { breakpoints: rest };
  }),
  
  debugStep: () => {
    // Implementation for step debugging
    console.log('Debug step');
  },
  
  debugContinue: () => {
    // Implementation for continue debugging
    console.log('Debug continue');
  },
  
  debugStop: () => set({
    debugSession: null,
    currentDebugNode: null
  }),

  // Node groups
  addNodeGroup: (group) => set((state) => ({
    nodeGroups: [...(state.nodeGroups || []), group]
  })),
  
  updateNodeGroup: (groupId, updates) => set((state) => ({
    nodeGroups: (state.nodeGroups || []).map(group =>
      group.id === groupId ? { ...group, ...updates } : group
    )
  })),

  // Sticky notes
  addStickyNote: (note) => set((state) => ({
    stickyNotes: [...(state.stickyNotes || []), note]
  })),
  
  updateStickyNote: (noteId, updates) =>
    set((state) => {
      const noteWidth = 192;
      const noteHeight = 128;
      const delta = 10;

      const isOverlapping = (x: number, y: number) => {
        return (state.stickyNotes || []).some((n) => {
          if (n.id === noteId) return false;
          return (
            x < n.position.x + noteWidth &&
            x + noteWidth > n.position.x &&
            y < n.position.y + noteHeight &&
            y + noteHeight > n.position.y
          );
        });
      };

      const stickyNotes = (state.stickyNotes || []).map((note) => {
        if (note.id !== noteId) return note;
        let updated = { ...note, ...updates };
        if (updates.position) {
          let { x, y } = updates.position;
          let attempts = 0;
          while (isOverlapping(x, y) && attempts < 20) {
            x += delta;
            y += delta;
            attempts++;
          }
          updated.position = { x, y };
        }
        return updated;
      });

      return { stickyNotes };
    }),
  
  deleteStickyNote: (noteId) => set((state) => ({
    stickyNotes: (state.stickyNotes || []).filter(note => note.id !== noteId)
  })),

  // Current user (for collaboration)
  currentUser: {
    id: 'user_1',
    name: 'John Doe',
    email: 'john@example.com',
    color: '#3b82f6'
  },
    }),
    {
      name: 'workflow-storage-v3',
      partialize: (state) => ({
        workflows: state.workflows,
        globalVariables: state.globalVariables,
        environments: state.environments,
        credentials: state.credentials,
        darkMode: state.darkMode,
        executionHistory: state.executionHistory.slice(0, 50),
        executionStats: state.executionStats,
        webhookEndpoints: state.webhookEndpoints,
        scheduledJobs: state.scheduledJobs,
        workflowVersions: state.workflowVersions,
        nodeGroups: state.nodeGroups,
        stickyNotes: state.stickyNotes,
        systemMetrics: state.systemMetrics,
        alerts: state.alerts,
        expressions: state.expressions,
        customFunctions: state.customFunctions,
        testSessions: state.testSessions,
        breakpoints: state.breakpoints,
      })
    }
  )
);