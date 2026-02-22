# Quick Start Guide - Runtime Hub

## For Developers Picking Up This Project

### Current State (2026-02-22)
- ✅ App launches and runs
- ✅ All 28 nodes load and work
- ✅ Workflow execution works
- ✅ Logs buffer server-side (last 100)
- ✅ Responsive layout for 768p-4K monitors
- ⚠️ Needs testing on 1440p monitor
- ❌ Save/Load dialogs don't work (needs IPC fix)

---

## 30-Second Setup

```bash
npm install
npm start
```

App will open with 3 windows:
1. **Node Editor** - Main workflow canvas
2. **System Logs** - Real-time log viewer
3. **Region Selector** - Screen capture for auto-clicker

---

## 5-Minute Test Workflow

1. **Open Node Editor window**
2. **Drag these nodes to canvas:**
   - Start (Triggers category)
   - HTTP Request (Networking category)
   - End (Triggers category)

3. **Connect them:** Start → HTTP Request → End
   - Click green dot on Start (right side)
   - Drag to green dot on HTTP Request (left side)
   - Repeat for HTTP Request → End

4. **Configure HTTP Request node:**
   - Double-click node
   - URL: `https://jsonplaceholder.typicode.com/posts/1`
   - Method: `GET`
   - Click outside to close

5. **Run workflow:**
   - Click green "Run" button (toolbar)
   - Nodes will light up yellow → green as they execute

6. **View logs:**
   - Open "System Logs" window (or Window menu → System Logs)
   - Should see buffered logs from execution

---

## File Structure (Critical Files Only)

```
runtime-hub/
├── src/
│   ├── main.js           ← Electron entry, window manager
│   ├── server.js         ← Express + Socket.IO, log buffering (lines 38-58)
│   └── config/index.js   ← Config constants
├── public/
│   ├── node-editor.html  ← Main UI (JUST UPDATED - responsive)
│   ├── logs.html         ← Log viewer
│   ├── node-library.js   ← 28 node definitions
│   └── error-logger.js   ← Client error tracking
└── docs/
    ├── SESSION_4_CONTINUATION.md  ← Start here (full context)
    ├── NODE_FIELD_GUIDE.md        ← User guide for all nodes
    └── TESTING_CHECKLIST.md       ← Test plan
```

---

## Most Common Issues & Fixes

### Issue: "Port 3000 already in use"
```bash
# Kill all instances
taskkill //F //IM node.exe //IM electron.exe
npm start
```

### Issue: Status bar cut off
**Fixed in Session 4** - Uses responsive CSS with media queries
- Test on your 1440p monitor to verify

### Issue: Logs not showing
**Fixed in Session 3** - Server buffers last 100 logs
- Close and reopen System Logs window - should show buffer

### Issue: Connection lines don't follow nodes
**Fixed in Session 3** - Uses `getBoundingClientRect()`
- Drag nodes to test

### Issue: Can't scroll node palette
**Fixed in Session 3** - Added `overflow-y-auto` and `min-h-0`
- Palette should show scrollbar with 28 nodes

---

## Priority Tasks (Next Developer)

### 1. TEST Responsive Layout (5 min)
Open app on 1440p monitor:
- [ ] Status bar visible at bottom (shows "X: 0, Y: 0" and "Selected: None")
- [ ] Toolbar not cramped
- [ ] Node palette width appropriate
- [ ] No UI elements cut off

### 2. TEST Log Buffering (2 min)
- [ ] Close System Logs window
- [ ] Create and run a workflow (Start → HTTP Request → End)
- [ ] Open System Logs window
- [ ] Verify logs from workflow appear (should show buffered logs)

### 3. FIX Save/Load Dialogs (30 min)
**Problem:** Blob download doesn't work in Electron `file://` protocol

