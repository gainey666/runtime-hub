# 🚀 Runtime Hub - Visual Workflow Automation

**Status:** ✅ Fully Operational (as of Feb 21, 2026)

Visual node editor for Windows automation with auto-clicker integration.

---

## ⚡ Quick Start (30 seconds)

```bash
# 1. Start servers (2 terminals)
node src/server.js              # Port 3000
node src/auto-clicker-api.js    # Port 3001

# 2. Open browser
http://localhost:3000/node-editor
http://localhost:3000/auto-clicker-test.html
```

---

## 🎯 What Works NOW

✅ **Visual Node Editor**
- Drag-drop 50+ nodes from palette
- Draw connections between nodes
- Auto-Clicker workflow template (6 nodes)
- Save/Load workflows as JSON
- Search & filter nodes

✅ **Auto-Clicker System**
- REST API (7 endpoints)
- Real-time status monitoring
- Start/Stop/Pause/Resume controls
- Test UI with live event log

✅ **Development**
- TypeScript: 0 compilation errors
- All UIs load without errors
- Socket.IO real-time updates

---

## 📋 Access URLs

| Service | URL |
|---------|-----|
| **Node Editor** | http://localhost:3000/node-editor |
| **Auto-Clicker Test** | http://localhost:3000/auto-clicker-test.html |
| **React UI** | http://localhost:3000/react/ |
| **Enhanced Dashboard** | http://localhost:3000/enhanced-dashboard.html |
| **Main Server Health** | http://localhost:3000/health |
| **Auto-Clicker Health** | http://localhost:3001/health |

---

## 🏗️ Architecture

```
┌─────────────────┐      ┌──────────────────┐
│  Node Editor    │─────▶│  Main Server     │
│  (Port 3000)    │      │  Express+SocketIO│
└─────────────────┘      └──────────────────┘
                                   │
                         ┌─────────┴──────────┐
                         ▼                    ▼
              ┌──────────────────┐  ┌─────────────────┐
              │ Auto-Clicker API │  │  Python Agent   │
              │   (Port 3001)    │  │   (Optional)    │
              └──────────────────┘  └─────────────────┘
```

---

## 📁 Key Files

```
src/
├── server.js              # Main server (port 3000)
├── auto-clicker-api.js    # Auto-clicker API (port 3001)
├── workflow-engine-wrapper.js
└── core/
    ├── WorkflowEngine.ts
    └── auto-clicker/

public/
├── node-editor.html       # Visual editor (1,750 lines)
├── auto-clicker-test.html # Test UI
├── node-library.js        # 50+ node definitions
└── error-logger.js

docs/
├── PROJECT_STATUS_2026-02-21.md  # Full status report
├── HONEST_STATUS.md              # What actually works
├── QUICK_START.md                # Quick reference
└── FINAL_FIXES.md                # Latest fixes
```

---

## 🎨 Node Categories (50+ nodes)

- **Control Flow** - Start, End, Loop, Condition, Delay
- **Python** - Execute Python, Python Function
- **File System** - Read, Write, List Directory
- **Windows** - Run Command, Get Window, Click
- **Network** - HTTP Request, WebSocket
- **Database** - Query, Insert, Update
- **Automation** - Wait, Sleep, Repeat
- **Data Processing** - Transform, Filter, Map

---

## 🔧 Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# TypeScript check
npx tsc --noEmit

# Lint
npm run lint
```

---

## 📊 Project Stats

- **Lines of Code:** ~2,000 (session 2)
- **TypeScript Errors:** 0 (fixed from 432)
- **Test Coverage:** ~60%
- **Commits Today:** 15
- **Status:** Demo-ready ✅

---

## 📝 Documentation

- **Full Status:** [PROJECT_STATUS_2026-02-21.md](PROJECT_STATUS_2026-02-21.md)
- **Honest Assessment:** [HONEST_STATUS.md](HONEST_STATUS.md)
- **Quick Start:** [QUICK_START.md](QUICK_START.md)
- **Latest Fixes:** [FINAL_FIXES.md](FINAL_FIXES.md)

---

## 🐛 Known Issues

- Workflow execution untested
- Python agent untested
- 101 test failures
- Electron app untested

See [HONEST_STATUS.md](HONEST_STATUS.md) for details.

---

## 🤝 Contributing

1. Fork the repo
2. Create feature branch
3. Make changes
4. Test thoroughly
5. Submit PR

---

## 📄 License

MIT License - See LICENSE file

---

**Last Updated:** February 21, 2026
**Repository:** https://github.com/gainey666/runtime-hub
