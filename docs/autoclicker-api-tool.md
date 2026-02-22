# Auto-Clicker API Tool - Complete Design Specification

This document outlines the complete design for a separate auto-clicker tool that captures screen areas, performs OCR text recognition, and automates mouse clicks based on text changes (Yes/No buttons). The tool is designed to integrate with your main Tetris overlay application via REST API.

## 🎯 **Core Functionality**

### **Primary Features**
- **Screen Area Selection**: User-defined region capture (like sniping tool)
- **OCR Text Recognition**: Detect Yes/No button text with high accuracy
- **Auto-Click Automation**: Click when text changes or matches patterns
- **Main App Integration**: REST API hooks for seamless integration

### **Use Cases**
- Auto-click Yes/No buttons in any application
- Monitor UI elements for state changes
- Automate repetitive clicking tasks
- Integrate with Tetris overlay for game automation

## 🏗️ **System Architecture**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   UI SELECTOR    │───▶│   SCREEN CAPTURE │───▶│   OCR ENGINE    │───▶│   AUTO CLICKER  │
│                 │    │                 │    │                 │    │                 │
│ • Area Picker   │    │ • Screenshot    │    │ • Text Extract  │    │ • Mouse Control  │
│ • Coordinates   │    │ • Region Crop    │    │ • Pattern Match  │    │ • Click Actions  │
│ • Save Config   │    │ • Image Buffer   │    │ • Yes/No Detect  │    │ • Timing Control  │
└─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │                       │
         ▼                       ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   CONFIG STORE  │    │   CHANGE DETECT  │    │   API SERVER    │    │   MAIN APP     │
│                 │    │                 │    │                 │    │                 │
│ • Area Bounds   │    │ • Text Compare   │    │ • REST Endpoints │    │ • API Calls     │
│ • OCR Settings  │    │ • Trigger Logic  │    │ • Webhooks      │    │ • Event Hooks   │
│ • Click Config  │    │ • State Machine  │    │ • Status Updates │    │ • Integration   │
└─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🔧 **Technical Implementation**

### **Core Dependencies**
```javascript
// Screen Capture & Image Processing
const sharp = require('sharp');           // Image manipulation
const { execSync } = require('child_process'); // Windows screen capture

// OCR Engine
const tesseract = require('tesseract.js'); // Text recognition

// Mouse Automation
const robot = require('robotjs');           // Mouse control
const Jimp = require('jimp');              // Image processing

// API Server
const express = require('express');        // REST API
const socketio = require('socket.io');      // Real-time updates

// Configuration
const fs = require('fs').promises;        // File operations
const path = require('path');              // Path handling
```

### **Key Components**

#### **1. Screen Capture Module**
```javascript
class ScreenCapture {
  async captureArea(x, y, width, height) {
    // Use Windows API to capture specific region
    const buffer = execSync(`powershell -Command "Add-Type -AssemblyName System.Drawing; [System.Drawing.Bitmap]::new([System.Drawing.Bitmap]::FromFile((Get-Process -Id $pid).MainWindowHandle)).Clone(new System.Drawing.Rectangle($x, $y, $width, $height)).Save('${tempPath}', [System.Drawing.Imaging.ImageFormat]::Png)"`);
    return buffer;
  }
  
  async saveAreaConfig(area) {
    await fs.writeFile('config/area.json', JSON.stringify(area));
  }
}
```

#### **2. OCR Engine**
```javascript
class OCREngine {
  constructor() {
    this.worker = tesseract.createWorker();
  }
  
  async recognizeText(imageBuffer) {
    await this.worker.load();
    await this.worker.loadLanguage('eng');
    await this.worker.initialize();
    
    const { data: { text } } = await this.worker.recognize(imageBuffer);
    
    // Clean and normalize text
    const cleanedText = text.trim().toLowerCase();
    
    return {
      text: cleanedText,
      confidence: this.calculateConfidence(text),
      matches: this.detectPatterns(cleanedText)
    };
  }
  
  detectPatterns(text) {
    const patterns = {
      yes: /^(yes|y|ok|confirm|accept)/i.test(text),
      no: /^(no|n|cancel|reject|decline)/i.test(text),
      button: /\b(button|btn)\b/i.test(text)
    };
    
    return patterns;
  }
}
```

#### **3. Click Controller**
```javascript
class ClickController {
  async clickAt(x, y, action = 'left') {
    const actions = {
      left: () => robot.moveMouse(x, y).click(),
      right: () => robot.moveMouse(x, y).rightClick(),
      double: () => robot.moveMouse(x, y).doubleClick()
    };
    
    await actions[action]();
    
    return {
      x, y, action,
      timestamp: Date.now()
    };
  }
  
  async clickArea(area, action = 'left') {
    const centerX = area.x + Math.floor(area.width / 2);
    const centerY = area.y + Math.floor(area.height / 2);
    
    return await this.clickAt(centerX, centerY, action);
  }
}
```

