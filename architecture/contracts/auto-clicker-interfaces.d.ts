/**
 * Auto-Clicker System Interface Contracts
 * Defines all interfaces for auto-clicker restoration
 */

// ============================================================================
// CORE AUTO-CLICKER INTERFACES
// ============================================================================

export interface ScreenCaptureConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  format?: 'png' | 'jpg' | 'bmp';
  quality?: number;
}

export interface OCRConfig {
  engine: 'tesseract' | 'easyocr' | 'custom';
  language: string[];
  confidence: number;
  patterns?: string[];
}

export interface ClickConfig {
  button: 'left' | 'right' | 'middle';
  clickType: 'single' | 'double' | 'hold';
  duration?: number;
  coordinates?: { x: number; y: number };
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

export interface AutoClickerConfig {
  area: ScreenCaptureConfig;
  ocr: OCRConfig;
  click: ClickConfig;
  refreshRate: number;
  targetPattern?: string;
  maxIterations?: number;
  name?: string;
}

// ============================================================================
// SCREEN CAPTURE INTERFACES
// ============================================================================

export interface ScreenCaptureResult {
  success: boolean;
  imageData: Buffer;
  timestamp: number;
  dimensions: { width: number; height: number };
  error?: string;
}

export interface IScreenCapture {
  capture(config: ScreenCaptureConfig): Promise<ScreenCaptureResult>;
  getScreenSize(): Promise<{ width: number; height: number }>;
  validateArea(config: ScreenCaptureConfig): boolean;
}

// ============================================================================
// OCR ENGINE INTERFACES
// ============================================================================

export interface OCRResult {
  success: boolean;
  text: string;
  confidence: number;
  boundingBoxes: BoundingBox[];
  timestamp: number;
  error?: string;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  confidence: number;
}

export interface IOCREngine {
  recognize(imageData: Buffer, config: OCRConfig): Promise<OCRResult>;
  setLanguage(language: string[]): void;
  getSupportedLanguages(): string[];
}

// ============================================================================
// MOUSE CONTROL INTERFACES
// ============================================================================

export interface ClickResult {
  success: boolean;
  coordinates: { x: number; y: number };
  timestamp: number;
  button: string;
  error?: string;
}

export interface IMouseControl {
  move(x: number, y: number): Promise<void>;
  click(config: ClickConfig): Promise<ClickResult>;
  getPosition(): Promise<{ x: number; y: number }>;
  setCursor(cursor: 'default' | 'crosshair' | 'hand'): void;
}

// ============================================================================
// DETECTION INTERFACES
// ============================================================================

export interface DetectionResult {
  found: boolean;
  matches: DetectedMatch[];
  timestamp: number;
  error?: string;
}

export interface DetectedMatch {
  text: string;
  confidence: number;
  boundingBox: BoundingBox;
  coordinates: { x: number; y: number };
}

export interface IDetectionEngine {
  findText(ocrResult: OCRResult, pattern: string): DetectionResult;
  findPattern(ocrResult: OCRResult, pattern: RegExp): DetectionResult;
  compareImages(image1: Buffer, image2: Buffer): Promise<number>;
}

// ============================================================================
// LOGGING INTERFACES
// ============================================================================

export interface LogEntry {
  id: string;
  timestamp: number;
  level: 'debug' | 'info' | 'warn' | 'error';
  source: string;
  message: string;
  metadata?: Record<string, any>;
  sessionId?: string;
}

export interface LogFilter {
  level?: LogEntry['level'];
  source?: string;
  sessionId?: string;
  since?: number;
  until?: number;
}

export interface ILogBroadcaster {
  log(entry: LogEntry): void;
  subscribe(callback: (entry: LogEntry) => void): string;
  unsubscribe(subscriptionId: string): void;
  getLogs(filter?: LogFilter): LogEntry[];
  clearLogs(): void;
}

// ============================================================================
// API INTERFACES
// ============================================================================

export interface AutoClickerAPIRequest {
  action: 'start' | 'stop' | 'pause' | 'resume' | 'status';
  config?: AutoClickerConfig;
  sessionId?: string;
}

export interface AutoClickerAPIResponse {
  success: boolean;
  sessionId?: string;
  status?: string;
  config?: AutoClickerConfig;
  error?: string;
  timestamp: number;
}

export interface AutoClickerStatusResponse {
  success: boolean;
  sessions: AutoClickerSession[];
  activeCount: number;
  totalClicks: number;
  uptime: number;
  error?: string;
}

// ============================================================================
// EVENT INTERFACES
// ============================================================================

export interface AutoClickerEvent {
  type: 'session_started' | 'session_stopped' | 'click_performed' | 'error' | 'status_update';
  sessionId: string;
  timestamp: number;
  data: any;
}

export interface WorkflowEvent {
  type: 'workflow_started' | 'workflow_completed' | 'node_started' | 'node_completed' | 'error';
  workflowId: string;
  nodeId?: string;
  timestamp: number;
  data: any;
}

export interface SystemEvent {
  type: 'auto_clicker' | 'workflow' | 'system';
  event: AutoClickerEvent | WorkflowEvent | LogEntry;
}

// ============================================================================
// NODE EDITOR INTEGRATION INTERFACES
// ============================================================================

export interface AutoClickerNodeConfig {
  type: 'auto_clicker_start' | 'generate_location' | 'click_loop' | 'stop_clicker' | 'monitor_status';
  area?: ScreenCaptureConfig;
  ocr?: OCRConfig;
  click?: ClickConfig;
  refreshRate?: number;
  maxIterations?: number;
  appId?: string;
}

export interface NodeExecutionResult {
  success: boolean;
  outputs: Record<string, any>;
  error?: string;
  executionTime: number;
}

export interface IAutoClickerNodeExecutor {
  execute(config: AutoClickerNodeConfig, inputs: Record<string, any>): Promise<NodeExecutionResult>;
  validate(config: AutoClickerNodeConfig): boolean;
  getRequiredInputs(nodeType: string): string[];
  getOutputs(nodeType: string): string[];
}

// ============================================================================
// VISUAL MONITORING INTERFACES
// ============================================================================

export interface MonitorDisplayConfig {
  refreshRate: number;
  maxLogEntries: number;
  showTimestamps: boolean;
  showSources: boolean;
  logLevels: LogEntry['level'][];
  autoScroll: boolean;
}

export interface MonitorState {
  sessions: AutoClickerSession[];
  recentLogs: LogEntry[];
  systemStatus: 'healthy' | 'warning' | 'error';
  lastUpdate: number;
  config: MonitorDisplayConfig;
}

export interface IVisualMonitor {
  updateState(state: Partial<MonitorState>): void;
  getSession(sessionId: string): AutoClickerSession | undefined;
  getRecentLogs(count: number): LogEntry[];
  setConfig(config: Partial<MonitorDisplayConfig>): void;
  exportLogs(filter?: LogFilter): LogEntry[];
}

// ============================================================================
// ERROR HANDLING INTERFACES
// ============================================================================

export interface AutoClickerError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: number;
  sessionId?: string;
  recoverable: boolean;
}

