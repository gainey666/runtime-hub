#!/bin/bash
echo "========================================"
echo "  Runtime Hub - Quick Starter"
echo "========================================"
echo

echo "[1/3] Starting Main Server (port 3000)..."
node src/server.js > /tmp/server.log 2>&1 &
SERVER_PID=$!
sleep 2

echo "[2/3] Starting Auto-Clicker API (port 3001)..."
node src/auto-clicker-api.js > /tmp/auto-clicker.log 2>&1 &
API_PID=$!
sleep 2

echo "[3/3] Opening Browser..."
sleep 1
if command -v xdg-open > /dev/null; then
  xdg-open http://localhost:3000/node-editor
elif command -v open > /dev/null; then
  open http://localhost:3000/node-editor
fi

echo
echo "========================================"
echo "  All Systems Started!"
echo "========================================"
echo
echo "  Node Editor:        http://localhost:3000/node-editor"
echo "  Auto-Clicker Test:  http://localhost:3000/auto-clicker-test.html"
echo "  Enhanced Dashboard: http://localhost:3000/enhanced-dashboard.html"
echo
echo "  Server PID:  $SERVER_PID"
echo "  API PID:     $API_PID"
echo
echo "  To run tests:  node test-everything.js"
echo "  To stop:       kill $SERVER_PID $API_PID"
echo "========================================"