#### **4. Auto-Clicker Engine**
```javascript
class AutoClicker {
  constructor() {
    this.screenCapture = new ScreenCapture();
    this.ocrEngine = new OCREngine();
    this.clickController = new ClickController();
    this.isRunning = false;
    this.lastText = '';
    this.config = {};
  }
  
  async start(config) {
    this.config = config;
    this.isRunning = true;
    
    while (this.isRunning) {
      try {
        // Capture screen area
        const imageBuffer = await this.screenCapture.captureArea(
          this.config.area.x, 
          this.config.area.y, 
          this.config.area.width, 
          this.config.area.height
        );
        
        // Perform OCR
        const ocrResult = await this.ocrEngine.recognizeText(imageBuffer);
        
        // Detect changes
        const hasChanged = this.hasTextChanged(ocrResult.text);
        const shouldClick = this.shouldClick(ocrResult);
        
        if (hasChanged && shouldClick) {
          await this.clickController.clickArea(this.config.area, this.config.clickAction);
          this.emit('click', {
            text: ocrResult.text,
            confidence: ocrResult.confidence,
            timestamp: Date.now()
          });
        }
        
        this.lastText = ocrResult.text;
        
        // Wait before next capture
        await this.sleep(this.config.refreshRate || 500);
        
      } catch (error) {
        console.error('Auto-clicker error:', error);
        this.emit('error', error);
      }
    }
  }
  
  hasTextChanged(currentText) {
    return currentText !== this.lastText;
  }
  
  shouldClick(ocrResult) {
    const { text, confidence, matches } = ocrResult;
    
    // Check confidence threshold
    if (confidence < (this.config.confidence || 0.9)) {
      return false;
    }
    
    // Check if text matches target pattern
    const targetPattern = this.config.targetPattern || 'yes|no';
    const regex = new RegExp(targetPattern, 'i');
    return regex.test(text);
  }
  
  stop() {
    this.isRunning = false;
  }
}
```

## 🌐 **API Specification**

### **REST Endpoints**

#### **Start Auto-Clicker**
```http
POST /api/auto-clicker/start
Content-Type: application/json

{
  "area": {
    "x": 100,
    "y": 200,
    "width": 300,
    "height": 100
  },
  "targetPattern": "yes|no",
  "confidence": 0.9,
  "clickAction": "left",
  "refreshRate": 500,
  "name": "YesNoButtonMonitor"
}
```

**Response:**
```json
{
  "success": true,
  "sessionId": "session_12345",
  "status": "started",
  "config": { /* echoed config */ }
}
```

#### **Get Status**
```http
GET /api/auto-clicker/status
```

**Response:**
```json
{
  "running": true,
  "sessionId": "session_12345",
  "lastDetection": {
    "text": "yes",
    "confidence": 0.95,
    "timestamp": "2024-02-17T14:32:15Z"
  },
  "totalClicks": 47,
  "lastClick": "2024-02-17T14:32:15Z",
  "area": { /* current area config */ }
}
```

#### **Stop Auto-Clicker**
```http
POST /api/auto-clicker/stop
Content-Type: application/json

{
  "sessionId": "session_12345"
}
```

**Response:**
```json
{
  "success": true,
  "status": "stopped",
  "finalStats": {
    "totalClicks": 47,
    "duration": 1800000,
    "averageConfidence": 0.92
  }
}
```

#### **Webhook Events**
```json
// Click detected
{
  "event": "click_detected",
  "sessionId": "session_12345",
  "data": {
    "text": "yes",
    "confidence": 0.95,
    "coordinates": { "x": 250, "y": 250 },
    "timestamp": "2024-02-17T14:32:15Z"
  }
}

// Error occurred
{
  "event": "error",
  "sessionId": "session_12345",
  "error": {
    "message": "OCR failed",
    "code": "OCR_ERROR",
    "timestamp": "2024-02-17T14:32:15Z"
  }
}
```

## 🎮 **Integration with Main App**

