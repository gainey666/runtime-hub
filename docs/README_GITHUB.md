# 🚀 Runtime Hub

**VisualRM-style node editor for Windows PC applications and Python monitoring**

![Runtime Hub](https://img.shields.io/badge/Version-1.0.0-green.svg)
![License](https://img.shields.io/badge/License-MIT-blue.svg)
![Platform](https://img.shields.io/badge/Platform-Windows-lightgrey.svg)
![Framework](https://img.shields.io/badge/Framework-Electron-blue.svg)

## 🎯 Overview

Runtime Hub is a powerful desktop application that provides VisualRM-style visual workflow building for Windows automation and Python monitoring. Build complex workflows by dragging and connecting nodes - no coding required!

## ✨ Key Features

### 🎨 **Visual Node Editor**
- **Drag-and-drop** workflow building
- **Animated SVG connections** with flow effects
- **Real-time node palette** with search
- **Modern dark theme** UI
- **Keyboard shortcuts** for power users

### 🔧 **Dynamic Node System**
- **25+ built-in nodes** across 11 categories
- **Dynamic node registration** (add/remove at runtime)
- **Import/export** node libraries
- **Custom node creation** support

### 🐍 **Python Integration**
- **Live Python monitoring** via Socket.IO
- **Function execution** tracking
- **Module import** capabilities
- **Real-time data** streaming

### 🖥️ **Windows Automation**
- **Process management** (start/kill)
- **Command execution** (PowerShell/CMD)
- **File system** operations
- **Keyboard input** simulation

## 📦 Installation

### Prerequisites
- **Node.js** 18+ 
- **Python** 3.8+
- **Windows 10/11**

### Quick Start
```bash
# Clone the repository
git clone https://github.com/gainey666/runtime-hub.git
cd runtime-hub

# Install dependencies
npm install
pip install -r python-agent/requirements.txt

# Start the application
npm start
```

## 🎮 Usage

### 1. **Launch the Application**
```bash
npm start
```
Opens the Runtime Hub desktop application with:
- **Dashboard** at `http://localhost:3000`
- **Node Editor** at `http://localhost:3000/node-editor`

### 2. **Build Workflows**
1. **Open Node Editor** from the main menu
2. **Drag nodes** from the palette to the canvas
3. **Connect nodes** by clicking and dragging between ports
4. **Configure nodes** by clicking on them
5. **Save/Load** workflows for later use

### 3. **Run Workflows**
1. **Click "Run"** button or press `Ctrl+R`
2. **Monitor execution** in real-time
3. **View results** and logs

## 🏗️ Architecture

```
Runtime Hub/
├── 🖥️ Electron Main Process
│   ├── Window management
│   └── Server coordination
├── 🌐 Web Interface
│   ├── Node Editor UI
│   ├── Dashboard
│   └── Real-time updates
├── ⚙️ Node.js Backend
│   ├── Express server
│   ├── Socket.IO communication
│   └── Workflow execution
└── 🐍 Python Agent
    ├── Live monitoring
    ├── Function execution
    └── Data streaming
```

## 📚 Node Categories

| Category | Description | Example Nodes |
|----------|-------------|---------------|
| **Control Flow** | Workflow orchestration | Start, End, Condition, Loop |
| **Python** | Python integration | Execute Python, Monitor Function |
| **File System** | File operations | Read File, Write File, List Directory |
| **Windows System** | Windows automation | Run Command, Start Process |
| **Network** | Network operations | HTTP Request, Download File |
| **Data Processing** | Data manipulation | Transform JSON, Parse Text |
| **Database** | Database operations | SQL Query |
| **Notification** | User notifications | Show Message |
| **Logging** | Logging system | Write Log |
| **Automation** | Automation tasks | Wait, Keyboard Input |
| **Security** | Security operations | Encrypt Data |

## 🔌 API Reference

### Node Library Management
```javascript
// Add custom node
addCustomNode({
    category: 'Custom',
    name: 'My Node',
    description: 'Does something cool',
    inputs: ['input1'],
    outputs: ['output1'],
    config: { setting: 'value' }
});

// Remove node
removeCustomNode('My Node');

// Export/import node libraries
exportNodeLibrary();
importNodeLibrary();
```

### Workflow Operations
```javascript
// Save workflow
saveWorkflow();

// Load workflow
loadWorkflow();

// Run workflow
runWorkflow();

// Stop workflow
stopWorkflow();
```

## 🛠️ Development

### Project Structure
```
runtime-hub/
├── public/                 # Web interface
│   ├── node-editor.html   # Main node editor
│   ├── node-library.js    # Dynamic node library
│   └── enhanced-dashboard.html
├── src/                   # Backend code
│   ├── main.js           # Electron main process
│   ├── server.js         # Express server
│   └── preload.js        # Preload script
├── python-agent/          # Python integration
│   ├── runtime_monitor.py
│   └── requirements.txt
├── database/              # SQLite database
└── docs/                 # Documentation
```

### Adding Custom Nodes
1. **Define node structure** in `node-library.js`
2. **Implement node logic** in server
3. **Add UI components** if needed
4. **Test integration**

### Running Tests
```bash
# Run unit tests
npm test

# Run integration tests
npm run test:integration

# Run Python agent tests
python python-agent/test_monitor.py
```

## 🚧 Current Status

### ✅ Completed
- [x] **Core Infrastructure** - Electron + web UI
- [x] **Node Editor UI** - Drag-and-drop interface
- [x] **Dynamic Node Library** - 25+ built-in nodes
- [x] **Visual Connections** - SVG-based connections
- [x] **Node Management** - Add/remove/export/import
- [x] **Workflow Building** - Save/load functionality
- [x] **Python Integration** - Socket.IO communication

### 🔄 In Progress
- [ ] **Workflow Execution Engine** - Server-side runner
- [ ] **Python Node Logic** - Real Python execution
- [ ] **Workflow Validation** - Integrity checking

### 📋 Planned
- [ ] **Real-time Highlighting** - Execution feedback
- [ ] **Database Persistence** - Workflow storage
- [ ] **Error Handling** - Robust error management
- [ ] **Undo/Redo System** - Workflow history
- [ ] **Node Templates** - Pre-built workflows

## 🤝 Contributing

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **VisualRM** - Inspiration for node-based workflow system
- **Electron** - Desktop application framework
- **Socket.IO** - Real-time communication
- **Tailwind CSS** - Modern UI styling
- **Font Awesome** - Icon library

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/gainey666/runtime-hub/issues)
- **Discussions**: [GitHub Discussions](https://github.com/gainey666/runtime-hub/discussions)
- **Email**: support@runtimehub.dev

## 🔗 Links

- **Repository**: https://github.com/gainey666/runtime-hub
- **Documentation**: https://docs.runtimehub.dev
- **Website**: https://runtimehub.dev

---

**Built with ❤️ for the Windows automation community**
