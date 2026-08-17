const { BrowserWindow, screen, ipcMain } = require("electron");
const path = require("path");

let mainWindow = null;

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  mainWindow = new BrowserWindow({
    width: Math.min(1200, width),
    height: Math.min(800, height),
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
      webSecurity: false, // Set to false for development
      allowRunningInsecureContent: true,
    },
    icon: path.join(__dirname, "../build/icon.png"),
    frame: true,
    titleBarStyle: "default",
    show: false,
    backgroundColor: "#f4f4f9",
    // Add these to help with loading
    webContents: {
      // Allow loading from localhost
      allowRunningInsecureContent: true,
    },
  });

  // Show window when ready
  mainWindow.once("ready-to-show", () => {
    console.log("🪟 Window ready to show");
    mainWindow.show();
    mainWindow.focus();

    if (process.env.NODE_ENV === "development") {
      // mainWindow.webContents.openDevTools();
    }
  });

  // Handle failed loads
  mainWindow.webContents.on(
    "did-fail-load",
    (event, errorCode, errorDescription, validatedURL) => {
      console.error("❌ Failed to load:", errorDescription);
      console.error("   URL:", validatedURL);
      console.error("   Error Code:", errorCode);
    },
  );

  // Handle successful loads
  mainWindow.webContents.on("did-finish-load", () => {
    console.log("✅ Page loaded successfully");
  });

  // Handle console messages from renderer
  mainWindow.webContents.on(
    "console-message",
    (event, level, message, line, sourceId) => {
      console.log("🔍 Renderer console:", message);
    },
  );

  // Set up window control handlers
  ipcMain.on("window:minimize", () => {
    if (mainWindow) mainWindow.minimize();
  });

  ipcMain.on("window:maximize", () => {
    if (mainWindow) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
    }
  });

  ipcMain.on("window:close", () => {
    if (mainWindow) mainWindow.close();
  });

  ipcMain.on("window:reload", () => {
    if (mainWindow) mainWindow.reload();
  });

  // Handle window close event
  mainWindow.on("close", (event) => {
    // You can add confirmation dialog here if needed
  });

  // Handle window closed event
  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  return mainWindow;
}

function getMainWindow() {
  return mainWindow;
}

function sendToMainWindow(channel, data) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, data);
  }
}

module.exports = {
  createWindow,
  getMainWindow,
  sendToMainWindow,
};
