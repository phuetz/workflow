/**
 * Preload Script - Secure Bridge between Main and Renderer
 * Exposes limited APIs to the renderer process
 */

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected APIs to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Application info
  getVersion: () => ipcRenderer.invoke('get-app-version'),
  getPlatform: () => process.platform,
  getMachineId: () => ipcRenderer.invoke('get-machine-id'),
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),

  // File operations
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
  
  // Window management
  openWorkflowWindow: (workflowId) => ipcRenderer.send('open-workflow-window', workflowId),
  minimizeWindow: () => ipcRenderer.send('minimize-window'),
  maximizeWindow: () => ipcRenderer.send('maximize-window'),
  closeWindow: () => ipcRenderer.send('close-window'),
  
  // Workflow operations
  onCreateWorkflow: (callback) => ipcRenderer.on('create-workflow', callback),
  onOpenWorkflow: (callback) => ipcRenderer.on('open-workflow', callback),
  onSaveWorkflow: (callback) => ipcRenderer.on('save-workflow', callback),
  onRunWorkflow: (callback) => ipcRenderer.on('run-workflow', callback),
  onStopWorkflow: (callback) => ipcRenderer.on('stop-workflow', callback),
  onDebugWorkflow: (callback) => ipcRenderer.on('debug-workflow', callback),
  onScheduleWorkflow: (callback) => ipcRenderer.on('schedule-workflow', callback),
  
  // Import/Export
  onImportWorkflow: (callback) => ipcRenderer.on('import-workflow', callback),
  onExportWorkflow: (callback) => ipcRenderer.on('export-workflow', callback),
  
  // View management
  onShowEditor: (callback) => ipcRenderer.on('show-editor', callback),
  onShowHistory: (callback) => ipcRenderer.on('show-history', callback),
  onShowPalette: (callback) => ipcRenderer.on('show-palette', callback),
  onOpenPreferences: (callback) => ipcRenderer.on('open-preferences', callback),
  
  // System events
  onSystemSuspend: (callback) => ipcRenderer.on('system-suspend', callback),
  onSystemResume: (callback) => ipcRenderer.on('system-resume', callback),
  onThemeChanged: (callback) => ipcRenderer.on('theme-changed', callback),
  
  // Deep linking
  onDeepLink: (callback) => ipcRenderer.on('deep-link', callback),
  
  // Quick actions
  onQuickCreateWorkflow: (callback) => ipcRenderer.on('quick-create-workflow', callback),
  
  // Tray updates
  updateTrayWorkflows: (workflows) => ipcRenderer.send('update-tray-workflows', workflows),
  
  // Store operations (secure key-value storage)
  store: {
    get: (key) => ipcRenderer.invoke('store-get', key),
    set: (key, value) => ipcRenderer.invoke('store-set', key, value),
    delete: (key) => ipcRenderer.invoke('store-delete', key),
    clear: () => ipcRenderer.invoke('store-clear')
  },
  
  // Clipboard operations
  clipboard: {
    writeText: (text) => ipcRenderer.invoke('clipboard-write-text', text),
    readText: () => ipcRenderer.invoke('clipboard-read-text'),
    writeWorkflow: (workflow) => ipcRenderer.invoke('clipboard-write-workflow', workflow),
    readWorkflow: () => ipcRenderer.invoke('clipboard-read-workflow')
  },
  
  // Notifications
  showNotification: (options) => ipcRenderer.invoke('show-notification', options),
  
  // Shell operations
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  showItemInFolder: (path) => ipcRenderer.invoke('show-item-in-folder', path),
  
  // Auto-updater
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  onUpdateAvailable: (callback) => ipcRenderer.on('update-available', callback),
  onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', callback),
  
  // Performance monitoring
  getProcessMemoryInfo: () => ipcRenderer.invoke('get-process-memory-info'),
  getCPUUsage: () => ipcRenderer.invoke('get-cpu-usage'),
  
  // Logging
  log: {
    info: (message) => ipcRenderer.send('log-info', message),
    warn: (message) => ipcRenderer.send('log-warn', message),
    error: (message) => ipcRenderer.send('log-error', message)
  }
});

// Expose secure WebSocket for real-time features
contextBridge.exposeInMainWorld('secureWebSocket', {
  connect: (url, protocols) => {
    // Validate URL is allowed
    const allowedHosts = ['localhost', 'api.workflow.com'];
    const urlObj = new URL(url);
    if (!allowedHosts.includes(urlObj.hostname)) {
      throw new Error('WebSocket connection to this host is not allowed');
    }
    return new WebSocket(url, protocols);
  }
});

// Expose crypto utilities
contextBridge.exposeInMainWorld('cryptoAPI', {
  generateId: () => crypto.randomUUID(),
  hash: async (data) => {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
});

// Performance observer for monitoring
if (typeof window !== 'undefined') {
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.entryType === 'measure' || entry.entryType === 'navigation') {
        ipcRenderer.send('performance-metric', {
          name: entry.name,
          duration: entry.duration,
          startTime: entry.startTime
        });
      }
    }
  });
  
  observer.observe({ entryTypes: ['measure', 'navigation'] });
}

// Security: Prevent new window creation
window.addEventListener('DOMContentLoaded', () => {
  // Override window.open to prevent popup windows
  window.open = () => {
    console.warn('window.open is disabled for security reasons');
    return null;
  };
});