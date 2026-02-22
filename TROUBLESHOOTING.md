# 🔧 Troubleshooting Guide

## Quick Fixes

### Servers Won't Start

**Problem:** Port already in use
```bash
# Windows
tasklist | findstr node
taskkill /F /PID <pid>

# Linux/Mac
lsof -i :3000
kill -9 <pid>
```

**Problem:** Module not found
```bash
npm install
```

---

### Node Editor Blank Screen

**Check 1:** Open browser console (F12)
- Look for errors
- Should see: "✅ Node editor initialized"

**Check 2:** Files loading correctly
```bash
curl http://localhost:3000/node-library.js
curl http://localhost:3000/error-logger.js
```

**Fix:** Hard refresh (Ctrl+Shift+R)

---

### Workflow Execution Fails

**Test endpoint:**
```bash
curl -X POST http://localhost:3000/api/workflows/execute \
  -H "Content-Type: application/json" \
  -d '{"nodes":[{"id":"n1","type":"Start","x":0,"y":0,"inputs":[],"outputs":[{"name":"main","type":"flow"}],"config":{}}],"connections":[]}'
```

**Expected:** `{"success":true,"workflowId":"..."}`

**If fails:** Check server logs in terminal

---

### Auto-Clicker Not Working

**Test health:**
```bash
curl http://localhost:3001/health
```

**Test start:**
```bash
curl -X POST http://localhost:3001/api/auto-clicker/start \
  -H "Content-Type: application/json" \
  -d '{"interval":1000,"target":{"x":500,"y":500}}'
```

**Check:** Is port 3001 listening?
```bash
netstat -ano | findstr :3001
```

---

### TypeScript Errors

**Run check:**
```bash
npx tsc --noEmit
```

**Should show:** 0 errors

**If errors:** Check tsconfig.json excludes

---

### Test Suite Fails

**Run tests:**
```bash
npm run test:quick
```

**Expected:** 9/10 or 10/10 passing

**If fails:**
1. Are both servers running?
2. Check ports 3000 and 3001
3. Restart servers

---

## Common Issues

### Issue: "validateType is not defined"
**Fixed in:** Session 3
**Solution:** Already fixed in src/server.js line 18

### Issue: Nodes don't drag from palette
**Fixed in:** Session 3
**Solution:** initCanvasEvents() already implemented

### Issue: Connections don't draw
**Fixed in:** Session 3
**Solution:** mousemove handler already added

### Issue: Duplicate functions
**Fixed in:** Session 3
**Solution:** Removed duplicate getCategoryIcon and initCanvas

---

## Diagnostic Commands

### Check All Systems:
```bash
# Run comprehensive test
npm run test:quick

# Check both servers
curl http://localhost:3000/health
curl http://localhost:3001/health

# Check TypeScript
npx tsc --noEmit
```

### View Logs:
```bash
# Server logs (if using start.sh)
tail -f /tmp/server.log
tail -f /tmp/auto-clicker.log
```

---

## Reset Everything

### Nuclear Option:
```bash
# Kill all node processes
taskkill /F /IM node.exe  # Windows
killall node              # Linux/Mac

# Reinstall
rm -rf node_modules package-lock.json
npm install

# Restart
npm run start:all
```

---

## Still Broken?

1. **Check Git Status:**
   ```bash
   git status
   git pull origin master
   ```

2. **Read Recent Docs:**
   - SESSION_3_SUMMARY.md
   - HONEST_STATUS.md
   - QUICK_START.md

3. **Known Working Commit:**
   ```bash
   git log --oneline | head -5
   # Latest should be recent
   ```

4. **Run Diagnostic:**
   ```bash
   node -v  # Should be v18+
   npm -v   # Should be v8+
   ```

---

## Pro Tips

✅ Always run `npm run test:quick` after changes
✅ Check browser console (F12) for errors
✅ Server logs show workflow execution details
✅ Use start.bat/start.sh for easy startup
✅ Hard refresh (Ctrl+Shift+R) fixes cache issues

---

**Last Updated:** Session 3
**Most Common Issue:** Forgetting to start both servers
**Easiest Fix:** Use start.bat or start.sh
