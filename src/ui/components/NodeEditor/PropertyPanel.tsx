/**
 * Property Panel Component
 * Allows users to configure node properties in real-time
 */

import React, { useState, useEffect } from 'react';
import { WorkflowNode, ConfigDefinition } from '../../../architecture/contracts/ui-interfaces';

interface PropertyPanelProps {
  selectedNode: WorkflowNode | null;
  onUpdateNode: (nodeId: string, updates: Partial<WorkflowNode>) => void;
  onValidateConfig: (nodeType: string, config: Record<string, any>) => Promise<boolean>;
}

export const PropertyPanel: React.FC<PropertyPanelProps> = ({
  selectedNode,
  onUpdateNode,
  onValidateConfig
}) => {
  const [config, setConfig] = useState<Record<string, any>>({});
  const [validation, setValidation] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (selectedNode) {
      setConfig(selectedNode.config);
      setValidation({});
      setErrors({});
    }
  }, [selectedNode]);

  const handleConfigChange = async (property: string, value: any) => {
    if (!selectedNode) return;

    const newConfig = { ...config, [property]: value };
    setConfig(newConfig);

    // Validate the property
    try {
      const isValid = await onValidateConfig(selectedNode.type, newConfig);
      setValidation(prev => ({ ...prev, [property]: isValid }));
      
      if (isValid) {
        setErrors(prev => ({ ...prev, [property]: '' }));
        onUpdateNode(selectedNode.id, { config: newConfig });
      }
    } catch (error) {
      setErrors(prev => ({ ...prev, [property]: error.message }));
      setValidation(prev => ({ ...prev, [property]: false }));
    }
  };

  const renderConfigField = (definition: ConfigDefinition) => {
    const value = config[definition.name] ?? definition.default;
    const isValid = validation[definition.name];
    const error = errors[definition.name];

    switch (definition.type) {
      case 'string':
        return (
          <div key={definition.name} className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {definition.name}
              {definition.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              type="text"
              value={value}
              onChange={(e) => handleConfigChange(definition.name, e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isValid === false ? 'border-red-500' : isValid === true ? 'border-green-500' : 'border-gray-300'
              }`}
              placeholder={definition.description}
            />
            {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
            <p className="text-gray-500 text-xs mt-1">{definition.description}</p>
          </div>
        );

      case 'number':
        return (
          <div key={definition.name} className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {definition.name}
              {definition.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              type="number"
              value={value}
              onChange={(e) => handleConfigChange(definition.name, Number(e.target.value))}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isValid === false ? 'border-red-500' : isValid === true ? 'border-green-500' : 'border-gray-300'
              }`}
              placeholder={definition.description}
              min={definition.validation?.min}
              max={definition.validation?.max}
            />
            {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
            <p className="text-gray-500 text-xs mt-1">{definition.description}</p>
          </div>
        );

      case 'boolean':
        return (
          <div key={definition.name} className="mb-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={value}
                onChange={(e) => handleConfigChange(definition.name, e.target.checked)}
                className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-sm font-medium text-gray-700">
                {definition.name}
                {definition.required && <span className="text-red-500 ml-1">*</span>}
              </span>
            </label>
            <p className="text-gray-500 text-xs mt-1 ml-6">{definition.description}</p>
          </div>
        );

      case 'select':
        return (
          <div key={definition.name} className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {definition.name}
              {definition.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <select
              value={value}
              onChange={(e) => handleConfigChange(definition.name, e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isValid === false ? 'border-red-500' : isValid === true ? 'border-green-500' : 'border-gray-300'
              }`}
            >
              {definition.options?.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
            {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
            <p className="text-gray-500 text-xs mt-1">{definition.description}</p>
          </div>
        );

      case 'textarea':
        return (
          <div key={definition.name} className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {definition.name}
              {definition.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <textarea
              value={value}
              onChange={(e) => handleConfigChange(definition.name, e.target.value)}
              rows={4}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isValid === false ? 'border-red-500' : isValid === true ? 'border-green-500' : 'border-gray-300'
              }`}
              placeholder={definition.description}
            />
            {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
            <p className="text-gray-500 text-xs mt-1">{definition.description}</p>
          </div>
        );

      default:
        return null;
    }
  };

  if (!selectedNode) {
    return (
      <div className="w-80 bg-white border-l border-gray-200 p-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Properties</h3>
        <p className="text-gray-500 text-sm">Select a node to configure its properties</p>
      </div>
    );
  }

  // Get node type configuration (this would come from a service)
  const nodeTypeConfig = getNodeTypeConfig(selectedNode.type);

  return (
    <div className="w-80 bg-white border-l border-gray-200 p-4 overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Properties</h3>
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${
            selectedNode.status === 'running' ? 'bg-green-500' :
            selectedNode.status === 'error' ? 'bg-red-500' :
            selectedNode.status === 'completed' ? 'bg-blue-500' : 'bg-gray-400'
          }`} />
          <span className="text-sm text-gray-600">{selectedNode.status}</span>
        </div>
      </div>

      {/* Node Info */}
      <div className="mb-6 p-3 bg-gray-50 rounded-md">
        <h4 className="font-medium text-gray-700 mb-2">{selectedNode.name}</h4>
        <p className="text-sm text-gray-600 mb-1">Type: {selectedNode.type}</p>
        <p className="text-sm text-gray-600 mb-1">ID: {selectedNode.id}</p>
        <p className="text-sm text-gray-600">Position: ({selectedNode.x}, {selectedNode.y})</p>
      </div>

      {/* Configuration Fields */}
      <div className="space-y-4">
        <h4 className="font-medium text-gray-700">Configuration</h4>
        {nodeTypeConfig.map(renderConfigField)}
      </div>

      {/* Actions */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <button
          onClick={() => {
            // Reset to default config
            const defaultConfig = {};
            nodeTypeConfig.forEach(def => {
              defaultConfig[def.name] = def.default;
            });
            setConfig(defaultConfig);
            onUpdateNode(selectedNode.id, { config: defaultConfig });
          }}
          className="w-full px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Reset to Defaults
        </button>
      </div>

      {selectedNode.error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <h4 className="font-medium text-red-800 mb-1">Error</h4>
          <p className="text-sm text-red-600">{selectedNode.error}</p>
        </div>
      )}
    </div>
  );
};

// Helper function to get node type configuration
function getNodeTypeConfig(nodeType: string): ConfigDefinition[] {
  const configs: Record<string, ConfigDefinition[]> = {
    'HTTP Request': [
      {
        name: 'url',
        type: 'string',
        required: true,
        default: '',
        description: 'The URL to send the request to'
      },
      {
        name: 'method',
        type: 'select',
        required: true,
        default: 'GET',
        description: 'HTTP method to use',
        options: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
      },
      {
        name: 'headers',
        type: 'textarea',
        required: false,
        default: '{}',
        description: 'JSON object of HTTP headers'
      },
      {
        name: 'body',
        type: 'textarea',
        required: false,
        default: '',
        description: 'Request body (JSON or text)'
      },
      {
        name: 'timeout',
        type: 'number',
        required: false,
        default: 30000,
        description: 'Request timeout in milliseconds',
        validation: { min: 1000, max: 300000 }
      }
    ],
    'Delay': [
      {
        name: 'duration',
        type: 'number',
        required: true,
        default: 1000,
        description: 'Delay duration in milliseconds',
        validation: { min: 0, max: 3600000 }
      },
      {
        name: 'unit',
        type: 'select',
        required: true,
        default: 'ms',
        description: 'Time unit',
        options: ['ms', 's', 'm', 'h']
      }
    ],
    'Condition': [
      {
        name: 'condition',
        type: 'string',
        required: true,
        default: '',
        description: 'Condition to evaluate'
      },
      {
        name: 'operator',
        type: 'select',
        required: true,
        default: 'equals',
        description: 'Comparison operator',
        options: ['equals', 'not_equals', 'greater_than', 'less_than', 'contains']
      },
      {
        name: 'value',
        type: 'string',
        required: true,
        default: '',
        description: 'Value to compare against'
      }
    ]
  };

  return configs[nodeType] || [];
}
