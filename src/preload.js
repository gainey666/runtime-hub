/**
 * Electron Preload Script
 * Exposes safe APIs to the renderer process
 */

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  // File dialog APIs
  saveWorkflow: (data) => ipcRenderer.invoke('save-workflow', data),
  loadWorkflow: () => ipcRenderer.invoke('load-workflow'),

  // App version
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),

  // Menu event listeners
  onMenuNewWorkflow: (callback) => ipcRenderer.on('menu-new-workflow', callback),
  onMenuOpenWorkflow: (callback) => ipcRenderer.on('menu-open-workflow', callback),
  onMenuSaveWorkflow: (callback) => ipcRenderer.on('menu-save-workflow', callback),
  onMenuStartMonitoring: (callback) => ipcRenderer.on('menu-start-monitoring', callback),
  onMenuStopMonitoring: (callback) => ipcRenderer.on('menu-stop-monitoring', callback),
  onMenuClearLogs: (callback) => ipcRenderer.on('menu-clear-logs', callback),
  onMenuGenerateCode: (callback) => ipcRenderer.on('menu-generate-code', callback),
  onMenuExportLLM: (callback) => ipcRenderer.on('menu-export-llm', callback),
  onMenuAutoLayout: (callback) => ipcRenderer.on('menu-auto-layout', callback),
  onMenuToggleSidebar: (callback) => ipcRenderer.on('menu-toggle-sidebar', callback),
  onMenuToggleLogs: (callback) => ipcRenderer.on('menu-toggle-logs', callback),
  onMenuZoomIn: (callback) => ipcRenderer.on('menu-zoom-in', callback),
  onMenuZoomOut: (callback) => ipcRenderer.on('menu-zoom-out', callback),
  onMenuZoomReset: (callback) => ipcRenderer.on('menu-zoom-reset', callback),
  onMenuAbout: (callback) => ipcRenderer.on('menu-about', callback),

  // Remove all listeners for a specific channel
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),

  // Region selector
  openRegionSelector:   ()       => ipcRenderer.invoke('open-region-selector'),
  submitRegion:         (region) => ipcRenderer.invoke('region-selected', region),
  cancelRegionSelector: ()       => ipcRenderer.invoke('cancel-region-selector'),
  onScreenshotData:     (cb)     => ipcRenderer.on('screenshot-data',  (_e, data)   => cb(data)),
  onRegionSelected:     (cb)     => ipcRenderer.on('region-selected',   (_e, region) => cb(region))
});

console.log('Preload script loaded successfully');
