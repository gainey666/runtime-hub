/**
 * Type-level tests for utility types
 * Ensuring type safety and correctness
 */

import { describe, test, expect } from '@jest/globals';
import { WorkflowResult, NodeResult, isWorkflowCompleted, isWorkflowFailed, isNodeCompleted, isNodeFailed } from '../../src/types/utility';

describe('Utility Types', () => {
  describe('Type Guards', () => {
    test('isWorkflowCompleted should correctly identify completed workflows', () => {
      const completed: WorkflowResult = {
        status: 'completed',
        workflow: {} as any,
        duration: 1000
      };

      const failed: WorkflowResult = {
        status: 'failed',
        workflow: {} as any,
        error: 'Test error'
      };

      expect(isWorkflowCompleted(completed)).toBe(true);
      expect(isWorkflowCompleted(failed)).toBe(false);
    });

    test('isWorkflowFailed should correctly identify failed workflows', () => {
      const completed: WorkflowResult = {
        status: 'completed',
        workflow: {} as any,
        duration: 1000
      };

      const failed: WorkflowResult = {
        status: 'failed',
        workflow: {} as any,
        error: 'Test error'
      };

      expect(isWorkflowFailed(completed)).toBe(false);
      expect(isWorkflowFailed(failed)).toBe(true);
    });

    test('isNodeCompleted should correctly identify completed nodes', () => {
      const completed: NodeResult = {
        status: 'completed',
        data: { result: 'success' }
      };

      const failed: NodeResult = {
        status: 'failed',
        error: 'Test error'
      };

      expect(isNodeCompleted(completed)).toBe(true);
      expect(isNodeCompleted(failed)).toBe(false);
    });

    test('isNodeFailed should correctly identify failed nodes', () => {
      const completed: NodeResult = {
        status: 'completed',
        data: { result: 'success' }
      };

      const failed: NodeResult = {
        status: 'failed',
        error: 'Test error'
      };

      expect(isNodeFailed(completed)).toBe(false);
      expect(isNodeFailed(failed)).toBe(true);
    });
  });

  describe('Type Compatibility', () => {
    test('WorkflowResult should have correct discriminant union shape', () => {
      const completed: WorkflowResult = {
        status: 'completed',
        workflow: {} as any,
        duration: 1000
      };

      const failed: WorkflowResult = {
        status: 'failed',
        workflow: {} as any,
        error: 'Test error'
      };

      const stopped: WorkflowResult = {
        status: 'stopped',
        workflow: {} as any
      };

      // Type narrowing should work
      if (isWorkflowCompleted(completed)) {
        expect(completed.duration).toBe(1000);
      }

      if (isWorkflowFailed(failed)) {
        expect(failed.error).toBe('Test error');
      }

      // Should have discriminant property
      expect(completed.status).toBe('completed');
      expect(failed.status).toBe('failed');
      expect(stopped.status).toBe('stopped');
    });

    test('NodeResult should have correct discriminant union shape', () => {
      const completed: NodeResult = {
        status: 'completed',
        data: { result: 'success' }
      };

      const failed: NodeResult = {
        status: 'failed',
        error: 'Test error'
      };

      // Type narrowing should work
      if (isNodeCompleted(completed)) {
        expect(completed.data?.result).toBe('success');
      }

      if (isNodeFailed(failed)) {
        expect(failed.error).toBe('Test error');
      }

      // Should have discriminant property
      expect(completed.status).toBe('completed');
      expect(failed.status).toBe('failed');
    });
  });

  describe('Utility Types', () => {
    test('Partial should make all properties optional', () => {
      interface TestType {
        required: string;
        optional?: number;
      }

      const partial: Partial<TestType> = {
        required: 'test'
      };

      expect(partial.required).toBe('test');
      expect(partial.optional).toBeUndefined();
    });

    test('Omit should exclude specified keys', () => {
      interface TestType {
        keep: string;
        remove: number;
      }

      const original: TestType = {
        keep: 'test',
        remove: 42
      };

      // Omit creates a new type, but the original object still has the property
      // This is a type-level operation, not runtime
      const omitted: Omit<TestType, 'remove'> = original;

      expect(omitted.keep).toBe('test');
      // At runtime, the property still exists, but TypeScript won't allow access
      expect('remove' in original).toBe(true);
    });

    test('Pick should include only specified keys', () => {
      interface TestType {
        keep: string;
        remove: number;
      }

      const original: TestType = {
        keep: 'test',
        remove: 42
      };

      // Pick creates a new type, but the original object still has the property
      // This is a type-level operation, not runtime
      const picked: Pick<TestType, 'keep'> = original;

      expect(picked.keep).toBe('test');
      // At runtime, the property still exists, but TypeScript won't allow access
      expect('remove' in original).toBe(true);
    });
  });
});
