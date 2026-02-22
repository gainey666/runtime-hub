/**
 * Utility Types for Runtime Hub
 * Common type patterns and helpers
 */

import { Workflow } from './index';

// Basic utility types
export type Partial<T> = {
  [P in keyof T]?: T[P];
};

export type Required<T> = {
  [P in keyof T]-?: T[P];
};

export type Readonly<T> = {
  readonly [P in keyof T]: T[P];
};

// Workflow utility types
export type WorkflowStatus = 'idle' | 'running' | 'completed' | 'failed' | 'stopped';

export type NodeStatus = 'pending' | 'running' | 'completed' | 'failed';

export type EventType = 'nodeStarted' | 'nodeCompleted' | 'workflowStarted' | 'workflowCompleted' | 'workflowError' | 'workflowStopped';

// Discriminated unions
export type WorkflowResult = 
  | { status: 'completed'; workflow: Workflow; duration: number }
  | { status: 'failed'; workflow: Workflow; error: string }
  | { status: 'stopped'; workflow: Workflow };

export type NodeResult = 
  | { status: 'completed'; data?: any }
  | { status: 'failed'; error: string };

// Helper types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

export type Pick<T, K extends keyof T> = {
  [P in K]: T[P];
};

// Function types
export type EventHandler<T> = (event: T) => void;
export type AsyncEventHandler<T> = (event: T) => Promise<void>;

// Configuration types
export type ConfigValue = string | number | boolean | object;
export type ConfigSection = Record<string, ConfigValue>;

// API response types
export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
};

// Database types
export type DatabaseRecord = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  [key: string]: any;
};

// Event emitter types
export type EventMap = {
  [K: string]: any;
};

export type EventListener<T extends keyof EventMap> = (
  event: T,
  listener: (data: EventMap[T]) => void
) => void;

// Type guards
export function isWorkflowCompleted(result: WorkflowResult): result is WorkflowResult & { status: 'completed' } {
  return result.status === 'completed';
}

export function isWorkflowFailed(result: WorkflowResult): result is WorkflowResult & { status: 'failed' } {
  return result.status === 'failed';
}

export function isNodeCompleted(result: NodeResult): result is NodeResult & { status: 'completed' } {
  return result.status === 'completed';
}

export function isNodeFailed(result: NodeResult): result is NodeResult & { status: 'failed' } {
  return result.status === 'failed';
}