**Solution:** Add IPC to main process
```javascript
// In src/main.js - add IPC handler
ipcMain.handle('save-workflow-dialog', async (event, workflowData) => {
  const { dialog } = require('electron');
  const result = await dialog.showSaveDialog({
    defaultPath: `workflow_${Date.now()}.json`,
    filters: [{ name: 'JSON', extensions: ['json'] }]
  });
  if (!result.canceled) {
    fs.writeFileSync(result.filePath, JSON.stringify(workflowData, null, 2));
  }
  return result;
});
```

**Files to modify:**
- `src/main.js` - Add IPC handlers
- `public/node-editor.html` - Lines 1169-1220 (saveWorkflow/loadWorkflow functions)

---

## Understanding the Architecture

### Data Flow
```
User creates workflow
    ↓
Frontend: node-editor.html
    ↓
fetch('http://127.0.0.1:3000/api/workflows/execute')
    ↓
Backend: src/server.js
    ↓
Execute nodes sequentially
    ↓
Emit logs: io.emit('log_entry', {...})
    ↓
Buffer logs (last 100) + send to clients
    ↓
Frontend: logs.html (Socket.IO client)
    ↓
Display in System Logs window
```

### Why These Design Choices?

1. **Socket.IO for logs** - Real-time updates to multiple windows
2. **Log buffering** - User can open logs after workflow runs
3. **Explicit fetch URLs** - Electron uses `file://`, needs `http://127.0.0.1:3000`
4. **DOM measurements** - Nodes vary in size, can't hardcode dimensions
5. **CSS custom properties** - Easy responsive scaling

---

## Key Code Locations

| Feature | File | Lines |
|---------|------|-------|
| Log buffering | `src/server.js` | 38-58, 219-222 |
| Workflow execution | `src/server.js` | 100-180 |
| Connection line rendering | `public/node-editor.html` | 1054-1075 |
| Node definitions | `public/node-library.js` | All |
| Responsive layout | `public/node-editor.html` | 10-306 |
| Save workflow (broken) | `public/node-editor.html` | 1169-1187 |
| Load workflow (broken) | `public/node-editor.html` | 1189-1220 |

---

## Git Workflow

```bash
# Check what's modified
git status

# Commit responsive layout changes
git add public/node-editor.html src/server.js
git commit -m "fix: Responsive layout + log buffering

- Add CSS custom properties for 768p-4K monitors
- Fix status bar cut off on 1440p
- Implement server-side log buffering (last 100)
- Hide unimplemented minimap
- Fix connection line positioning
- Fix workflow execution URLs"

# Push when ready
git push
```

---

## Resources

- **Full context:** `SESSION_4_CONTINUATION.md`
- **Previous fixes:** `SESSION_3_SUMMARY.md`
- **User guide:** `NODE_FIELD_GUIDE.md`
- **Test plan:** `TESTING_CHECKLIST.md`

---

## User Feedback Summary

**What user wants working:**
1. ✅ Logs persist even when window closed
2. ✅ Documentation for all 28 node types
3. ✅ Responsive UI for any monitor size
4. ⏳ Save/load workflows (IPC needed)
5. ⏳ Full-screen region selector (currently window-bound)

**User's testing results:**
- Drag/drop works ✅
- Nodes connect ✅
- DevTools works ✅
- Workflow execution works ✅
- Connection lines need verification ⚠️
- Node palette scrolling needs verification ⚠️

---

## Emergency Commands

```bash
# Nuclear option - kill everything and restart
taskkill //F //IM node.exe //IM electron.exe 2>nul && npm start

# Check if server is running
netstat -ano | findstr :3000

# View all background processes
tasklist | findstr "node\|electron"
```

---

## Questions? Check These First

1. **"Where do I start?"** → Read `SESSION_4_CONTINUATION.md`
2. **"What's broken?"** → Save/Load dialogs (need IPC), rest works
3. **"What needs testing?"** → Responsive layout on 1440p, log buffering
4. **"How do workflows work?"** → See "Understanding the Architecture" above
5. **"What did previous sessions fix?"** → Check `SESSION_3_SUMMARY.md`

Good luck! 🚀
