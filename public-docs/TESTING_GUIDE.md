# 🧪 Runtime Hub - Testing Guide

**Follow these steps exactly to test your app!**

---

## 📋 Prerequisites

1. Close any running instances of the app
2. Open a terminal in the project folder
3. You should be here: `C:\Users\imme\CascadeProjects\windsurf-project-13`

---

## 🚀 Step 1: Start the App

```bash
npm start
```

**Expected Result:**
- Main window opens (Node Editor)
- Terminal shows:
  ```
  ✅ Node Library loaded: 28 nodes available
  ✅ Node palette loaded: 28 nodes in 11 categories
  🚀 Runtime Logger server running on 127.0.0.1:3000
  ```

**✅ If you see this, continue to Step 2**
**❌ If it crashes, tell me the error**

---

## 🎨 Step 2: Check Node Palette (Left Sidebar)

**What to do:**
1. Look at the **left sidebar** of the main window
2. You should see categories like:
   - Control Flow
   - Python
   - File System
   - Windows
   - Network
   - Database
   - Automation
   - etc.

3. Each category should have nodes like:
   - **Control Flow:** Start, End, Loop, Condition
   - **Python:** Execute Python, Python Function
   - **Automation:** Auto-Clicker, Wait, Sleep

**Try this:**
- Type "python" in the search box
- Only Python-related nodes should show
- Clear the search box - all nodes come back

**✅ Pass = You see nodes organized by category**
**❌ Fail = Left sidebar empty or no nodes**

---

## 📝 Step 3: Open System Logs

**What to do:**
1. Press `Ctrl+L` (or click View → Open System Logs)
2. New window opens: "Runtime Hub - System Logs"

**Expected Result:**
- Top left shows: **● Connected** (GREEN dot)
- Under that shows: `System | SUCCESS | Connected to Runtime Hub server (socket-id)`
- Stats at top right: `Total Logs: 2`, `Errors: 0`, `Warnings: 0`

**Try this:**
- Click different filter buttons (All, Info, Warn, Error, Success)
- Logs should filter by type
- Click "Clear Logs" - logs disappear
- Stats reset to 0

**✅ Pass = Green dot, shows logs, filters work**
**❌ Fail = Yellow "Connecting..." or no logs**

---

## 🖱️ Step 4: Open Auto-Clicker

**What to do:**
1. Press `Ctrl+K` (or click View → Open Auto-Clicker)
2. New window opens: "Runtime Hub - Auto-Clicker"

**Expected Result:**
- Window with blue/purple gradient background (matches node editor)
- Form with fields:
  - Region X, Y, Width, Height
  - Search Text
  - Refresh Rate
  - Max Iterations
  - Click Button (Left/Right/Middle)
- "Select Region" button
- "Start Session" / "Stop Session" buttons

**Try this:**
- Click "Select Region" button
- Overlay appears (semi-transparent)
- Drag mouse to select area
- Region coordinates fill in the form
- **Note:** Only works inside the window, not outside

**✅ Pass = Window opens, looks nice, region selector works**
**❌ Fail = Window doesn't open or looks broken**

---

## 🔍 Step 5: Test DevTools Toggle

**What to do:**
1. **On main window (Node Editor):**
   - Press `Ctrl+Shift+I` (or View → Toggle Developer Tools)
   - DevTools should open **FOR THE NODE EDITOR**

2. **Click on System Logs window to focus it:**
   - Press `Ctrl+Shift+I` again
   - DevTools should open **FOR THE LOGS WINDOW** (not node editor!)

3. **Click on Auto-Clicker window:**
   - Press `Ctrl+Shift+I` again
   - DevTools should open **FOR AUTO-CLICKER** (not others!)

**✅ Pass = DevTools opens for the focused window, not always main**
**❌ Fail = DevTools always opens for node editor regardless of focus**

---

## 🎯 Step 6: Test Drag Node to Canvas (CRITICAL!)

**What to do:**
1. Go back to main window (Node Editor)
2. Find the **Start** node in the left palette (Control Flow category)
3. **Click and hold** on the Start node
4. **Drag it** to the middle of the canvas (the big grid area)
5. **Release** the mouse

**Expected Result:**
- Node appears on canvas
- Node shows:
  - Icon (🚀)
  - Name "Start"
  - Output connection point (circle on right side)

**Try adding more nodes:**
- Drag "HTTP Request" from Network category
- Drag "End" from Control Flow category

