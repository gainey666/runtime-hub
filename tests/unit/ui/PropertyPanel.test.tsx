/**
 * Unit Tests for PropertyPanel Component
 * Tests component behavior, props, and interactions
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PropertyPanel } from '../../../src/ui/components/NodeEditor/PropertyPanel';
import { WorkflowNode } from '../../../architecture/contracts/ui-interfaces';

// Mock workflow node for testing
const mockNode: WorkflowNode = {
  id: 'test-node-1',
  type: 'HTTP Request',
  name: 'Test HTTP Request',
  x: 100,
  y: 100,
  inputs: ['main'],
  outputs: ['main'],
  config: {
    url: 'https://api.example.com',
    method: 'GET',
    headers: '{"Content-Type": "application/json"}',
    timeout: 30000
  },
  status: 'idle'
};

describe('PropertyPanel Component', () => {
  const mockUpdateNode = jest.fn();
  const mockValidateConfig = jest.fn().mockResolvedValue(true);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders nothing when no node is selected', () => {
    render(
      <PropertyPanel
        selectedNode={null}
        onUpdateNode={mockUpdateNode}
        onValidateConfig={mockValidateConfig}
      />
    );

    expect(screen.getByText('Select a node to configure its properties')).toBeInTheDocument();
  });

  test('renders node information when node is selected', () => {
    render(
      <PropertyPanel
        selectedNode={mockNode}
        onUpdateNode={mockUpdateNode}
        onValidateConfig={mockValidateConfig}
      />
    );

    expect(screen.getByText('Properties')).toBeInTheDocument();
    expect(screen.getByText('Test HTTP Request')).toBeInTheDocument();
    expect(screen.getByText('Type: HTTP Request')).toBeInTheDocument();
    expect(screen.getByText('ID: test-node-1')).toBeInTheDocument();
    expect(screen.getByText('Position: (100, 100)')).toBeInTheDocument();
  });

  test('renders configuration fields for HTTP Request node', () => {
    render(
      <PropertyPanel
        selectedNode={mockNode}
        onUpdateNode={mockUpdateNode}
        onValidateConfig={mockValidateConfig}
      />
    );

    expect(screen.getByLabelText('URL')).toBeInTheDocument();
    expect(screen.getByLabelText('Method')).toBeInTheDocument();
    expect(screen.getByLabelText('Headers')).toBeInTheDocument();
    expect(screen.getByLabelText('Timeout')).toBeInTheDocument();
  });

  test('calls onUpdateNode when configuration changes', async () => {
    render(
      <PropertyPanel
        selectedNode={mockNode}
        onUpdateNode={mockUpdateNode}
        onValidateConfig={mockValidateConfig}
      />
    );

    const urlInput = screen.getByLabelText('URL');
    fireEvent.change(urlInput, { target: { value: 'https://new-api.example.com' } });

    await waitFor(() => {
      expect(mockUpdateNode).toHaveBeenCalledWith('test-node-1', {
        config: expect.objectContaining({
          url: 'https://new-api.example.com'
        })
      });
    });
  });

  test('calls onValidateConfig when configuration changes', async () => {
    render(
      <PropertyPanel
        selectedNode={mockNode}
        onUpdateNode={mockUpdateNode}
        onValidateConfig={mockValidateConfig}
      />
    );

    const urlInput = screen.getByLabelText('URL');
    fireEvent.change(urlInput, { target: { value: 'https://new-api.example.com' } });

    await waitFor(() => {
      expect(mockValidateConfig).toHaveBeenCalledWith('HTTP Request', expect.any(Object));
    });
  });

  test('shows validation errors when validation fails', async () => {
    mockValidateConfig.mockResolvedValue(false);

    render(
      <PropertyPanel
        selectedNode={mockNode}
        onUpdateNode={mockUpdateNode}
        onValidateConfig={mockValidateConfig}
      />
    );

    const urlInput = screen.getByLabelText('URL');
    fireEvent.change(urlInput, { target: { value: 'invalid-url' } });

    await waitFor(() => {
      expect(screen.getByText(/Error:/)).toBeInTheDocument();
    });
  });

  test('resets to default values when reset button is clicked', () => {
    render(
      <PropertyPanel
        selectedNode={mockNode}
        onUpdateNode={mockUpdateNode}
        onValidateConfig={mockValidateConfig}
      />
    );

    const resetButton = screen.getByText('Reset to Defaults');
    fireEvent.click(resetButton);

    expect(mockUpdateNode).toHaveBeenCalledWith('test-node-1', {
      config: expect.objectContaining({
        url: '',
        method: 'GET',
        headers: '{}',
        timeout: 30000
      })
    });
  });

  test('displays error state when node has error', () => {
    const nodeWithError = {
      ...mockNode,
      status: 'error' as const,
      error: 'Connection failed'
    };

    render(
      <PropertyPanel
        selectedNode={nodeWithError}
        onUpdateNode={mockUpdateNode}
        onValidateConfig={mockValidateConfig}
      />
    );

    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText('Connection failed')).toBeInTheDocument();
  });

  test('shows correct status indicator', () => {
    const testCases = [
      { status: 'idle', expectedColor: 'gray' },
      { status: 'running', expectedColor: 'green' },
      { status: 'paused', expectedColor: 'yellow' },
      { status: 'error', expectedColor: 'red' },
      { status: 'completed', expectedColor: 'blue' }
    ];

    testCases.forEach(({ status, expectedColor }) => {
      const node = { ...mockNode, status: status as any };
      
      const { rerender } = render(
        <PropertyPanel
          selectedNode={node}
          onUpdateNode={mockUpdateNode}
          onValidateConfig={mockValidateConfig}
        />
      );

      expect(screen.getByText(status.toUpperCase())).toBeInTheDocument();
      
      rerender(
        <PropertyPanel
          selectedNode={null}
          onUpdateNode={mockUpdateNode}
          onValidateConfig={mockValidateConfig}
        />
      );
    });
  });

  test('handles different node types', () => {
    const delayNode: WorkflowNode = {
      ...mockNode,
      type: 'Delay',
      config: {
        duration: 5000,
        unit: 'ms'
      }
    };

    render(
      <PropertyPanel
        selectedNode={delayNode}
        onUpdateNode={mockUpdateNode}
        onValidateConfig={mockValidateConfig}
      />
    );

    expect(screen.getByLabelText('Duration')).toBeInTheDocument();
    expect(screen.getByLabelText('Unit')).toBeInTheDocument();
  });

  test('accessibility: has proper ARIA labels', () => {
    render(
      <PropertyPanel
        selectedNode={mockNode}
        onUpdateNode={mockUpdateNode}
        onValidateConfig={mockValidateConfig}
      />
    );

    expect(screen.getByRole('region', { name: /properties/i })).toBeInTheDocument();
    expect(screen.getByLabelText('URL')).toHaveAttribute('aria-describedby');
  });

  test('accessibility: supports keyboard navigation', () => {
    render(
      <PropertyPanel
        selectedNode={mockNode}
        onUpdateNode={mockUpdateNode}
        onValidateConfig={mockValidateConfig}
      />
    );

    const urlInput = screen.getByLabelText('URL');
    urlInput.focus();
    expect(urlInput).toHaveFocus();

    fireEvent.keyDown(urlInput, { key: 'Tab' });
    const nextInput = screen.getByLabelText('Method');
    expect(nextInput).toHaveFocus();
  });
});
