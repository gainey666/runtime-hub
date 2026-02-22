const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let serverProcess;

// Create the browser window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    title: 'Runtime Logger',
    icon: path.join(__dirname, '..', 'assets', 'icon.png') // Optional: Add an icon
  });

  // Start the server first
  startServer();

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Load the app
  mainWindow.loadFile(path.join(__dirname, '../public/index.html'));

  // Dev tools in development
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (serverProcess) {
      serverProcess.kill();
    }
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
            mainWindow.webContents.send('menu-new-workflow');
          }
        },
        {
          label: 'Open Workflow',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            mainWindow.webContents.send('menu-open-workflow');
          }
        },
        {
          label: 'Save Workflow',
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            mainWindow.webContents.send('menu-save-workflow');
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
      label: 'Monitor',
      submenu: [
        {
          label: 'Start Monitoring',
          accelerator: 'CmdOrCtrl+M',
          click: () => {
            mainWindow.webContents.send('menu-start-monitoring');
          }
        },
        {
          label: 'Stop Monitoring',
          accelerator: 'CmdOrCtrl+Shift+M',
          click: () => {
            mainWindow.webContents.send('menu-stop-monitoring');
          }
        },
        { type: 'separator' },
        {
          label: 'Clear Logs',
          click: () => {
            mainWindow.webContents.send('menu-clear-logs');
          }
        }
      ]
    },
    {
      label: 'Workflow',
      submenu: [
        {
          label: 'Generate Code',
          accelerator: 'CmdOrCtrl+G',
          click: () => {
            mainWindow.webContents.send('menu-generate-code');
          }
        },
        {
          label: 'Export to LLM',
          accelerator: 'CmdOrCtrl+E',
          click: () => {
            mainWindow.webContents.send('menu-export-llm');
          }
        },
        { type: 'separator' },
        {
          label: 'Auto Layout',
          click: () => {
            mainWindow.webContents.send('menu-auto-layout');
          }
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Toggle Sidebar',
          accelerator: 'CmdOrCtrl+B',
          click: () => {
            mainWindow.webContents.send('menu-toggle-sidebar');
          }
        },
        {
          label: 'Toggle Logs',
          accelerator: 'CmdOrCtrl+L',
          click: () => {
            mainWindow.webContents.send('menu-toggle-logs');
          }
        },
        { type: 'separator' },
        {
          label: 'Zoom In',
          accelerator: 'CmdOrCtrl+Plus',
          click: () => {
            mainWindow.webContents.send('menu-zoom-in');
          }
        },
        {
          label: 'Zoom Out',
          accelerator: 'CmdOrCtrl+-',
          click: () => {
            mainWindow.webContents.send('menu-zoom-out');
          }
        },
        {
          label: 'Reset Zoom',
          accelerator: 'CmdOrCtrl+0',
          click: () => {
            mainWindow.webContents.send('menu-zoom-reset');
          }
        }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About Runtime Hub',
          click: () => {
            mainWindow.webContents.send('menu-about');
          }
        },
        {
          label: 'Documentation',
          click: () => {
            require('electron').shell.openExternal('https://github.com/your-repo/runtime-hub');
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