### **Tetris Overlay Integration**
```javascript
// In your main Tetris overlay app
class TetrisOverlayIntegration {
  constructor() {
    this.autoClickerAPI = 'http://localhost:3001';
    this.sessions = new Map();
  }
  
  async startYesNoMonitor(gameArea) {
    const response = await fetch(`${this.autoClickerAPI}/api/auto-clicker/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        area: gameArea,
        targetPattern: 'yes|no',
        confidence: 0.9,
        clickAction: 'left',
        refreshRate: 200,
        name: 'tetris-yes-no-monitor'
      })
    });
    
    const result = await response.json();
    this.sessions.set(result.sessionId, result.config);
    
    return result;
  }
  
  async stopMonitor(sessionId) {
    await fetch(`${this.autoClickerAPI}/api/auto-clicker/stop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId })
    });
    
    this.sessions.delete(sessionId);
  }
  
  // Handle webhook events
  setupWebhookHandler() {
    // Listen for click events from auto-clicker
    this.webhookServer.on('click_detected', (data) => {
      console.log(`Auto-clicker detected: ${data.data.text} at ${data.data.timestamp}`);
      
      // Update your Tetris overlay state
      this.updateOverlayState(data);
    });
  }
}
```

### **Mapping Actions Throughout Main App**

#### **1. Game State Monitoring**
```javascript
// Monitor game state changes
const gameStateMonitor = {
  async monitorGameOver() {
    // Start auto-clicker on "Game Over" screen
    await this.startYesNoMonitor({
      x: 400, y: 300, width: 200, height: 100
    });
  },
  
  async monitorMainMenu() {
    // Monitor main menu options
    await this.startYesNoMonitor({
      x: 300, y: 200, width: 400, height: 300
    });
  }
};
```

#### **2. Settings Navigation**
```javascript
// Auto-navigate settings menus
const settingsNavigator = {
  async acceptSettings() {
    // Auto-click "Accept" in settings
    await this.startYesNoMonitor({
      x: 500, y: 400, width: 150, height: 50,
      targetPattern: 'accept|ok|yes'
    });
  },
  
  async confirmDialogs() {
    // Handle confirmation dialogs
    await this.startYesNoMonitor({
      x: 350, y: 250, width: 300, height: 200,
      targetPattern: 'confirm|yes|no'
    });
  }
};
```

#### **3. Error Handling**
```javascript
// Auto-handle error dialogs
const errorHandler = {
  async dismissErrors() {
    // Auto-click "OK" on error messages
    await this.startYesNoMonitor({
      x: 400, y: 300, width: 200, height: 150,
      targetPattern: 'ok|close|dismiss'
    });
  },
  
  async retryFailedActions() {
    // Auto-click "Retry" on failure
    await this.startYesNoMonitor({
      x: 450, y: 350, width: 100, height: 50,
      targetPattern: 'retry|try again'
    });
  }
};
```

## 📁 **Project Structure**

```
auto-clicker-tool/
├── src/
│   ├── index.js              # Main entry point
│   ├── screen-capture.js    # Screen capture module
│   ├── ocr-engine.js        # OCR processing
│   ├── click-controller.js  # Mouse automation
│   ├── auto-clicker.js      # Core engine
│   └── api-server.js        # REST API server
├── ui/
│   ├── index.html           # Web interface
│   ├── area-selector.js     # Screen area picker
│   ├── config-panel.js      # Settings UI
│   └── status-monitor.js    # Real-time status
├── config/
│   ├── default.json         # Default configuration
│   └── areas.json           # Saved screen areas
├── tests/
│   ├── unit/                # Unit tests
│   ├── integration/         # Integration tests
│   └── e2e/                 # End-to-end tests
├── docs/
│   ├── API.md               # API documentation
│   ├── SETUP.md             # Setup guide
│   └── EXAMPLES.md          # Usage examples
├── package.json
├── README.md
└── .env.example
```

## 🚀 **Implementation Phases**

### **Phase 1: Core Engine (Day 1)**
- Screen capture functionality
- Basic OCR text recognition
- Simple click automation
- Configuration management

### **Phase 2: Web Interface (Day 2)**
- Area selector tool
- Configuration panel
- Real-time status monitoring
- Visual feedback system

### **Phase 3: API Integration (Day 3)**
- REST API server
- Webhook system
- Main app integration examples
- Error handling and recovery

### **Phase 4: Testing & Polish (Day 4)**
- Comprehensive test suite
- Performance optimization
- Documentation
- Deployment setup

## 🎯 **Success Criteria**

✅ **Functional Requirements**
- Accurate screen area selection
- Reliable Yes/No detection (>95% accuracy)
- Precise mouse clicking (±2 pixels)
- Fast response (<100ms detection time)

✅ **Integration Requirements**
- REST API with full CRUD operations
- Webhook notifications for real-time events
- Easy integration with main Tetris app
- Configuration persistence

✅ **User Experience**
- Intuitive area selection interface
- Clear status feedback
- Simple configuration options
- Reliable error handling

## 🔗 **Main App Integration Mapping**

Once implemented, you can map auto-clicker actions throughout your main Tetris overlay application:

1. **Game State Management**
   - Auto-handle game over screens
   - Navigate main menu options
   - Accept/reject game settings

2. **Error Recovery**
   - Auto-dismiss error dialogs
   - Retry failed operations
   - Handle network timeouts

3. **User Interface**
   - Auto-accept confirmation dialogs
   - Navigate settings menus
   - Handle popup notifications

4. **Automation Workflows**
   - Chain multiple auto-clicker sessions
   - Coordinate with existing workflow engine
   - Create complex automation sequences

---

**🎯 This design provides a complete, separate auto-clicker tool that can be easily integrated into your main Tetris overlay application for comprehensive automation capabilities!**
