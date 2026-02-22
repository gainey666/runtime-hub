/**
 * Type tests for PropertyPanel component
 * Ensures all props are properly typed
 */

import { PropertyPanel } from '../src/ui/components/NodeEditor/PropertyPanel';
import { WorkflowNode } from '../architecture/contracts/ui-interfaces';

// Test that PropertyPanel accepts correct props
const testPropertyPanel = (
  <PropertyPanel
    selectedNode={null}
    onUpdateNode={(nodeId: string, updates: Partial<WorkflowNode>) => {}}
    onValidateConfig={async (nodeType: string, config: Record<string, any>) => true}
  />
);

// Test that PropertyPanel requires all required props
// @ts-expect-error - Missing required props
const testMissingProps = <PropertyPanel />;

// Test that PropertyPanel rejects invalid types
// @ts-expect-error - selectedNode should be WorkflowNode | null
const testInvalidSelectedNode = (
  <PropertyPanel
    selectedNode="invalid"
    onUpdateNode={(nodeId: string, updates: Partial<WorkflowNode>) => {}}
    onValidateConfig={async (nodeType: string, config: Record<string, any>) => true}
  />
);

// Test that PropertyPanel rejects invalid onUpdateNode
// @ts-expect-error - onUpdateNode should be function
const testInvalidOnUpdateNode = (
  <PropertyPanel
    selectedNode={null}
    onUpdateNode="invalid"
    onValidateConfig={async (nodeType: string, config: Record<string, any>) => true}
  />
);

// Test that PropertyPanel rejects invalid onValidateConfig
// @ts-expect-error - onValidateConfig should be async function
const testInvalidOnValidateConfig = (
  <PropertyPanel
    selectedNode={null}
    onUpdateNode={(nodeId: string, updates: Partial<WorkflowNode>) => {}}
    onValidateConfig="invalid"
  />
);

export {};
