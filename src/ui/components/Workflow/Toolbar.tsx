/**
 * Toolbar Component
 * Provides workflow execution controls and editing operations
 */

import React, { useState, useEffect } from 'react';

interface ToolbarProps {
  workflowStatus: 'idle' | 'running' | 'paused' | 'error';
  onStart: () => void;
  onStop: () => void;
  onPause: () => void;
  onStep: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  onLoad: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  workflowStatus,
  onStart,
  onStop,
  onPause,
  onStep,
  onUndo,
  onRedo,
  onSave,
  onLoad,
  canUndo,
  canRedo
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null);

  useEffect(() => {
    // Keyboard shortcuts
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case 'z':
            if (event.shiftKey) {
              onRedo();
            } else {
              onUndo();
            }
            break;
          case 's':
            event.preventDefault();
            handleSave();
            break;
          case 'o':
            event.preventDefault();
            onLoad();
            break;
        }
      } else {
        switch (event.key) {
          case 'F5':
            event.preventDefault();
            onStart();
            break;
          case 'F6':
            event.preventDefault();
            onStop();
            break;
          case 'F7':
            event.preventDefault();
            onPause();
            break;
          case 'F8':
            event.preventDefault();
            onStep();
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onStart, onStop, onPause, onStep, onUndo, onRedo, onSave, onLoad]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave();
      setLastSaveTime(new Date());
    } catch (error) {
      console.error('Save failed:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const getExecutionButton = () => {
    switch (workflowStatus) {
      case 'idle':
        return (
          <button
            onClick={onStart}
            className="flex items-center px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
            title="Start Workflow (F5)"
          >
            <i className="fas fa-play mr-2"></i>
            Start
          </button>
        );
      case 'running':
        return (
          <button
            onClick={onStop}
            className="flex items-center px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
            title="Stop Workflow (F6)"
          >
            <i className="fas fa-stop mr-2"></i>
            Stop
          </button>
        );
      case 'paused':
        return (
          <div className="flex space-x-2">
            <button
              onClick={onStart}
              className="flex items-center px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
              title="Resume Workflow (F5)"
            >
              <i className="fas fa-play mr-2"></i>
              Resume
            </button>
            <button
              onClick={onStep}
              className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              title="Step Workflow (F8)"
            >
              <i className="fas fa-step-forward mr-2"></i>
              Step
            </button>
          </div>
        );
      case 'error':
        return (
          <div className="flex space-x-2">
            <button
              onClick={onStart}
              className="flex items-center px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
              title="Restart Workflow (F5)"
            >
              <i className="fas fa-redo mr-2"></i>
              Restart
            </button>
            <button
              onClick={onStep}
              className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              title="Step Workflow (F8)"
            >
              <i className="fas fa-step-forward mr-2"></i>
              Step
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-2">
      <div className="flex items-center justify-between">
        {/* Left side - Execution controls */}
        <div className="flex items-center space-x-4">
          {getExecutionButton()}
          
          {/* Status indicator */}
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              workflowStatus === 'running' ? 'bg-green-500' :
              workflowStatus === 'paused' ? 'bg-yellow-500' :
              workflowStatus === 'error' ? 'bg-red-500' : 'bg-gray-400'
            }`} />
            <span className="text-sm font-medium text-gray-700 capitalize">
              {workflowStatus}
            </span>
          </div>
        </div>

        {/* Center - Editing controls */}
        <div className="flex items-center space-x-2">
          {/* Undo/Redo */}
          <div className="flex items-center space-x-1 border-r border-gray-300 pr-2">
            <button
              onClick={onUndo}
              disabled={!canUndo}
              className={`p-2 rounded-md transition-colors ${
                canUndo 
                  ? 'text-gray-600 hover:bg-gray-100 hover:text-gray-800' 
                  : 'text-gray-300 cursor-not-allowed'
              }`}
              title="Undo (Ctrl+Z)"
            >
              <i className="fas fa-undo"></i>
            </button>
            <button
              onClick={onRedo}
              disabled={!canRedo}
              className={`p-2 rounded-md transition-colors ${
                canRedo 
                  ? 'text-gray-600 hover:bg-gray-100 hover:text-gray-800' 
                  : 'text-gray-300 cursor-not-allowed'
              }`}
              title="Redo (Ctrl+Shift+Z)"
            >
              <i className="fas fa-redo"></i>
            </button>
          </div>

          {/* Save/Load */}
          <div className="flex items-center space-x-1 border-r border-gray-300 pr-2">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className={`flex items-center px-3 py-1.5 rounded-md transition-colors ${
                isSaving
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
              }`}
              title="Save (Ctrl+S)"
            >
              {isSaving ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Saving...
                </>
              ) : (
                <>
                  <i className="fas fa-save mr-2"></i>
                  Save
                </>
              )}
            </button>
            <button
              onClick={onLoad}
              className="flex items-center px-3 py-1.5 text-gray-600 hover:bg-gray-100 hover:text-gray-800 rounded-md transition-colors"
              title="Load (Ctrl+O)"
            >
              <i className="fas fa-folder-open mr-2"></i>
              Load
            </button>
          </div>

          {/* Additional tools */}
          <div className="flex items-center space-x-1">
            <button
              className="p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-800 rounded-md transition-colors"
              title="Export Workflow"
            >
              <i className="fas fa-download"></i>
            </button>
            <button
              className="p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-800 rounded-md transition-colors"
              title="Import Workflow"
            >
              <i className="fas fa-upload"></i>
            </button>
            <button
              className="p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-800 rounded-md transition-colors"
              title="Settings"
            >
              <i className="fas fa-cog"></i>
            </button>
          </div>
        </div>

        {/* Right side - Info */}
        <div className="flex items-center space-x-4">
          {lastSaveTime && (
            <div className="text-sm text-gray-500">
              Last saved: {lastSaveTime.toLocaleTimeString()}
            </div>
          )}
          
          {/* Help */}
          <button
            className="p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-800 rounded-md transition-colors"
            title="Help (F1)"
          >
            <i className="fas fa-question-circle"></i>
          </button>
        </div>
      </div>

      {/* Keyboard shortcuts help */}
      <div className="mt-2 pt-2 border-t border-gray-200">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center space-x-4">
            <span><kbd className="px-1 py-0.5 bg-gray-100 border border-gray-300 rounded">F5</kbd> Start</span>
            <span><kbd className="px-1 py-0.5 bg-gray-100 border border-gray-300 rounded">F6</kbd> Stop</span>
            <span><kbd className="px-1 py-0.5 bg-gray-100 border border-gray-300 rounded">F7</kbd> Pause</span>
            <span><kbd className="px-1 py-0.5 bg-gray-100 border border-gray-300 rounded">F8</kbd> Step</span>
          </div>
          <div className="flex items-center space-x-4">
            <span><kbd className="px-1 py-0.5 bg-gray-100 border border-gray-300 rounded">Ctrl+Z</kbd> Undo</span>
            <span><kbd className="px-1 py-0.5 bg-gray-100 border border-gray-300 rounded">Ctrl+S</kbd> Save</span>
            <span><kbd className="px-1 py-0.5 bg-gray-100 border border-gray-300 rounded">Ctrl+O</kbd> Load</span>
          </div>
        </div>
      </div>
    </div>
  );
};
