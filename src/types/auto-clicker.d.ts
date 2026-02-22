/**
 * Auto-Clicker Type Definitions
 * Fixing the broken type system
 */

// ============================================================================
// CORE AUTO-CLICKER TYPES
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
  engine: 'tesseract' | 'easyocr' | 'simple' | 'regex';
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
// SCREEN CAPTURE TYPES
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
// OCR ENGINE TYPES
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
// MOUSE CONTROL TYPES
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
// EVENT TYPES
// ============================================================================

export interface AutoClickerEvent {
  type: 'session_started' | 'session_stopped' | 'click_performed' | 'error' | 'status_update' | 'screen_captured' | 'ocr_completed';
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

// ============================================================================
// API TYPES
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
// NODE EDITOR TYPES
// ============================================================================

export interface NodeEditorNode {
  id: string;
  type: string;
  category: string;
  x: number;
  y: number;
  inputs: NodePort[];
  outputs: NodePort[];
  config: Record<string, any>;
}

export interface NodePort {
  name: string;
  type: string;
  value?: any;
}

export interface Connection {
  id: string;
  source: string;
  sourcePort: string;
  target: string;
  targetPort: string;
}

export interface Workflow {
  id: string;
  name: string;
  nodes: NodeEditorNode[];
  connections: Connection[];
  config: Record<string, any>;
}

// ============================================================================
// UI TYPES
// ============================================================================

export interface Theme {
  colors: {
    neutral: Record<string, string>;
    primary: Record<string, string>;
    secondary: Record<string, string>;
    success: Record<string, string>;
    warning: Record<string, string>;
    error: Record<string, string>;
  };
  typography: {
    fontSize: Record<string, string>;
    fontWeight: Record<string, string>;
    fontFamily: Record<string, string>;
  };
  spacing: Record<string, number>;
  borderRadius: Record<string, number>;
  shadows: Record<string, string>;
}

export interface UIState {
  selectedNode: NodeEditorNode | null;
  workflow: Workflow | null;
  errors: UIError[];
  status: 'idle' | 'running' | 'paused' | 'error';
  theme: Theme;
}

export interface UIError {
  id: string;
  type: 'error' | 'warning' | 'info';
  message: string;
  nodeId?: string;
  timestamp: number;
  stack?: string;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RequiredKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;

// ============================================================================
// MODULE DECLARATIONS
// ============================================================================

declare module '*.png' {
  const value: string;
  export default value;
}

declare module '*.jpg' {
  const value: string;
  export default value;
}

declare module '*.json' {
  const value: any;
  export default value;
}

// ============================================================================
// GLOBAL TYPES
// ============================================================================

declare global {
  interface Window {
    __AUTO_CLICKER_STATE__?: {
      sessions: Map<string, AutoClickerSession>;
      events: AutoClickerEvent[];
    };
  }
}

export {};
