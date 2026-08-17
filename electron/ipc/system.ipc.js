const { app, shell, dialog } = require("electron");
const os = require("os");
const path = require("path");
const fs = require("fs");

function setupSystemHandlers(mainWindow) {
  // Get system information
  mainWindow.webContents.ipc.handle("system:info", async () => {
    try {
      const info = {
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        electronVersion: process.versions.electron,
        chromeVersion: process.versions.chrome,
        os: {
          type: os.type(),
          release: os.release(),
          platform: os.platform(),
          arch: os.arch(),
          cpus: os.cpus().length,
          totalMemory: os.totalmem(),
          freeMemory: os.freemem(),
          uptime: os.uptime(),
        },
        app: {
          name: app.getName(),
          version: app.getVersion(),
          path: app.getAppPath(),
          userDataPath: app.getPath("userData"),
          documentsPath: app.getPath("documents"),
          tempPath: app.getPath("temp"),
        },
        environment: process.env.NODE_ENV || "production",
      };
      return info;
    } catch (error) {
      console.error("Error getting system info:", error);
      throw error;
    }
  });

  // Open external URL
  mainWindow.webContents.ipc.handle(
    "system:openExternal",
    async (event, url) => {
      try {
        await shell.openExternal(url);
        return { success: true };
      } catch (error) {
        console.error("Error opening external URL:", error);
        throw error;
      }
    },
  );

  // Show file in folder
  mainWindow.webContents.ipc.handle(
    "system:showInFolder",
    async (event, filePath) => {
      try {
        if (!fs.existsSync(filePath)) {
          throw new Error(`File not found: ${filePath}`);
        }
        await shell.showItemInFolder(filePath);
        return { success: true };
      } catch (error) {
        console.error("Error showing file in folder:", error);
        throw error;
      }
    },
  );

  // Get app version
  mainWindow.webContents.ipc.handle("system:version", async () => {
    return {
      version: app.getVersion(),
      name: app.getName(),
    };
  });

  // Open developer tools
  mainWindow.webContents.ipc.handle("system:devtools", async () => {
    if (mainWindow) {
      mainWindow.webContents.openDevTools();
    }
    return { success: true };
  });

  // Check for updates (placeholder)
  mainWindow.webContents.ipc.handle("system:checkUpdates", async () => {
    // This would integrate with electron-updater or similar
    // For now, return a mock response
    return {
      updateAvailable: false,
      currentVersion: app.getVersion(),
    };
  });

  // Restart application
  mainWindow.webContents.ipc.handle("system:restart", async () => {
    app.relaunch();
    app.quit();
    return { success: true };
  });

  // Get app directory
  mainWindow.webContents.ipc.handle("system:getPath", async (event, name) => {
    try {
      const path = app.getPath(name || "userData");
      return { path };
    } catch (error) {
      console.error("Error getting path:", error);
      throw error;
    }
  });

  // Clear application cache
  mainWindow.webContents.ipc.handle("system:clearCache", async () => {
    try {
      // Clear session cache
      const session = mainWindow.webContents.session;
      await session.clearCache();
      await session.clearStorageData();

      return { success: true };
    } catch (error) {
      console.error("Error clearing cache:", error);
      throw error;
    }
  });

  // Logging helper
  mainWindow.webContents.ipc.handle(
    "system:log",
    async (event, level, message, data) => {
      const logDir = path.join(process.cwd(), "logs");
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }

      const logFile = path.join(
        logDir,
        `app-${new Date().toISOString().split("T")[0]}.log`,
      );
      const logEntry = {
        timestamp: new Date().toISOString(),
        level,
        message,
        data: data || {},
      };

      fs.appendFileSync(logFile, JSON.stringify(logEntry) + "\n");
      return { success: true };
    },
  );
}

module.exports = {
  setupSystemHandlers,
};
