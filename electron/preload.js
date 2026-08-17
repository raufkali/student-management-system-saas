const { contextBridge, ipcRenderer } = require("electron");

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld("electronAPI", {
  // Dialog operations
  showOpenDialog: (options) => ipcRenderer.invoke("dialog:open", options),
  showSaveDialog: (options) => ipcRenderer.invoke("dialog:save", options),
  showMessageBox: (options) => ipcRenderer.invoke("dialog:message", options),

  // Printer operations
  getPrinters: () => ipcRenderer.invoke("printer:getPrinters"),
  print: (options) => ipcRenderer.invoke("printer:print", options),
  printPDF: (data, options) =>
    ipcRenderer.invoke("printer:printPDF", data, options),

  // Backup operations
  createBackup: (data) => ipcRenderer.invoke("backup:create", data),
  restoreBackup: (filePath) => ipcRenderer.invoke("backup:restore", filePath),
  getBackups: () => ipcRenderer.invoke("backup:list"),
  deleteBackup: (fileName) => ipcRenderer.invoke("backup:delete", fileName),

  // System operations
  getSystemInfo: () => ipcRenderer.invoke("system:info"),
  openExternal: (url) => ipcRenderer.invoke("system:openExternal", url),
  showInFolder: (filePath) =>
    ipcRenderer.invoke("system:showInFolder", filePath),
  getAppVersion: () => ipcRenderer.invoke("system:version"),

  // Custom event listeners
  on: (channel, callback) => {
    const validChannels = [
      "update-available",
      "update-downloaded",
      "backup-progress",
    ];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => callback(...args));
    }
  },
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  },

  // App control
  minimizeWindow: () => ipcRenderer.send("window:minimize"),
  maximizeWindow: () => ipcRenderer.send("window:maximize"),
  closeWindow: () => ipcRenderer.send("window:close"),
  reloadWindow: () => ipcRenderer.send("window:reload"),
});
