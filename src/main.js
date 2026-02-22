const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let logsWindow;
let autoClickerWindow;
let serverProcess;

// Create the browser window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    title: 'Runtime Hub - Node Editor',
    backgroundColor: '#0f172a',
    icon: path.join(__dirname, '..', 'assets', 'icon.png')
  });

  // Start the server first
  startServer();

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Load the node editor directly
  mainWindow.loadFile(path.join(__dirname, '../public/node-editor.html'));

  // Dev tools in development
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (logsWindow) {
      logsWindow.close();
    }
    if (autoClickerWindow) {
      autoClickerWindow.close();
    }
    if (serverProcess) {
      serverProcess.kill();
    }
  });
}

function createAutoClickerWindow() {
  if (autoClickerWindow) {
    autoClickerWindow.focus();
    return;
  }

  autoClickerWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    title: 'Runtime Hub - Auto-Clicker',
    backgroundColor: '#111827',
    parent: mainWindow
  });

  autoClickerWindow.loadFile(path.join(__dirname, '../public/auto-clicker-test.html'));

  autoClickerWindow.on('closed', () => {
    autoClickerWindow = null;
  });
}

function createLogsWindow() {
  if (logsWindow) {
    logsWindow.focus();
    return;
  }

  logsWindow = new BrowserWindow({
    width: 1200,
    height: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    title: 'Runtime Hub - System Logs',
    backgroundColor: '#111827',
    parent: mainWindow
  });

  logsWindow.loadFile(path.join(__dirname, '../public/logs.html'));

  logsWindow.on('closed', () => {
    logsWindow = null;
  });
}

function startServer() {
  console.log('Starting Runtime Hub server...');
  serverProcess = spawn('node', [path.join(__dirname, 'server.js')], {
    stdio: 'inherit'
  });

  serverProcess.on('error', (error) => {
    console.error('Failed to start server:', error);
  });

  serverProcess.on('close', (code) => {
    console.log(`Server process exited with code ${code}`);
  });
}

function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Workflow',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow.webContents.executeJavaScript('clearCanvas()');
          }
        },
        {
          label: 'Open Workflow',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            mainWindow.webContents.executeJavaScript('loadWorkflow()');
          }
        },
        {
          label: 'Save Workflow',
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            mainWindow.webContents.executeJavaScript('saveWorkflow()');
          }
        },
        { type: 'separator' },
        {
          label: 'Export to LLM',
          accelerator: 'CmdOrCtrl+E',
          click: () => {
            mainWindow.webContents.executeJavaScript('exportToLLM()');
          }
        },
        {
          label: 'Import Python',
          accelerator: 'CmdOrCtrl+I',
          click: () => {
            mainWindow.webContents.executeJavaScript('importPythonFile()');
          }
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Workflow',
      submenu: [
        {
          label: 'Run Workflow',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            mainWindow.webContents.executeJavaScript('runWorkflow()');
          }
        },
        {
          label: 'Stop Workflow',
          accelerator: 'CmdOrCtrl+Shift+R',
          click: () => {
            mainWindow.webContents.executeJavaScript('stopWorkflow()');
          }
        },
        { type: 'separator' },
        {
          label: 'Load Auto-Clicker Example',
          click: () => {
            mainWindow.webContents.executeJavaScript('loadDefaultAutoClickerWorkflow()');
          }
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        {
          label: 'Undo',
          accelerator: 'CmdOrCtrl+Z',
          click: () => {
            mainWindow.webContents.executeJavaScript('undo()');
          }
        },
        {
          label: 'Redo',
          accelerator: 'CmdOrCtrl+Y',
          click: () => {
            mainWindow.webContents.executeJavaScript('redo()');
          }
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Open System Logs',
          accelerator: 'CmdOrCtrl+L',
          click: () => {
            createLogsWindow();
          }
        },
        {
          label: 'Open Auto-Clicker',
          accelerator: 'CmdOrCtrl+K',
          click: () => {
            createAutoClickerWindow();
          }
        },
        { type: 'separator' },
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+Shift+R',
          click: () => {
            mainWindow.reload();
          }
        },
        {
          label: 'Toggle Developer Tools',
          accelerator: process.platform === 'darwin' ? 'Alt+Cmd+I' : 'Ctrl+Shift+I',
          click: () => {
            mainWindow.webContents.toggleDevTools();
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(() => {
  createWindow();
  createMenu();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC handlers
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('show-save-dialog', async () => {
  const { dialog } = require('electron');
  const result = await dialog.showSaveDialog(mainWindow, {
    filters: [
      { name: 'JSON Files', extensions: ['json'] },
      { name: 'All Files', extensions: ['*'] }
    ],
    defaultPath: 'workflow.json'
  });
  return result;
});

ipcMain.handle('show-open-dialog', async () => {
  const { dialog } = require('electron');
  const result = await dialog.showOpenDialog(mainWindow, {
    filters: [
      { name: 'JSON Files', extensions: ['json'] },
      { name: 'All Files', extensions: ['*'] }
    ],
    properties: ['openFile']
  });
  return result;
});

console.log('Runtime Hub starting...');
