# Adding New Windows to Runtime Hub

## Quick Guide

### 1. Create HTML page in `/public`
```html
<!-- public/my-tool.html -->
<!DOCTYPE html>
<html lang="en">
<head>
    <title>My Tool - Runtime Hub</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); min-height: 100vh; color: white;">
    <!-- Your tool UI here -->
</body>
</html>
```

### 2. Add window function in `src/main.js`
```javascript
let myToolWindow;

function createMyToolWindow() {
  if (myToolWindow) {
    myToolWindow.focus();
    return;
  }

  myToolWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    title: 'Runtime Hub - My Tool',
    backgroundColor: '#111827',
    parent: mainWindow
  });

  myToolWindow.loadFile(path.join(__dirname, '../public/my-tool.html'));

  myToolWindow.on('closed', () => {
    myToolWindow = null;
  });
}
```

### 3. Add cleanup in main window close handler
```javascript
mainWindow.on('closed', () => {
  mainWindow = null;
  if (myToolWindow) {
    myToolWindow.close();
  }
  // ... other windows
});
```

### 4. Add menu item
```javascript
{
  label: 'View',
  submenu: [
    {
      label: 'Open My Tool',
      accelerator: 'CmdOrCtrl+M',
      click: () => {
        createMyToolWindow();
      }
    }
  ]
}
```

## Color Scheme
Use these colors to match the app theme:

- **Background**: `linear-gradient(135deg, #0f172a 0%, #1e293b 100%)`
- **Panels**: `background: rgba(30, 41, 59, 0.6); backdrop-filter: blur(10px); border: 1px solid rgba(120, 119, 198, 0.2);`
- **Inputs**: `background: rgba(15, 23, 42, 0.8); border: 1px solid rgba(120, 119, 198, 0.3);`
- **Buttons**: `background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border: 2px solid rgba(255,255,255,0.1);`

## Examples
- **Logs Window**: `src/main.js` → `createLogsWindow()`
- **Auto-Clicker**: `src/main.js` → `createAutoClickerWindow()`

## Keyboard Shortcuts Currently Used
- Ctrl+L - Logs
- Ctrl+K - Auto-Clicker
- Ctrl+S - Save
- Ctrl+O - Open
- Ctrl+R - Run
- Ctrl+E - Export to LLM
- Ctrl+I - Import Python
- Ctrl+Z/Y - Undo/Redo
