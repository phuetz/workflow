/**
 * Workflow Desktop Application - Main Process
 * Electron main process handling window management and system integration
 */

const {
  app,
  BrowserWindow,
  Menu,
  Tray,
  dialog,
  shell,
  protocol,
  globalShortcut,
  powerMonitor,
  nativeTheme,
  ipcMain,
  session
} = require('electron');
const path = require('path');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');
const Store = require('electron-store');
const log = require('electron-log');
const { machineId } = require('node-machine-id');
const contextMenu = require('electron-context-menu');

// Initialize store for persistent data
const store = new Store({
  encryptionKey: 'workflow-desktop-encryption-key'
});

// Global references
let mainWindow = null;
let tray = null;
let workflowWindows = new Map();
let isQuitting = false;

// Enable context menu
contextMenu({
  showSaveImageAs: true,
  showCopyImageAddress: true,
  showSearchWithGoogle: true
});

// Security: Enable sandboxing
app.enableSandbox();

// Configure auto-updater
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';
autoUpdater.checkForUpdatesAndNotify();

// Create main application window
function createMainWindow() {
  const windowState = store.get('windowState', {
    width: 1400,
    height: 900,
    x: undefined,
    y: undefined
  });

  mainWindow = new BrowserWindow({
    width: windowState.width,
    height: windowState.height,
    x: windowState.x,
    y: windowState.y,
    minWidth: 1200,
    minHeight: 700,
    title: 'Workflow Platform',
    icon: path.join(__dirname, 'assets/icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true,
      allowRunningInsecureContent: false
    },
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    frame: process.platform !== 'darwin',
    backgroundColor: '#1a1a1a',
    show: false
  });

  // Load the app
  if (process.argv.includes('--dev')) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'));
  }

  // Window event handlers
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Check for updates
    autoUpdater.checkForUpdates();
  });

  mainWindow.on('close', (event) => {
    if (!isQuitting && process.platform === 'darwin') {
      event.preventDefault();
      mainWindow.hide();
    } else {
      // Save window state
      const bounds = mainWindow.getBounds();
      store.set('windowState', bounds);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

// Create workflow editor window
function createWorkflowWindow(workflowId) {
  if (workflowWindows.has(workflowId)) {
    workflowWindows.get(workflowId).focus();
    return;
  }

  const workflowWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1000,
    minHeight: 600,
    parent: mainWindow,
    modal: false,
    show: false,
    title: `Workflow Editor - ${workflowId}`,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  workflowWindow.loadFile(path.join(__dirname, 'renderer/workflow-editor.html'), {
    query: { workflowId }
  });

  workflowWindow.once('ready-to-show', () => {
    workflowWindow.show();
  });

  workflowWindow.on('closed', () => {
    workflowWindows.delete(workflowId);
  });

  workflowWindows.set(workflowId, workflowWindow);
}

// Create system tray
function createTray() {
  tray = new Tray(path.join(__dirname, 'assets/tray-icon.png'));
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show App',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        } else {
          createMainWindow();
        }
      }
    },
    {
      label: 'Create Workflow',
      click: () => {
        mainWindow?.webContents.send('create-workflow');
      }
    },
    { type: 'separator' },
    {
      label: 'Running Workflows',
      submenu: [] // Dynamically populated
    },
    { type: 'separator' },
    {
      label: 'Preferences',
      click: () => {
        mainWindow?.webContents.send('open-preferences');
      }
    },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setToolTip('Workflow Platform');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (mainWindow) {
      mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
    }
  });
}