export interface IErrorHandler {
  handleError(error: AutoClickerError): void;
  registerRecoveryStrategy(errorCode: string, strategy: () => Promise<boolean>): void;
  getErrorHistory(): AutoClickerError[];
  clearErrors(): void;
}

// ============================================================================
// COMMONJS MODULE DECLARATIONS (FIXED FOR MODULE SYSTEM)
// ============================================================================

declare module './screen-capture/windows-capture' {
  class WindowsScreenCapture {
    constructor();
    capture(config: ScreenCaptureConfig): Promise<ScreenCaptureResult>;
    getScreenSize(): Promise<{ width: number; height: number }>;
    validateArea(config: ScreenCaptureConfig): boolean;
  }
  export = WindowsScreenCapture;
}

declare module './screen-capture/ocr-engine' {
  class OCREngine {
    constructor();
    recognize(imageData: Buffer, config: OCRConfig): Promise<OCRResult>;
    setLanguage(language: string[]): void;
    getSupportedLanguages(): string[];
  }
  export = OCREngine;
}

declare module './click-automation/mouse-control' {
  class MouseControl {
    constructor();
    move(x: number, y: number): Promise<void>;
    click(config: ClickConfig): Promise<ClickResult>;
    getPosition(): Promise<{ x: number; y: number }>;
    setCursor(cursor: 'default' | 'crosshair' | 'hand'): void;
    testClick(): Promise<boolean>;
  }
  export = MouseControl;
}
