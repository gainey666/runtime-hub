/**
 * Error Display Component
 * Shows workflow and node errors with detailed information
 */

import React, { useState } from 'react';

interface ErrorInfo {
  nodeId?: string;
  nodeName?: string;
  error: Error;
  timestamp: Date;
  severity: 'error' | 'warning' | 'info';
  context?: any;
}

interface ErrorDisplayProps {
  errors: ErrorInfo[];
  onClearError: (index: number) => void;
  onClearAll: () => void;
  onRetryNode?: (nodeId: string) => void;
  onGoToNode?: (nodeId: string) => void;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  errors,
  onClearError,
  onClearAll,
  onRetryNode,
  onGoToNode
}) => {
  const [expandedErrors, setExpandedErrors] = useState<Set<number>>(new Set());
  const [filter, setFilter] = useState<'all' | 'error' | 'warning' | 'info'>('all');

  const toggleErrorExpansion = (index: number) => {
    const newExpanded = new Set(expandedErrors);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedErrors(newExpanded);
  };

  const filteredErrors = errors.filter(error => 
    filter === 'all' || error.severity === filter
  );

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error':
        return '🔴';
      case 'warning':
        return '🟡';
      case 'info':
        return '🔵';
      default:
        return '⚪';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error':
        return 'border-red-300 bg-red-50';
      case 'warning':
        return 'border-yellow-300 bg-yellow-50';
      case 'info':
        return 'border-blue-300 bg-blue-50';
      default:
        return 'border-gray-300 bg-gray-50';
    }
  };

  const formatError = (error: Error) => {
    return {
      message: error.message,
      stack: error.stack,
      name: error.name,
      cause: error.cause
    };
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h3 className="text-lg font-semibold text-gray-800">Errors & Warnings</h3>
            <span className="px-2 py-1 text-sm bg-gray-100 text-gray-600 rounded-full">
              {filteredErrors.length}
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Filter */}
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="text-sm border border-gray-300 rounded px-2 py-1"
            >
              <option value="all">All</option>
              <option value="error">Errors</option>
              <option value="warning">Warnings</option>
              <option value="info">Info</option>
            </select>
            
            {/* Clear All */}
            {errors.length > 0 && (
              <button
                onClick={onClearAll}
                className="text-sm text-gray-600 hover:text-gray-800 px-2 py-1"
              >
                Clear All
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Error List */}
      <div className="max-h-96 overflow-y-auto">
        {filteredErrors.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-500">
            <div className="text-4xl mb-2">✅</div>
            <p>No errors or warnings</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredErrors.map((errorInfo, index) => {
              const originalIndex = errors.indexOf(errorInfo);
              const isExpanded = expandedErrors.has(originalIndex);
              const formattedError = formatError(errorInfo.error);
              
              return (
                <div
                  key={originalIndex}
                  className={`p-4 ${getSeverityColor(errorInfo.severity)}`}
                >
                  {/* Error Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <span className="text-lg">{getSeverityIcon(errorInfo.severity)}</span>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-medium text-gray-800">
                            {errorInfo.nodeName || 'Unknown Node'}
                          </span>
                          {errorInfo.nodeId && (
                            <button
                              onClick={() => onGoToNode?.(errorInfo.nodeId!)}
                              className="text-xs text-blue-600 hover:text-blue-800"
                            >
                              Go to Node
                            </button>
                          )}
                        </div>
                        
                        <p className="text-sm text-gray-700 mb-1">
                          {formattedError.message}
                        </p>
                        
                        <p className="text-xs text-gray-500">
                          {errorInfo.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex items-center space-x-1 ml-4">
                      {errorInfo.nodeId && onRetryNode && (
                        <button
                          onClick={() => onRetryNode(errorInfo.nodeId!)}
                          className="p-1 text-blue-600 hover:text-blue-800"
                          title="Retry Node"
                        >
                          <i className="fas fa-redo text-sm"></i>
                        </button>
                      )}
                      
                      <button
                        onClick={() => toggleErrorExpansion(originalIndex)}
                        className="p-1 text-gray-600 hover:text-gray-800"
                        title={isExpanded ? 'Collapse' : 'Expand'}
                      >
                        <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'} text-xs`}></i>
                      </button>
                      
                      <button
                        onClick={() => onClearError(originalIndex)}
                        className="p-1 text-red-600 hover:text-red-800"
                        title="Clear Error"
                      >
                        <i className="fas fa-times text-sm"></i>
                      </button>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="space-y-2">
                        {/* Error Type */}
                        <div>
                          <span className="text-xs font-medium text-gray-600">Type:</span>
                          <span className="text-xs text-gray-800 ml-2">
                            {formattedError.name}
                          </span>
                        </div>

                        {/* Node ID */}
                        {errorInfo.nodeId && (
                          <div>
                            <span className="text-xs font-medium text-gray-600">Node ID:</span>
                            <code className="text-xs text-gray-800 ml-2 bg-gray-100 px-1 rounded">
                              {errorInfo.nodeId}
                            </code>
                          </div>
                        )}

                        {/* Context */}
                        {errorInfo.context && (
                          <div>
                            <span className="text-xs font-medium text-gray-600">Context:</span>
                            <pre className="text-xs text-gray-800 mt-1 bg-gray-100 p-2 rounded overflow-x-auto">
                              {JSON.stringify(errorInfo.context, null, 2)}
                            </pre>
                          </div>
                        )}

                        {/* Stack Trace */}
                        {formattedError.stack && (
                          <div>
                            <span className="text-xs font-medium text-gray-600">Stack Trace:</span>
                            <pre className="text-xs text-gray-800 mt-1 bg-gray-100 p-2 rounded overflow-x-auto max-h-32 overflow-y-auto">
                              {formattedError.stack}
                            </pre>
                          </div>
                        )}

                        {/* Cause */}
                        {formattedError.cause && (
                          <div>
                            <span className="text-xs font-medium text-gray-600">Cause:</span>
                            <pre className="text-xs text-gray-800 mt-1 bg-gray-100 p-2 rounded overflow-x-auto">
                              {formattedError.cause instanceof Error 
                                ? formattedError.cause.message 
                                : String(formattedError.cause)
                              }
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      {errors.length > 0 && (
        <div className="px-4 py-2 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span>
              {errors.filter(e => e.severity === 'error').length} errors, 
              {errors.filter(e => e.severity === 'warning').length} warnings, 
              {errors.filter(e => e.severity === 'info').length} info
            </span>
            <span>
              Last updated: {new Date().toLocaleTimeString()}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
