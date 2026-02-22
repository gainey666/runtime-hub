"use strict";
/**
 * Auto-Clicker Engine
 * Main orchestrator for screen capture, OCR, and clicking
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutoClickerEngine = void 0;
const { EventEmitter } = require('events');
const { WindowsScreenCapture } = require('./screen-capture/windows-capture');
const { OCREngine } = require('./screen-capture/ocr-engine');
const { MouseControl } = require('./click-automation/mouse-control');
class AutoClickerEngine extends EventEmitter {
    constructor() {
        super();
        this.screenCapture = new WindowsScreenCapture();
        this.ocrEngine = new OCREngine();
        this.mouseControl = new MouseControl();
        this.sessions = new Map();
        this.runningSessions = new Set();
    }
    async start(config) {
        const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        console.log(`🚀 Starting auto-clicker session: ${sessionId}`);
        const session = {
            id: sessionId,
            config,
            status: 'starting',
            startTime: Date.now(),
            totalClicks: 0
        };
        this.sessions.set(sessionId, session);
        this.emit('session_started', { sessionId, config });
        try {
            // Validate configuration
            this.validateConfig(config);
            // Update status to running
            session.status = 'running';
            this.runningSessions.add(sessionId);
            this.emit('status_update', { sessionId, status: 'running' });
            // Start the main loop
            await this.runMainLoop(sessionId);
            return sessionId;
        }
        catch (error) {
            console.error(`❌ Failed to start session ${sessionId}:`, error);
            session.status = 'error';
            session.error = error instanceof Error ? error.message : 'Unknown error';
            this.emit('error', { sessionId, error: session.error });
            throw error;
        }
    }
    async stop(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }
        console.log(`🛑 Stopping auto-clicker session: ${sessionId}`);
        session.status = 'stopped';
        session.endTime = Date.now();
        this.runningSessions.delete(sessionId);
        this.emit('session_stopped', {
            sessionId,
            totalClicks: session.totalClicks,
            duration: session.endTime - session.startTime
        });
    }
    async pause(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }
        if (session.status === 'running') {
            session.status = 'paused';
            this.runningSessions.delete(sessionId);
            this.emit('status_update', { sessionId, status: 'paused' });
        }
    }
    async resume(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }
        if (session.status === 'paused') {
            session.status = 'running';
            this.runningSessions.add(sessionId);
            this.emit('status_update', { sessionId, status: 'running' });
            await this.runMainLoop(sessionId);
        }
    }
    validateConfig(config) {
        if (!config.area || typeof config.area.x !== 'number' || typeof config.area.y !== 'number' ||
            config.area.width <= 0 || config.area.height <= 0) {
            throw new Error('Invalid area configuration');
        }
        if (config.area.x < 0 || config.area.y < 0) {
            throw new Error('Invalid area configuration: x and y must be non-negative');
        }
        if (!config.ocr || config.ocr.confidence < 0 || config.ocr.confidence > 1) {
            throw new Error('Invalid OCR configuration');
        }
        const validEngines = ['simple', 'tesseract', 'windows-ocr'];
        if (!config.ocr.engine || !validEngines.includes(config.ocr.engine)) {
            throw new Error(`Invalid OCR engine: must be one of ${validEngines.join(', ')}`);
        }
        if (!config.click || !['left', 'right', 'middle'].includes(config.click.button)) {
            throw new Error('Invalid click configuration');
        }
        if (!config.refreshRate || config.refreshRate <= 0 || config.refreshRate > 60000) {
            throw new Error('Invalid refresh rate (must be between 1ms and 60s)');
        }
    }
    async runMainLoop(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session || session.status !== 'running') {
            return;
        }
        const { config } = session;
        const maxIterations = config.maxIterations || -1; // -1 = infinite
        let iteration = 0;
        console.log(`🔄 Starting main loop for session ${sessionId}`);
        while (session.status === 'running' && (maxIterations === -1 || iteration < maxIterations)) {
            try {
                iteration++;
                console.log(`🔄 Session ${sessionId} - Iteration ${iteration}`);
                // Step 1: Capture screen
                const captureResult = await this.screenCapture.capture(config.area);
                if (!captureResult.success) {
                    throw new Error(`Screen capture failed: ${captureResult.error}`);
                }
                this.emit('screen_captured', { sessionId, iteration, timestamp: captureResult.timestamp });
                // Step 2: Perform OCR
                const ocrResult = await this.ocrEngine.recognize(captureResult.imageData, config.ocr);
                if (!ocrResult.success) {
                    throw new Error(`OCR failed: ${ocrResult.error}`);
                }
                this.emit('ocr_completed', { sessionId, iteration, text: ocrResult.text, confidence: ocrResult.confidence });
                // Step 3: Check if target pattern found
                const shouldClick = this.shouldClick(ocrResult, config.targetPattern);
                if (shouldClick) {
                    // Step 4: Perform click
                    const clickResult = await this.mouseControl.click(config.click);
                    if (clickResult.success) {
                        session.totalClicks++;
                        session.lastClickTime = clickResult.timestamp;
                        this.emit('click_performed', {
                            sessionId,
                            iteration,
                            coordinates: clickResult.coordinates,
                            totalClicks: session.totalClicks
                        });
                        console.log(`✅ Click ${session.totalClicks} at (${clickResult.coordinates.x}, ${clickResult.coordinates.y})`);
                    }
                    else {
                        throw new Error(`Click failed: ${clickResult.error}`);
                    }
                }
                // Step 5: Wait for next iteration
                if (session.status === 'running') {
                    await new Promise(resolve => setTimeout(resolve, config.refreshRate));
                }
            }
            catch (error) {
                console.error(`❌ Loop error in session ${sessionId}:`, error);
                session.error = error instanceof Error ? error.message : 'Unknown error';
                this.emit('error', { sessionId, error: session.error, iteration });
                // Decide whether to continue or stop
                if (session.error.includes('critical')) {
                    break;
                }
            }
        }
        console.log(`🏁 Main loop completed for session ${sessionId}`);
        if (session.status === 'running') {
            await this.stop(sessionId);
        }
    }
    shouldClick(ocrResult, targetPattern) {
        if (!targetPattern) {
            // If no pattern specified, click on any detected text
            return ocrResult.text.trim().length > 0;
        }
        // Check if target pattern is found in OCR result
        const text = ocrResult.text.toLowerCase();
        const pattern = targetPattern.toLowerCase();
        return text.includes(pattern) ||
            text.match(new RegExp(pattern, 'i')) !== null;
    }
    getSession(sessionId) {
        return this.sessions.get(sessionId);
    }
    getAllSessions() {
        return Array.from(this.sessions.values());
    }
    getActiveSessions() {
        return Array.from(this.sessions.values()).filter(s => s.status === 'running');
    }
    async getStatus() {
        const sessions = this.getAllSessions();
        const activeSessions = this.getActiveSessions();
        const totalClicks = sessions.reduce((sum, s) => sum + s.totalClicks, 0);
        const uptime = sessions.length > 0 ? Date.now() - Math.min(...sessions.map(s => s.startTime)) : 0;
        return {
            totalSessions: sessions.length,
            activeSessions: activeSessions.length,
            totalClicks,
            uptime
        };
    }
    // Test method to verify all components work
    async testComponents() {
        console.log('🧪 Testing auto-clicker components...');
        try {
            // Test screen capture
            const captureResult = await this.screenCapture.capture({
                x: 0, y: 0, width: 100, height: 100
            });
            const screenCaptureWorks = captureResult.success;
            // Test OCR (with dummy data)
            const ocrResult = await this.ocrEngine.recognize(Buffer.from('dummy image data'), { engine: 'simple', language: ['eng'], confidence: 0.5 });
            const ocrWorks = ocrResult.success;
            // Test mouse control
            const mouseWorks = await this.mouseControl.testClick();
            const overall = screenCaptureWorks && ocrWorks && mouseWorks;
            console.log(`🧪 Test Results: ScreenCapture=${screenCaptureWorks}, OCR=${ocrWorks}, Mouse=${mouseWorks}, Overall=${overall}`);
            return {
                screenCapture: screenCaptureWorks,
                ocr: ocrWorks,
                mouseControl: mouseWorks,
                overall
            };
        }
        catch (error) {
            console.error('❌ Component test failed:', error);
            return {
                screenCapture: false,
                ocr: false,
                mouseControl: false,
                overall: false
            };
        }
    }
}
exports.AutoClickerEngine = AutoClickerEngine;
// Export for CommonJS
module.exports = { AutoClickerEngine };