**✅ Pass = Nodes appear on canvas when dragged**
**❌ Fail = Nothing happens when you drag, or error in console**

---

## 🔗 Step 7: Test Connecting Nodes (CRITICAL!)

**What to do:**
1. Make sure you have 2 nodes on canvas (e.g., Start and End)
2. Find the **output circle** on the right side of Start node
3. **Click and hold** on that circle
4. **Drag** to the **input circle** on the left side of End node
5. **Release**

**Expected Result:**
- A **line/arrow** appears connecting the two nodes
- Line goes from Start → End
- Line updates if you drag nodes around

**If it doesn't work:**
- Check DevTools console (Ctrl+Shift+I) for errors
- Look for messages like "connection created" or errors

**✅ Pass = Line connects the nodes**
**❌ Fail = No line appears, or error**

---

## 💾 Step 8: Test Save Workflow (If connections work)

**What to do:**
1. Create a simple workflow:
   - Start node
   - HTTP Request node
   - End node
   - Connect them: Start → HTTP Request → End

2. Click **File → Save Workflow** (or press `Ctrl+S`)
3. File dialog appears
4. Save as `test-workflow.json`

**Expected Result:**
- File saves
- No errors

**Try loading it back:**
- Click **File → Load Workflow** (or press `Ctrl+O`)
- Select `test-workflow.json`
- Workflow appears on canvas

**✅ Pass = Saves and loads correctly**
**❌ Fail = Error when saving/loading**

---

## ⚡ Step 9: Test Execute Workflow (If everything above works)

**What to do:**
1. Have a simple workflow on canvas (Start → HTTP Request → End)
2. Click the **green Play button** (▶️) at the top
3. OR click Workflow → Start Execution

**Expected Result:**
- System Logs window should show:
  ```
  Workflow | INFO | Workflow started: <workflow-id>
  Node | INFO | Node Start: running
  Node | INFO | Node HTTP Request: running
  Node | INFO | Node End: completed
  Workflow | SUCCESS | Workflow completed
  ```

**Watch for errors:**
- If HTTP Request fails, that's OK (no URL configured)
- Important: workflow should **attempt** to execute

**✅ Pass = Workflow executes, logs show activity**
**❌ Fail = Nothing happens, or immediate error**

---

## 📊 REPORT YOUR RESULTS

**For EACH step, tell me:**

```
Step 1 (Start App): ✅ PASS / ❌ FAIL
Step 2 (Node Palette): ✅ PASS / ❌ FAIL
Step 3 (System Logs): ✅ PASS / ❌ FAIL
Step 4 (Auto-Clicker): ✅ PASS / ❌ FAIL
Step 5 (DevTools): ✅ PASS / ❌ FAIL
Step 6 (Drag Nodes): ✅ PASS / ❌ FAIL
Step 7 (Connect Nodes): ✅ PASS / ❌ FAIL
Step 8 (Save/Load): ✅ PASS / ❌ FAIL
Step 9 (Execute): ✅ PASS / ❌ FAIL
```

**If something fails:**
- Tell me which step
- What happened vs. what you expected
- Any error messages (from console or terminal)

---

## 🐛 Common Issues & Fixes

### "Nodes won't drag to canvas"
- Check DevTools console (Ctrl+Shift+I on main window)
- Look for JavaScript errors
- Try clicking on canvas first to make sure it's active

### "Can't connect nodes"
- Make sure you're dragging from **output** (right side) to **input** (left side)
- Not all nodes can connect to each other
- Check console for errors

### "Workflow won't execute"
- Make sure nodes are connected properly
- Check System Logs for error messages
- Look for API errors in terminal

### "Nothing happens when I click buttons"
- Check if there's a JavaScript error in console
- Try reloading the window (Ctrl+Shift+R)

---

## 🎯 Success Criteria

**Minimum to be considered working:**
- Steps 1-5: ✅ All pass (UI loads correctly)
- Step 6: ✅ Drag nodes works
- Step 7: ✅ Connect nodes works

**Bonus if working:**
- Step 8: ✅ Save/Load works
- Step 9: ✅ Execute attempts to run

---

## 🚨 Emergency: If App Won't Start

```bash
# Kill all instances
taskkill /F /IM node.exe /IM electron.exe

# Try again
npm start
```

---

**Ready?** Start with Step 1 and report back! 🚀

I'll fix any issues you find immediately.
