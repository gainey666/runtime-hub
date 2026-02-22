# 🚀 Runtime Hub - Complete Recovery Plan

**Status:** Project Non-Functional
**Goal:** Get at least ONE working UI + backend operational
**Strategy:** Fix critical path first, then expand

---

## 🎯 PHASE 1: GET THE SERVER RUNNING (Days 1-2)

### Priority: CRITICAL - Nothing works without this

#### Task 1.1: Fix Module System
**Problem:** Server imports broken TypeScript files
- [ ] Create `src/workflow-engine-exports.js` - CommonJS wrapper for TS engine
- [ ] OR: Compile TypeScript to `dist/` folder
- [ ] Update `src/server.js` line 6 to import compiled/wrapped engine
- [ ] Test: `node src/server.js` should start without errors

#### Task 1.2: Fix Missing Dependencies
- [ ] Check if `src/config/index.js` exists (imported on line 11)
- [ ] Check if `src/utils/errorHandler.js` exists (imported on line 12)
- [ ] Create missing files OR remove broken imports
- [ ] Add temporary stubs if needed for quick startup

#### Task 1.3: Simplify Server for MVP
- [ ] Comment out WorkflowEngine initialization (lines 33, 438-444)
- [ ] Keep only: Express, Socket.IO, SQLite, basic routes
- [ ] Remove Redis adapter (lines causing errors)
- [ ] Get server to port 3000 with `/health` endpoint working

**Success Criteria:**
```bash
node src/server.js
# Output: "🚀 Runtime Logger server running on localhost:3000"
curl http://localhost:3000/health
# Returns: {"status":"healthy"}
```

---

## 🎨 PHASE 2: GET ONE UI WORKING (Days 2-3)

### Target: `enhanced-dashboard.html` (Most complete implementation)

#### Task 2.1: Test Dashboard Standalone
- [ ] Start fixed server from Phase 1
- [ ] Open browser: http://localhost:3000/enhanced-dashboard.html
- [ ] Check browser console for errors
- [ ] Verify Socket.IO connection (green indicator)

#### Task 2.2: Fix Dashboard Bugs
- [ ] Fix `selectApplication()` line 476 - undefined `event` variable
- [ ] Add error handling to API calls
- [ ] Test: Click "Toggle Logs", "Clear Canvas", "Auto Layout" buttons
- [ ] Verify all buttons have working handlers

#### Task 2.3: Create Test Data
- [ ] Add SQL script to create sample application
- [ ] Add sample nodes and connections
- [ ] Test node rendering and dragging
- [ ] Verify real-time updates work

**Success Criteria:**
- Dashboard loads without console errors
- Socket.IO shows "Connected"
- Buttons respond when clicked
- Can see and drag nodes

---

## 🔧 PHASE 3: FIX ELECTRON APP (Days 3-4)

### Make desktop app actually work

#### Task 3.1: Create Missing Files
- [ ] Create `src/preload.js` with basic IPC bridge:
```javascript
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('electron', {
  saveDialog: () => ipcRenderer.invoke('show-save-dialog'),
  openDialog: () => ipcRenderer.invoke('show-open-dialog')
});
```

#### Task 3.2: Fix Electron Startup
- [ ] Update `main.js` to load enhanced-dashboard.html instead of index.html
- [ ] OR: Add JavaScript to index.html to make it functional
- [ ] Test: `npm start` should open working window
- [ ] Verify server starts in background

#### Task 3.3: Connect Electron to Server
- [ ] Ensure Electron window points to http://localhost:3000
- [ ] OR: Load HTML files directly with working Socket.IO
- [ ] Test menu shortcuts work
- [ ] Verify IPC handlers work

**Success Criteria:**
- `npm start` opens Electron window
- Background server starts successfully
- Dashboard displays in window
- Menu items respond

---

## 📝 PHASE 4: FIX NODE EDITOR (Days 4-5)

### Make the visual workflow editor functional

#### Task 4.1: Implement Missing Functions
Create JavaScript section in `node-editor.html` with:
- [ ] `runWorkflow()` - POST to `/api/workflows/execute`
- [ ] `stopWorkflow()` - POST to `/api/workflows/:id/stop`
- [ ] `saveWorkflow()` - Save nodes/connections to localStorage
- [ ] `loadWorkflow()` - Load from localStorage
- [ ] `clearCanvas()` - Remove all nodes
- [ ] `undo()` / `redo()` - History stack implementation

#### Task 4.2: Complete Node Dragging
- [ ] Finish drag-and-drop from palette (line 523-528)
- [ ] Implement node positioning on canvas
- [ ] Add connection drawing between nodes
- [ ] Store workflow state

