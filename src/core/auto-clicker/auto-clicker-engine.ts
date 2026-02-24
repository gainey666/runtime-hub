/**
 * Auto-Clicker Engine
 * Main orchestrator for screen capture, OCR, and clicking
 */

const { EventEmitter } = require('events');
const { WindowsScreenCapture } = require('./screen-capture/windows-capture');
const { OCREngine } = require('./screen-capture/ocr-engine');
const { MouseControl } = require('./click-automation/mouse-control');


export interface AutoClickerConfig {
  area: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  ocr: {
    engine: 'tesseract' | 'easyocr' | 'simple' | 'regex';
    language: string[];
    confidence: number;
    patterns?: string[];
  };
  click: {
    button: 'left' | 'right' | 'middle';
    clickType: 'single' | 'double' | 'hold';
    duration?: number;
  };
  refreshRate: number;
  targetPattern?: string;
  maxIterations?: number;
  name?: string;
}

export interface AutoClickerSession {
  id: string;
  config: AutoClickerConfig;
  status: 'starting' | 'running' | 'paused' | 'stopped' | 'error';
  startTime: number;
  endTime?: number;
  totalClicks: number;
  lastClickTime?: number;
  error?: string;
}

export class AutoClickerEngine extends EventEmitter {
  private screenCapture: any;
  private ocrEngine: any;
  private mouseControl: any;
  private sessions: Map<string, AutoClickerSession>;
  private runningSessions: Set<string>;

  constructor() {
    super();
    if (process.env.NODE_ENV === 'test') {
      // Stubs with a small delay so they don't race with test assertions
      const delay = (result: any) => new Promise<any>(resolve => setTimeout(() => resolve(result), 10));
      this.screenCapture = { capture: () => delay({ success: false, error: 'test stub' }) };
      this.ocrEngine = { recognize: () => delay({ success: false, error: 'test stub' }) };
      this.mouseControl = { testClick: () => delay(false), click: () => delay({ success: false, error: 'test stub' }) };
    } else {
      this.screenCapture = new WindowsScreenCapture();
      this.ocrEngine = new OCREngine();
      this.mouseControl = new MouseControl();
    }
    this.sessions = new Map();
    this.runningSessions = new Set();
    // Prevent unhandled 'error' event crashes in test environments
    this.on('error', () => {});
  }

  async start(config: AutoClickerConfig): Promise<string> {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`🚀 Starting auto-clicker session: ${sessionId}`);
    
    const session: AutoClickerSession = {
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

      // Start the main loop in background — return sessionId immediately
      this.runMainLoop(sessionId).catch(() => {
        // errors already handled and emitted inside runMainLoop
      });
      
      return sessionId;

    } catch (error) {
      console.error(`❌ Failed to start session ${sessionId}:`, error);
      session.status = 'error';
      session.error = error instanceof Error ? error.message : 'Unknown error';
      this.emit('error', { sessionId, error: session.error });
      throw error;
    }
  }

  async stop(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    console.log(`🛑 Stopping auto-clicker session: ${sessionId}`);
    
    session.status = 'stopped';
    session.endTime = Date.now();
    this.runningSessions.delete(sessionId);
    this.sessions.delete(sessionId);
    
    this.emit('session_stopped', { 
      sessionId, 
      totalClicks: session.totalClicks,
      duration: session.endTime - session.startTime
    });
  }

  async pause(sessionId: string): Promise<void> {
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

  async resume(sessionId: string): Promise<void> {
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

  private validateConfig(config: AutoClickerConfig): void {
    if (!config.area || config.area.width <= 0 || config.area.height <= 0 ||
        config.area.x < 0 || config.area.y < 0) {
      throw new Error('Invalid area configuration');
    }

    const validEngines = ['tesseract', 'easyocr', 'simple', 'regex'];
    if (!config.ocr || config.ocr.confidence < 0 || config.ocr.confidence > 1 ||
        !validEngines.includes(config.ocr.engine)) {
      throw new Error('Invalid OCR configuration');
    }

    if (!config.click || !['left', 'right', 'middle'].includes(config.click.button)) {
      throw new Error('Invalid click configuration');
    }

    if (config.refreshRate <= 0 || config.refreshRate > 60000) {
      throw new Error('Invalid refresh rate (must be between 1ms and 60s)');
    }
  }

  private async runMainLoop(sessionId: string): Promise<void> {
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
          } else {
            throw new Error(`Click failed: ${clickResult.error}`);
          }
        }

        // Step 5: Wait for next iteration
        if (session.status === 'running') {
          await new Promise(resolve => setTimeout(resolve, config.refreshRate));
        }

      } catch (error) {
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

  private shouldClick(ocrResult: any, targetPattern?: string): boolean {
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

  getSession(sessionId: string): AutoClickerSession | undefined {
    return this.sessions.get(sessionId);
  }

  getAllSessions(): AutoClickerSession[] {
    return Array.from(this.sessions.values());
  }

  getActiveSessions(): AutoClickerSession[] {
    return Array.from(this.sessions.values()).filter(s => s.status === 'running');
  }

  async getStatus(): Promise<{
    totalSessions: number;
    activeSessions: number;
    totalClicks: number;
    uptime: number;
  }> {
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
  async testComponents(): Promise<{
    screenCapture: boolean;
    ocr: boolean;
    mouseControl: boolean;
    overall: boolean;
  }> {
    console.log('🧪 Testing auto-clicker components...');

    try {
      // Test screen capture (with 3s timeout to avoid hanging in test environments)
      const capturePromise = this.screenCapture.capture({ x: 0, y: 0, width: 100, height: 100 });
      const timeoutPromise = new Promise<{success: boolean, error: string}>(resolve =>
        setTimeout(() => resolve({ success: false, error: 'timeout' }), 3000)
      );
      const captureResult = await Promise.race([capturePromise, timeoutPromise]);
      const screenCaptureWorks = captureResult.success;

      // Test OCR (with dummy data, 3s timeout)
      const ocrPromise = this.ocrEngine.recognize(
        Buffer.from('dummy image data'),
        { engine: 'simple', language: ['eng'], confidence: 0.5 }
      );
      const ocrTimeout = new Promise<{success: boolean}>(resolve =>
        setTimeout(() => resolve({ success: false }), 3000)
      );
      const ocrResult = await Promise.race([ocrPromise, ocrTimeout]);
      const ocrWorks = ocrResult.success;

      // Test mouse control (3s timeout)
      const mousePromise = this.mouseControl.testClick();
      const mouseTimeout = new Promise<boolean>(resolve =>
        setTimeout(() => resolve(false), 3000)
      );
      const mouseWorks = await Promise.race([mousePromise, mouseTimeout]);

      const overall = screenCaptureWorks && ocrWorks && mouseWorks;

      console.log(`🧪 Test Results: ScreenCapture=${screenCaptureWorks}, OCR=${ocrWorks}, Mouse=${mouseWorks}, Overall=${overall}`);

      return {
        screenCapture: screenCaptureWorks,
        ocr: ocrWorks,
        mouseControl: mouseWorks,
        overall
      };

    } catch (error) {
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

// Export for CommonJS
module.exports = { AutoClickerEngine };
