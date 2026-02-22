# Runtime Hub - Testing Checklist

**Last Updated:** February 22, 2026

## ✅ FIXED - Session 3

### Critical Bugs Fixed
1. ✅ **Socket.io not loading** - Changed to CDN instead of server
2. ✅ **Node palette empty** - Fixed infinite recursion in node-library.js
3. ✅ **Error logger infinite loop** - Disabled auto-export
4. ✅ **Server IPv6 issue** - Changed to 127.0.0.1
5. ✅ **CORS blocking file://** - Added wildcard origin
6. ✅ **DevTools wrong window** - Target focused window

---

## 🎯 CURRENT STATUS (Feb 22, 2026)

### ✅ Working Features

#### 1. Node Editor (Main Window)
- [x] 28 nodes load in palette
- [x] 11 categories (Control Flow, Python, File System, Windows, Network, etc.)
- [x] Socket.io connects to 127.0.0.1:3000
- [x] Search/filter nodes
- [x] Drag nodes to canvas
- [ ] **UNTESTED:** Create connections between nodes
- [ ] **UNTESTED:** Save/Load workflows
- [ ] **UNTESTED:** Execute workflows

#### 2. System Logs (Ctrl+L)
- [x] Opens in child window
- [x] Socket.io connects (green dot)
- [x] Shows connection messages
- [x] Filter buttons (All, Info, Warn, Error, Success, Debug)
- [x] Stats counter (Total Logs, Errors, Warnings)
- [x] DevTools toggle works for this window
- [ ] **UNTESTED:** Auto-scroll
- [ ] **UNTESTED:** Export logs
- [ ] **UNTESTED:** Rich system logging during workflow execution

#### 3. Auto-Clicker (Ctrl+K)
- [x] Opens in child window
- [x] UI loads with gradient matching node editor
- [x] Region selector (works within window bounds only)
- [x] DevTools toggle works for this window
- [ ] **UNTESTED:** Start/Stop functionality
- [ ] **UNTESTED:** API connection to port 3001
- [ ] **UNTESTED:** OCR integration
- [ ] **UNTESTED:** Click simulation

#### 4. Server
- [x] Starts on 127.0.0.1:3000 (IPv4)
- [x] Socket.io server working
- [x] CORS allows all origins
- [x] Static file serving
- [x] Port conflict detection
- [ ] **UNTESTED:** Workflow execution endpoints
- [ ] **UNTESTED:** Auto-clicker API (port 3001)

---

## 🧪 TEST PLAN

### Phase 1: Basic UI Testing (5 min)
1. Start app: `npm start`
2. Main window opens → Node Editor visible
3. Press Ctrl+L → System Logs opens
4. Press Ctrl+K → Auto-Clicker opens
5. View → Toggle Developer Tools on each window
6. Check console for errors

### Phase 2: Node Editor Testing (10 min)
1. Search for "Python" in node palette → Verify filters work
2. Drag "Start" node to canvas
3. Drag "HTTP Request" node to canvas
4. Drag "End" node to canvas
5. Try to connect nodes (drag from output to input)
6. File → Save Workflow → Save to file
7. File → Load Workflow → Load saved file
8. Try to execute simple workflow

### Phase 3: System Logs Testing (5 min)
1. Open System Logs (Ctrl+L)
2. Verify shows "● Connected" (green)
3. Check that startup logs appear
4. Filter by "Success" → Verify filters work
5. Filter by "Error" → Should show any errors
6. Try export button
7. Clear logs button

### Phase 4: Auto-Clicker Testing (10 min)
1. Open Auto-Clicker (Ctrl+K)
2. Click "Select Region" button
3. Drag to select region
4. Enter search text
5. Set click interval
6. Click "Start Session"
7. Verify API responds
8. Check System Logs for auto-clicker events
9. Click "Stop Session"

---

## 🐛 KNOWN ISSUES

### Critical (Blocking)
- None currently identified

### High Priority
- [ ] Auto-clicker API may not be running (port 3001)
- [ ] Workflow execution untested
- [ ] Node connections may not work
- [ ] Region selector limited to window bounds

### Medium Priority
- [ ] 101 test failures mentioned in README
- [ ] Python agent integration untested
- [ ] No authentication/security

### Low Priority
- [ ] Tailwind CDN warning (use PostCSS in production)
- [ ] Electron security warnings (CSP)
- [ ] Cache errors on Windows

---

## 📊 SUCCESS CRITERIA

### Minimal Viable Demo
- [x] App starts without errors
- [x] All 3 windows open correctly
- [x] Socket.io connections work
- [x] Node palette shows nodes
- [ ] Can create simple 3-node workflow
- [ ] Can execute workflow successfully
- [ ] System logs show workflow execution

### Full Feature Demo
- [ ] All above + workflow templates work
- [ ] Auto-clicker can start/stop
- [ ] Python agent connects
- [ ] Save/Load workflows
- [ ] Export debug data

---

## 🚀 QUICK START

```bash
# Start the app
npm start

# Start with DevTools for all windows
npm start -- --dev

# Test specific window
# Ctrl+L = System Logs
# Ctrl+K = Auto-Clicker
# Ctrl+Shift+I = Toggle DevTools (focused window)
```

---

## 📝 TESTING NOTES

**Session 3 Accomplishments:**
- Fixed 6 critical bugs preventing app from working
- Node palette now shows 28 nodes
- Socket.io connections working
- DevTools accessible for all windows
- Console logging forwarded to main process

**Next Steps:**
1. Test workflow creation and execution
2. Test auto-clicker API integration
3. Fix any remaining issues
4. Create demo workflows
5. Document all features

---

## 🔍 DEBUGGING TIPS

### Socket.io not connecting?
- Check server logs for "Client connected: <socket-id>"
- Verify server running on 127.0.0.1:3000
- Check browser console for socket errors

### Nodes not showing?
- Check console for "✅ Node Library loaded: 28 nodes available"
- Check for "✅ Node palette loaded: 28 nodes in 11 categories"
- Look for JavaScript errors in console

### DevTools not opening?
- Make sure window is focused
- Use View → Toggle Developer Tools
- Or press Ctrl+Shift+I (Windows)

### Console logs?
- All renderer console logs forward to main process stdout
- Look for `[NODE EDITOR]` and `[LOGS WINDOW]` prefixes
- Or use DevTools console directly

---

**Testing by:** Claude Code
**Date:** February 22, 2026
**Status:** Ready for comprehensive testing