#### Task 4.3: Integrate with Backend
- [ ] Connect to WorkflowEngine API
- [ ] Send workflow for execution
- [ ] Display real-time execution status
- [ ] Show errors and results

**Success Criteria:**
- Can drag nodes from palette to canvas
- Can connect nodes together
- "Run Workflow" button executes workflow
- Real-time updates show node execution

---

## ⚛️ PHASE 5: REACT UI (OPTIONAL - Days 5-6)

### Only if time allows - not critical

#### Task 5.1: Build React App
- [ ] `cd ui/web && npm install`
- [ ] `npm run build`
- [ ] Copy build output to `public/react/`

#### Task 5.2: Serve React App
- [ ] Add route in server.js: `app.use('/react', express.static('public/react'))`
- [ ] Test: http://localhost:3000/react

#### Task 5.3: Create Auto-Clicker API
- [ ] Create separate server on port 3001
- [ ] Implement `/api/auto-clicker/start` and `/stop` endpoints
- [ ] OR: Add routes to main server

**Success Criteria:**
- React app loads at /react
- Buttons connect to real API
- Auto-clicker functionality works

---

## 🧪 PHASE 6: TESTING & CLEANUP (Days 6-7)

#### Task 6.1: Fix Critical Tests
- [ ] Run `npm test` and identify failures
- [ ] Fix module import errors in tests
- [ ] Get at least 80% pass rate

#### Task 6.2: Remove Dead Code
- [ ] Delete old `src/workflow-engine.js` (broken JS version)
- [ ] Remove unused markdown files
- [ ] Clean up duplicate backups

#### Task 6.3: Update Documentation
- [ ] Update README with actual working state
- [ ] Add quick start guide
- [ ] Document which UIs work

---

## 🚨 CRITICAL PATH (Minimum Viable)

**To get SOMETHING working TODAY:**

1. **Fix server.js imports** (30 mins)
   - Comment out WorkflowEngine
   - Remove broken imports
   - Keep basic Express + Socket.IO

2. **Start server** (5 mins)
   ```bash
   node src/server.js
   ```

3. **Open working UI** (2 mins)
   ```
   http://localhost:3000/enhanced-dashboard.html
   ```

4. **Verify functionality** (10 mins)
   - Socket.IO connects
   - Buttons work
   - No console errors

**Total Time: ~1 hour to get SOMETHING running**

---

## 📊 DECISION TREE

### Question 1: What's the priority?
- **Desktop app first?** → Start Phase 3 (Electron)
- **Web dashboard first?** → Start Phase 1+2 (Server + Dashboard)
- **Visual workflow editor first?** → Start Phase 1+4 (Server + Node Editor)
- **Just want ANYTHING working?** → Follow Critical Path above

### Question 2: Keep both workflow engines?
- **NO** (recommended) → Delete `src/workflow-engine.js`, use only TypeScript version
- **YES** → Fix JS engine to match TS API, keep both for migration

### Question 3: Python integration needed now?
- **NO** → Comment out Python agent code, focus on core functionality
- **YES** → Keep Python agent code, test with `python-agent/simple_test.py`

### Question 4: Auto-clicker priority?
- **HIGH** → Build Phase 5 early, create API server
- **LOW** → Skip React UI, focus on workflow editor

---

## 💾 BACKUP BEFORE STARTING

```bash
# Create backup
git add -A
git commit -m "Backup before recovery - broken state"
git branch backup-broken-state

# Now safe to make changes
```

---

## 🎯 SUCCESS METRICS

### Minimum Success (48 hours):
- ✅ Server starts without errors
- ✅ One UI loads and displays
- ✅ Buttons do something when clicked
- ✅ Socket.IO connection works

### Good Success (1 week):
- ✅ All above +
- ✅ Electron app launches
- ✅ Node editor functional
- ✅ Can create and run simple workflows
- ✅ 50%+ tests passing

### Complete Success (2 weeks):
- ✅ All above +
- ✅ React UI integrated
- ✅ Auto-clicker working
- ✅ Python agent connected
- ✅ 80%+ tests passing
- ✅ Documentation updated

---

## 🤔 QUESTIONS TO ANSWER BEFORE STARTING

1. **What's your top priority?** (Desktop app / Web dashboard / Workflow editor / Auto-clicker)

2. **Do you want to keep the JavaScript workflow-engine.js or delete it?**

3. **Is Python integration critical right now?**

4. **Do you want the React UI or just the HTML dashboards?**

5. **Timeline: Do you need something working today, this week, or can we do a proper 2-week rebuild?**

6. **Who will use this?** (Just you / Team / Investors / Demo)

---

**Ready to start Phase 1? Let me know your priorities and I'll begin!**
