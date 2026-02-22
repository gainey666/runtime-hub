/**
 * Main Node Editor Application
 * Entry point for the web-based node editor
 */

import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { PropertyPanel } from '../components/NodeEditor/PropertyPanel';
import { Toolbar } from '../components/Workflow/Toolbar';
import { ErrorDisplay } from '../components/Workflow/ErrorDisplay';
import { theme } from '../../design_tokens';
import { WorkflowNode, Workflow } from '../../../architecture/contracts/ui-interfaces';

const NodeEditorApp: React.FC = () => {
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [selectedNode, setSelectedNode] = useState<WorkflowNode | null>(null);
  const [errors, setErrors] = useState<Array<{
    nodeId?: string;
    nodeName?: string;
    error: Error;
    timestamp: Date;
    severity: 'error' | 'warning' | 'info';
    context?: any;
  }>>([]);
  const [workflowStatus, setWorkflowStatus] = useState<'idle' | 'running' | 'paused' | 'error'>('idle');
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Initialize workflow
  useEffect(() => {
    const initialWorkflow: Workflow = {
      id: 'main-workflow',
      name: 'Main Workflow',
      description: 'Primary workflow for node editor',
      nodes: [],
      connections: [],
      variables: {},
      status: 'idle',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setWorkflow(initialWorkflow);
  }, []);

  // WebSocket connection for real-time updates
  useEffect(() => {
    const socket = io();
    
    socket.on('workflow_update', (data: any) => {
      if (workflow && data.workflowId === workflow.id) {
        setWorkflow(prev => prev ? { ...prev, ...data } : null);
        setWorkflowStatus(data.status || 'idle');
      }
    });
    
    socket.on('node_update', (data: any) => {
      if (workflow) {
        setWorkflow(prev => {
          if (!prev) return null;
          return {
            ...prev,
            nodes: prev.nodes.map(node => 
              node.id === data.nodeId 
                ? { ...node, status: data.status, error: data.error }
                : node
            )
          };
        });
      }
    });
    
    socket.on('error', (data: any) => {
      setErrors(prev => [...prev, {
        nodeId: data.nodeId,
        nodeName: data.nodeName,
        error: new Error(data.message),
        timestamp: new Date(),
        severity: 'error',
        context: data.context
      }]);
    });

    return () => {
      socket.disconnect();
    };
  }, [workflow]);

  const handleUpdateNode = (nodeId: string, updates: Partial<WorkflowNode>) => {
    if (!workflow) return;
    
    setWorkflow(prev => {
      if (!prev) return null;
      return {
        ...prev,
        nodes: prev.nodes.map(node => 
          node.id === nodeId ? { ...node, ...updates } : node
        ),
        updatedAt: new Date()
      };
    });
  };

  const handleValidateConfig = async (nodeType: string, config: Record<string, any>): Promise<boolean> => {
    // Simulate validation
    return true;
  };

  const handleStartWorkflow = () => {
    setWorkflowStatus('running');
    // Emit start event via WebSocket
    console.log('Starting workflow:', workflow?.id);
  };

  const handleStopWorkflow = () => {
    setWorkflowStatus('idle');
    // Emit stop event via WebSocket
    console.log('Stopping workflow:', workflow?.id);
  };

  const handlePauseWorkflow = () => {
    setWorkflowStatus('paused');
    // Emit pause event via WebSocket
    console.log('Pausing workflow:', workflow?.id);
  };

  const handleStepWorkflow = () => {
    // Emit step event via WebSocket
    console.log('Stepping workflow:', workflow?.id);
  };

  const handleUndo = () => {
    // Implement undo logic
    console.log('Undo action');
  };

  const handleRedo = () => {
    // Implement redo logic
    console.log('Redo action');
  };

  const handleSave = async () => {
    // Implement save logic
    console.log('Saving workflow:', workflow?.id);
  };

  const handleLoad = () => {
    // Implement load logic
    console.log('Loading workflow');
  };

  const handleClearError = (index: number) => {
    setErrors(prev => prev.filter((_, i) => i !== index));
  };

  const handleClearAllErrors = () => {
    setErrors([]);
  };

  const handleRetryNode = (nodeId: string) => {
    // Implement retry logic
    console.log('Retrying node:', nodeId);
  };

  const handleGoToNode = (nodeId: string) => {
    // Find and select the node
    if (workflow) {
      const node = workflow.nodes.find(n => n.id === nodeId);
      if (node) {
        setSelectedNode(node);
      }
    }
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: theme.colors.neutral[50] }}>
      {/* Toolbar */}
      <Toolbar
        workflowStatus={workflowStatus}
        onStart={handleStartWorkflow}
        onStop={handleStopWorkflow}
        onPause={handlePauseWorkflow}
        onStep={handleStepWorkflow}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onSave={handleSave}
        onLoad={handleLoad}
        canUndo={canUndo}
        canRedo={canRedo}
      />

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Node Editor Canvas */}
        <div style={{ flex: 1, position: 'relative', backgroundColor: theme.colors.neutral[100] }}>
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            color: theme.colors.neutral[500]
          }}>
            <h2 style={{ fontSize: theme.typography.fontSize['2xl'], fontWeight: theme.typography.fontWeight.semibold }}>
              Node Editor Canvas
            </h2>
            <p style={{ fontSize: theme.typography.fontSize.base, marginTop: theme.spacing[2] }}>
              Drag nodes from the palette to start building your workflow
            </p>
            {workflow && (
              <p style={{ fontSize: theme.typography.fontSize.sm, marginTop: theme.spacing[1] }}>
                Current workflow: {workflow.name} ({workflow.nodes.length} nodes)
              </p>
            )}
          </div>
        </div>

        {/* Property Panel */}
        <PropertyPanel
          selectedNode={selectedNode}
          onUpdateNode={handleUpdateNode}
          onValidateConfig={handleValidateConfig}
        />
      </div>

      {/* Error Display */}
      {errors.length > 0 && (
        <div style={{ position: 'fixed', bottom: theme.spacing[4], right: theme.spacing[4], width: '400px', maxHeight: '300px' }}>
          <ErrorDisplay
            errors={errors}
            onClearError={handleClearError}
            onClearAllErrors={handleClearAllErrors}
            onRetryNode={handleRetryNode}
            onGoToNode={handleGoToNode}
          />
        </div>
      )}
    </div>
  );
};

// Initialize the app
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<NodeEditorApp />);
}

export default NodeEditorApp;
