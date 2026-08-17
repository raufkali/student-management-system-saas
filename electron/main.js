const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const { createWindow, getMainWindow } = require("./window");
const createMenu = require("./menu");
const { setupDialogHandlers } = require("./ipc/dialog.ipc");
const { setupPrinterHandlers } = require("./ipc/printer.ipc");
const { setupBackupHandlers } = require("./ipc/backup.ipc");
const { setupSystemHandlers } = require("./ipc/system.ipc");

console.log("🚀 Electron main process started");
console.log("📦 SKIP_SERVER:", process.env.SKIP_SERVER);

// Handle Squirrel installer events (Windows)
try {
  if (process.platform === "win32") {
    const squirrelStartup = require("electron-squirrel-startup");
    if (squirrelStartup) {
      app.quit();
      process.exit(0);
    }
  }
} catch (error) {
  console.log("⚠️ Squirrel startup not available (fine for development)");
}

// This method will be called when Electron has finished initialization
app.whenReady().then(async () => {
  console.log("✅ Electron app is ready");

  try {
    // Only start the backend server if SKIP_SERVER is not set
    if (!process.env.SKIP_SERVER) {
      console.log("🔄 Starting backend server...");
      const { startServer } = require("../backend/server");
      await startServer();
      console.log("✅ Backend server started successfully");
    } else {
      console.log("⏭️ Skipping backend server start (already running)");
    }

    // Create the main window
    console.log("🔄 Creating main window...");
    const mainWindow = createWindow();
    console.log("✅ Main window created");

    // Create application menu
    createMenu(mainWindow);
    console.log("✅ Menu created");

    // Setup IPC handlers
    setupDialogHandlers(mainWindow);
    setupPrinterHandlers(mainWindow);
    setupBackupHandlers(mainWindow);
    setupSystemHandlers(mainWindow);
    console.log("✅ IPC handlers setup");

    // Load the app
    const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;
    console.log(
      "🔄 Loading app in",
      isDev ? "development" : "production",
      "mode",
    );

    if (isDev) {
      const url = "http://localhost:3000";
      console.log(`🔗 Loading URL: ${url}`);

      // Try to load with error handling and retry
      let loaded = false;
      let retries = 3;

      while (!loaded && retries > 0) {
        try {
          await mainWindow.loadURL(url);
          loaded = true;
          console.log("✅ URL loaded successfully");
        } catch (error) {
          retries--;
          console.error(
            `❌ Failed to load URL (${retries} retries left):`,
            error.message,
          );

          if (retries > 0) {
            console.log("⏳ Waiting 2 seconds before retry...");
            await new Promise((resolve) => setTimeout(resolve, 2000));
          } else {
            // Show error page
            const errorHtml = `
              <!DOCTYPE html>
              <html>
                <head>
                  <title>Connection Error</title>
                  <style>
                    body { display:flex; justify-content:center; align-items:center; height:100vh; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin:0; background: #f5f7fa; }
                    .container { text-align:center; padding:40px; background:white; border-radius:12px; box-shadow:0 4px 20px rgba(0,0,0,0.1); max-width:500px; }
                    h1 { color:#d32f2f; margin-bottom:16px; }
                    p { color:#666; line-height:1.6; margin-bottom:20px; }
                    button { padding:10px 24px; background:#1976d2; color:white; border:none; border-radius:8px; cursor:pointer; font-size:14px; }
                    button:hover { background:#1565c0; }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <h1>Connection Error</h1>
                    <p>Failed to connect to the frontend development server.<br/>
                    Please make sure the frontend is running on <strong>http://localhost:3000</strong></p>
                    <p style="font-size:14px;color:#999;">Error: ${error.message}</p>
                    <button onclick="location.reload()">Retry</button>
                  </div>
                </body>
              </html>
            `;
            await mainWindow.loadURL(
              `data:text/html;charset=utf-8,${encodeURIComponent(errorHtml)}`,
            );
            console.log("⚠️ Loaded error page");
          }
        }
      }

      // Open DevTools in development (optional)
      // mainWindow.webContents.openDevTools();
    } else {
      const indexPath = path.join(__dirname, "../build/index.html");
      console.log("📄 Loading file:", indexPath);
      await mainWindow.loadFile(indexPath);
      console.log("✅ File loaded");
    }

    console.log("🎉 Application ready!");
  } catch (error) {
    console.error("❌ Error during app initialization:", error);
    dialog.showErrorBox(
      "Application Error",
      `Failed to start application:\n\n${error.message}`,
    );
    app.quit();
  }
});

// Quit when all windows are closed, except on macOS
app.on("window-all-closed", () => {
  console.log("All windows closed");
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  console.log("App activated");
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("💥 Uncaught Exception:", error);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("💥 Unhandled Rejection:", reason);
});

// Cleanup on exit
app.on("before-quit", () => {
  console.log("🔄 Cleaning up before quit...");
  try {
    const { closeDatabase } = require("../backend/config/database");
    if (closeDatabase) {
      closeDatabase();
    }
  } catch (error) {
    console.error("Error during cleanup:", error);
  }
  console.log("✅ Cleanup complete");
});

module.exports = app;
