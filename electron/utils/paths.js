const path = require("path");
const os = require("os");
const fs = require("fs");

// Get the application data directory
function getAppDataPath() {
  const appName = "StudentManagementSystem";
  const homeDir = os.homedir();

  let appDataPath;
  if (process.platform === "win32") {
    appDataPath = path.join(
      process.env.APPDATA || path.join(homeDir, "AppData", "Roaming"),
      appName,
    );
  } else if (process.platform === "darwin") {
    appDataPath = path.join(homeDir, "Library", "Application Support", appName);
  } else {
    appDataPath = path.join(homeDir, ".config", appName);
  }

  // Ensure the directory exists
  if (!fs.existsSync(appDataPath)) {
    fs.mkdirSync(appDataPath, { recursive: true });
  }

  return appDataPath;
}

// Get the database path
function getDatabasePath() {
  return path.join(process.cwd(), "database", "mongodb-data");
}

// Get the uploads directory path
function getUploadsPath() {
  const uploadsPath = path.join(process.cwd(), "backend", "uploads");
  return uploadsPath;
}

// Get the backup directory path
function getBackupPath() {
  const backupPath = path.join(process.cwd(), "backups");
  if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(backupPath, { recursive: true });
  }
  return backupPath;
}

// Get the logs directory path
function getLogsPath() {
  const logsPath = path.join(process.cwd(), "logs");
  if (!fs.existsSync(logsPath)) {
    fs.mkdirSync(logsPath, { recursive: true });
  }
  return logsPath;
}

// Get the build directory path
function getBuildPath() {
  return path.join(process.cwd(), "build");
}

// Get the frontend directory path
function getFrontendPath() {
  return path.join(process.cwd(), "frontend");
}

// Generate a safe filename
function safeFileName(filename) {
  return filename.replace(/[^a-zA-Z0-9.-]/g, "_");
}

// Ensure a directory exists
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  return dirPath;
}

// Get temporary directory
function getTempPath() {
  const tempPath = path.join(process.cwd(), "temp");
  return ensureDirectoryExists(tempPath);
}

// Clean temporary files older than X days
function cleanTempFiles(days = 7) {
  const tempPath = getTempPath();
  const now = Date.now();
  const maxAge = days * 24 * 60 * 60 * 1000;

  try {
    const files = fs.readdirSync(tempPath);
    for (const file of files) {
      const filePath = path.join(tempPath, file);
      const stats = fs.statSync(filePath);
      if (stats.isFile() && now - stats.mtimeMs > maxAge) {
        fs.unlinkSync(filePath);
        console.log(`Cleaned up old temp file: ${file}`);
      }
    }
  } catch (error) {
    console.error("Error cleaning temp files:", error);
  }
}

module.exports = {
  getAppDataPath,
  getDatabasePath,
  getUploadsPath,
  getBackupPath,
  getLogsPath,
  getBuildPath,
  getFrontendPath,
  safeFileName,
  ensureDirectoryExists,
  getTempPath,
  cleanTempFiles,
};
