/**
 * Electron Preload Script
 * Exposes safe APIs to the renderer process using async/await pattern
 */

const { contextBridge, ipcRenderer } = require('electron');

// Helper function to create async event listeners
const createAsyncEventListener = (channel) => {
  return () => new Promise((resolve) => {
    ipcRenderer.once(channel, (event, ...args) => resolve(...args));
  });
};

// Async wrapper for menu events
const createMenuEventListener = (channel) => {
  return (callback) => {
    // Wrap callback to handle async operations
    const wrappedCallback = async (event, ...args) => {
      try {
        await callback(event, ...args);
      } catch (error) {
        console.error(`Error in ${channel} event handler:`, error);
      }
    };
    
    ipcRenderer.on(channel, wrappedCallback);
    
    // Return cleanup function
    return () => ipcRenderer.removeListener(channel, wrappedCallback);
  };
};

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  // File dialog APIs - already async, but enhanced with error handling
  saveWorkflow: async (data) => {
    try {
      return await ipcRenderer.invoke('save-workflow', data);
    } catch (error) {
      console.error('Failed to save workflow:', error);
      throw error;
    }
  },
  
  loadWorkflow: async () => {
    try {
      return await ipcRenderer.invoke('load-workflow');
    } catch (error) {
      console.error('Failed to load workflow:', error);
      throw error;
    }
  },

  // App version - already async, but enhanced
  getAppVersion: async () => {
    try {
      return await ipcRenderer.invoke('get-app-version');
    } catch (error) {
      console.error('Failed to get app version:', error);
      throw error;
    }
  },

  // Menu event listeners - converted to async-friendly pattern
  onMenuNewWorkflow: createMenuEventListener('menu-new-workflow'),
  onMenuOpenWorkflow: createMenuEventListener('menu-open-workflow'),
  onMenuSaveWorkflow: createMenuEventListener('menu-save-workflow'),
  onMenuStartMonitoring: createMenuEventListener('menu-start-monitoring'),
  onMenuStopMonitoring: createMenuEventListener('menu-stop-monitoring'),
  onMenuClearLogs: createMenuEventListener('menu-clear-logs'),
  onMenuGenerateCode: createMenuEventListener('menu-generate-code'),
  onMenuExportLLM: createMenuEventListener('menu-export-llm'),
  onMenuAutoLayout: createMenuEventListener('menu-auto-layout'),
  onMenuToggleSidebar: createMenuEventListener('menu-toggle-sidebar'),
  onMenuToggleLogs: createMenuEventListener('menu-toggle-logs'),
  onMenuZoomIn: createMenuEventListener('menu-zoom-in'),
  onMenuZoomOut: createMenuEventListener('menu-zoom-out'),
  onMenuZoomReset: createMenuEventListener('menu-zoom-reset'),
  onMenuAbout: createMenuEventListener('menu-about'),

  // Remove all listeners for a specific channel - enhanced
  removeAllListeners: (channel) => {
    try {
      ipcRenderer.removeAllListeners(channel);
    } catch (error) {
      console.error(`Failed to remove listeners for channel ${channel}:`, error);
    }
  },

  // Region selector - converted to async pattern
  openRegionSelector: async () => {
    try {
      return await ipcRenderer.invoke('open-region-selector');
    } catch (error) {
      console.error('Failed to open region selector:', error);
      throw error;
    }
  },
  
  submitRegion: async (region) => {
    try {
      return await ipcRenderer.invoke('region-selected', region);
    } catch (error) {
      console.error('Failed to submit region:', error);
      throw error;
    }
  },
  
  cancelRegionSelector: async () => {
    try {
      return await ipcRenderer.invoke('cancel-region-selector');
    } catch (error) {
      console.error('Failed to cancel region selector:', error);
      throw error;
    }
  },

  // Event listeners for region selector - converted to async pattern
  onScreenshotData: (callback) => {
    const wrappedCallback = async (event, data) => {
      try {
        await callback(data);
      } catch (error) {
        console.error('Error in screenshot data handler:', error);
      }
    };
    
    ipcRenderer.on('screenshot-data', wrappedCallback);
    
    // Return cleanup function
    return () => ipcRenderer.removeListener('screenshot-data', wrappedCallback);
  },
  
  onRegionSelected: (callback) => {
    const wrappedCallback = async (event, region) => {
      try {
        await callback(region);
      } catch (error) {
        console.error('Error in region selected handler:', error);
      }
    };
    
    ipcRenderer.on('region-selected', wrappedCallback);
    
    // Return cleanup function
    return () => ipcRenderer.removeListener('region-selected', wrappedCallback);
  },

  // Utility functions for better async handling
  waitForEvent: (channel) => {
    return new Promise((resolve) => {
      ipcRenderer.once(channel, (event, ...args) => resolve(...args));
    });
  },

  // Batch multiple IPC calls
  batchInvoke: async (calls) => {
    try {
      const results = await Promise.all(
        calls.map(call => ipcRenderer.invoke(call.channel, ...call.args))
      );
      return results;
    } catch (error) {
      console.error('Failed to batch invoke IPC calls:', error);
      throw error;
    }
  },

  // Enhanced error handling wrapper
  safeInvoke: async (channel, ...args) => {
    try {
      return await ipcRenderer.invoke(channel, ...args);
    } catch (error) {
      console.error(`IPC call failed for channel ${channel}:`, error);
      return { error: error.message, success: false };
    }
  }
});

console.log('Preload script loaded successfully with async/await pattern');
