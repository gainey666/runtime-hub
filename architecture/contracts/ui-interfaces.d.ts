// UI Interface Contracts
// Defines the contracts between UI components and services

// === CORE TYPES ===

export interface WorkflowNode {
  id: string;
  type: string;
  name: string;
  x: number;
  y: number;
  inputs: string[];
  outputs: string[];
  config: Record<string, any>;
  status: 'idle' | 'running' | 'completed' | 'error';
  error?: string;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  nodes: WorkflowNode[];
  connections: Connection[];
  variables: Record<string, any>;
  status: 'idle' | 'running' | 'completed' | 'error';
  createdAt: Date;
  updatedAt: Date;
}

export interface Connection {
  id: string;
  from: { nodeId: string; portIndex: number };
  to: { nodeId: string; portIndex: number };
  status: 'active' | 'inactive';
}

// === UI COMPONENT INTERFACES ===

export interface NodeEditorComponent {
  // Canvas operations
  addNode(node: WorkflowNode): void;
  removeNode(nodeId: string): void;
  updateNode(nodeId: string, updates: Partial<WorkflowNode>): void;
  selectNode(nodeId: string): void;
  deselectAll(): void;
  
  // Connection operations
  addConnection(connection: Connection): void;
  removeConnection(connectionId: string): void;
  
  // Canvas navigation
  zoom(scale: number): void;
  pan(dx: number, dy: number): void;
  fitToScreen(): void;
  
  // Events
  on(event: string, callback: Function): void;
  off(event: string, callback: Function): void;
  emit(event: string, data: any): void;
}

export interface PropertyPanelComponent {
  // Node configuration
  setNode(node: WorkflowNode): void;
  updateProperty(property: string, value: any): void;
  validateProperty(property: string, value: any): boolean;
  
  // UI state
  show(): void;
  hide(): void;
  isVisible(): boolean;
  
  // Events
  onPropertyChange(property: string, value: any): void;
  onValidationResult(property: string, isValid: boolean): void;
}

export interface ToolbarComponent {
  // Workflow execution
  startWorkflow(): void;
  stopWorkflow(): void;
  pauseWorkflow(): void;
  stepWorkflow(): void;
  
  // Editing operations
  undo(): void;
  redo(): void;
  save(): void;
  load(): void;
  
  // UI state
  setExecutionState(state: 'idle' | 'running' | 'paused' | 'error'): void;
  enableUndo(enabled: boolean): void;
  enableRedo(enabled: boolean): void;
  
  // Events
  onStart(): void;
  onStop(): void;
  onPause(): void;
  onStep(): void;
}

export interface StatusPanelComponent {
  // Status display
  updateWorkflowStatus(status: Workflow['status']): void;
  updateNodeStatus(nodeId: string, status: WorkflowNode['status']): void;
  updateProgress(current: number, total: number): void;
  
  // Error display
  showError(error: Error, nodeId?: string): void;
  clearErrors(): void;
  
  // Metrics
  updateMetrics(metrics: {
    executionTime: number;
    nodesCompleted: number;
    errorsCount: number;
  }): void;
}

// === SERVICE INTERFACES ===

export interface WorkflowService {
  // CRUD operations
  createWorkflow(workflow: Omit<Workflow, 'id' | 'createdAt' | 'updatedAt'>): Promise<Workflow>;
  getWorkflow(id: string): Promise<Workflow>;
  updateWorkflow(id: string, updates: Partial<Workflow>): Promise<Workflow>;
  deleteWorkflow(id: string): Promise<void>;
  listWorkflows(): Promise<Workflow[]>;
  
  // Execution
  executeWorkflow(id: string): Promise<{ workflowId: string; sessionId: string }>;
  stopWorkflow(id: string): Promise<void>;
  pauseWorkflow(id: string): Promise<void>;
  getWorkflowStatus(id: string): Promise<Workflow>;
  
  // Real-time
  onWorkflowUpdate(callback: (workflow: Workflow) => void): void;
  onNodeUpdate(callback: (nodeId: string, status: WorkflowNode['status']) => void): void;
}

export interface NodeService {
  // Node operations
  createNode(type: string, config: Record<string, any>): Promise<WorkflowNode>;
  updateNode(id: string, updates: Partial<WorkflowNode>): Promise<WorkflowNode>;
  deleteNode(id: string): Promise<void>;
  
  // Configuration
  getNodeTypes(): Promise<NodeType[]>;
  validateNodeConfig(type: string, config: Record<string, any>): Promise<boolean>;
  
  // Execution
  executeNode(nodeId: string, workflowId: string): Promise<any>;
  getNodeExecutionHistory(nodeId: string): Promise<ExecutionRecord[]>;
}

export interface AutoClickerService {
  // Auto-clicker management
  startAutoClicker(config: AutoClickerConfig): Promise<{ sessionId: string }>;
  stopAutoClicker(sessionId: string): Promise<void>;
  getAutoClickerStatus(sessionId: string): Promise<AutoClickerStatus>;
  
  // Universal setup
  setupForApp(appInfo: AppInfo): Promise<{ workflowId: string }>;
  removeApp(appId: string): Promise<void>;
  
  // Real-time
  onAutoClickerUpdate(callback: (status: AutoClickerStatus) => void): void;
  onClickDetected(callback: (click: ClickEvent) => void): void;
}

// === SUPPORTING TYPES ===

export interface NodeType {
  name: string;
  category: string;
  description: string;
  icon: string;
  color: string;
  inputs: PortDefinition[];
  outputs: PortDefinition[];
  config: ConfigDefinition[];
}

export interface PortDefinition {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

export interface ConfigDefinition {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'textarea';
  required: boolean;
  default: any;
  description: string;
  options?: string[]; // for select type
  validation?: ValidationRule;
}

export interface ValidationRule {
  pattern?: string;
  min?: number;
  max?: number;
  custom?: (value: any) => boolean;
}

export interface ExecutionRecord {
  timestamp: Date;
  nodeId: string;
  status: WorkflowNode['status'];
  result?: any;
  error?: string;
  duration: number;
}

export interface AutoClickerConfig {
  area: { x: number; y: number; width: number; height: number };
  targetPattern: string;
  confidence: number;
  clickAction: 'left' | 'right' | 'double';
  refreshRate: number;
  name: string;
}

export interface AutoClickerStatus {
  sessionId: string;
  isRunning: boolean;
  totalClicks: number;
  lastDetection?: string;
  uptime: number;
  averageConfidence: number;
  error?: string;
}

export interface AppInfo {
  id: string;
  name: string;
  type: string;
  version: string;
  config: Record<string, any>;
  connectedAt: Date;
}

export interface ClickEvent {
  sessionId: string;
  text: string;
  confidence: number;
  timestamp: number;
  coordinates: { x: number; y: number };
}

// === EVENT TYPES ===

export interface UIEvents {
  'node:selected': { nodeId: string };
  'node:deselected': { nodeId: string };
  'node:moved': { nodeId: string; x: number; y: number };
  'node:configured': { nodeId: string; config: Record<string, any> };
  'connection:created': { connection: Connection };
  'connection:deleted': { connectionId: string };
  'workflow:started': { workflowId: string };
  'workflow:stopped': { workflowId: string };
  'workflow:paused': { workflowId: string };
  'error:occurred': { error: Error; nodeId?: string };
  'canvas:zoomed': { scale: number };
  'canvas:panned': { dx: number; dy: number };
}