// Setup application menu
function setupMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Workflow',
          accelerator: 'CmdOrCtrl+N',
          click: () => mainWindow?.webContents.send('create-workflow')
        },
        {
          label: 'Open Workflow',
          accelerator: 'CmdOrCtrl+O',
          click: () => mainWindow?.webContents.send('open-workflow')
        },
        {
          label: 'Save Workflow',
          accelerator: 'CmdOrCtrl+S',
          click: () => mainWindow?.webContents.send('save-workflow')
        },
        { type: 'separator' },
        {
          label: 'Import',
          click: () => mainWindow?.webContents.send('import-workflow')
        },
        {
          label: 'Export',
          click: () => mainWindow?.webContents.send('export-workflow')
        },
        { type: 'separator' },
        {
          label: 'Quit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            isQuitting = true;
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Workflow',
      submenu: [
        {
          label: 'Run',
          accelerator: 'F5',
          click: () => mainWindow?.webContents.send('run-workflow')
        },
        {
          label: 'Stop',
          accelerator: 'Shift+F5',
          click: () => mainWindow?.webContents.send('stop-workflow')
        },
        {
          label: 'Debug',
          accelerator: 'F9',
          click: () => mainWindow?.webContents.send('debug-workflow')
        },
        { type: 'separator' },
        {
          label: 'Schedule',
          click: () => mainWindow?.webContents.send('schedule-workflow')
        }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'close' },
        { type: 'separator' },
        {
          label: 'Workflow Editor',
          click: () => mainWindow?.webContents.send('show-editor')
        },
        {
          label: 'Execution History',
          click: () => mainWindow?.webContents.send('show-history')
        },
        {
          label: 'Node Palette',
          click: () => mainWindow?.webContents.send('show-palette')
        }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Documentation',
          click: () => shell.openExternal('https://docs.workflow.com')
        },
        {
          label: 'Community',
          click: () => shell.openExternal('https://community.workflow.com')
        },
        { type: 'separator' },
        {
          label: 'Report Issue',
          click: () => shell.openExternal('https://github.com/workflow/issues')
        },
        {
          label: 'About',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About Workflow Platform',
              message: 'Workflow Platform Desktop',
              detail: `Version: ${app.getVersion()}\nElectron: ${process.versions.electron}\nNode: ${process.versions.node}`,
              buttons: ['OK']
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Register global shortcuts
function registerShortcuts() {
  globalShortcut.register('CmdOrCtrl+Shift+W', () => {
    if (mainWindow) {
      mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
    }
  });

  globalShortcut.register('CmdOrCtrl+Shift+N', () => {
    mainWindow?.webContents.send('quick-create-workflow');
  });
}

// IPC Handlers
ipcMain.handle('get-machine-id', async () => {
  return await machineId();
});

ipcMain.handle('show-save-dialog', async (event, options) => {
  const result = await dialog.showSaveDialog(mainWindow, options);
  return result;
});

ipcMain.handle('show-open-dialog', async (event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, options);
  return result;
});

ipcMain.handle('get-system-info', async () => {
  const si = require('systeminformation');
  const [cpu, mem, os] = await Promise.all([
    si.cpu(),
    si.mem(),
    si.osInfo()
  ]);
  
  return {
    cpu: cpu.brand,
    cores: cpu.cores,
    memory: Math.round(mem.total / 1024 / 1024 / 1024) + ' GB',
    os: `${os.distro} ${os.release}`,
    arch: os.arch
  };
});

ipcMain.on('open-workflow-window', (event, workflowId) => {
  createWorkflowWindow(workflowId);
});

ipcMain.on('update-tray-workflows', (event, workflows) => {
  // Update tray menu with running workflows
  if (tray) {
    const menu = tray.getContextMenu();
    const runningItem = menu.items.find(item => item.label === 'Running Workflows');
    if (runningItem) {
      runningItem.submenu = Menu.buildFromTemplate(
        workflows.map(w => ({
          label: w.name,
          click: () => createWorkflowWindow(w.id)
        }))
      );
    }
  }
});

// App event handlers
app.whenReady().then(() => {
  // Set up security headers
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': ["default-src 'self'"]
      }
    });
  });

  createMainWindow();
  createTray();
  setupMenu();
  registerShortcuts();

  // Handle protocol for deep linking
  protocol.registerHttpProtocol('workflow', (request, callback) => {
    const url = request.url.substr(11); // Remove 'workflow://'
    mainWindow?.webContents.send('deep-link', url);
  });

  // Power monitor events
  powerMonitor.on('suspend', () => {
    mainWindow?.webContents.send('system-suspend');
  });

  powerMonitor.on('resume', () => {
    mainWindow?.webContents.send('system-resume');
  });

  // Theme changes
  nativeTheme.on('updated', () => {
    mainWindow?.webContents.send('theme-changed', nativeTheme.shouldUseDarkColors);
  });
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  } else if (mainWindow) {
    mainWindow.show();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

// Auto-updater events
autoUpdater.on('update-available', () => {
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'Update Available',
    message: 'A new version is available. It will be downloaded in the background.',
    buttons: ['OK']
  });
});

autoUpdater.on('update-downloaded', () => {
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'Update Ready',
    message: 'Update downloaded. The application will restart to apply the update.',
    buttons: ['Restart Now', 'Later']
  }).then((result) => {
    if (result.response === 0) {
      autoUpdater.quitAndInstall();
    }
  });
});