const { BrowserWindow, shell, dialog } = require("electron");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const util = require("util");
const execPromise = util.promisify(exec);

function setupPrinterHandlers(mainWindow) {
  // Get list of printers
  mainWindow.webContents.ipc.handle("printer:getPrinters", async () => {
    try {
      // On Windows, we can use PowerShell to get printers
      if (process.platform === "win32") {
        const { stdout } = await execPromise(
          "Get-Printer | Select-Object Name, DriverName, PortName | ConvertTo-Json",
        );
        const printers = JSON.parse(stdout);
        return Array.isArray(printers) ? printers : [printers];
      }

      // On Linux and macOS, use system commands
      const command =
        process.platform === "darwin"
          ? "lpstat -p | awk '{print $2}'"
          : "lpstat -p | grep -E \"^printer\" | awk '{print $2}'";

      const { stdout } = await execPromise(command);
      const printerNames = stdout.split("\n").filter((name) => name.trim());
      return printerNames.map((name) => ({ Name: name }));
    } catch (error) {
      console.error("Error getting printers:", error);
      // Fallback: return empty array
      return [];
    }
  });

  // Print document
  mainWindow.webContents.ipc.handle("printer:print", async (event, options) => {
    try {
      const defaultOptions = {
        silent: false,
        printBackground: true,
        deviceName: "",
        pageSize: "A4",
      };

      const mergedOptions = { ...defaultOptions, ...options };

      // Get the web contents to print
      const win = BrowserWindow.getFocusedWindow();
      if (!win) {
        throw new Error("No active window found");
      }

      // Print the web contents
      await win.webContents.print(mergedOptions);

      return { success: true };
    } catch (error) {
      console.error("Error printing:", error);
      throw error;
    }
  });

  // Print PDF
  mainWindow.webContents.ipc.handle(
    "printer:printPDF",
    async (event, data, options) => {
      try {
        // Save PDF temporarily
        const tempDir = path.join(
          process.env.TEMP || "/tmp",
          "student-management",
        );
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }

        const pdfPath = path.join(tempDir, `print-${Date.now()}.pdf`);

        // Write PDF data
        if (Buffer.isBuffer(data)) {
          fs.writeFileSync(pdfPath, data);
        } else {
          throw new Error("Data must be a Buffer");
        }

        // Open PDF with default application
        await shell.openPath(pdfPath);

        return { success: true, filePath: pdfPath };
      } catch (error) {
        console.error("Error printing PDF:", error);
        throw error;
      }
    },
  );

  // Print student report
  mainWindow.webContents.ipc.handle(
    "printer:printStudentReport",
    async (event, studentData) => {
      try {
        // This would typically generate a PDF from student data
        // For now, we'll just send a message that it's being processed
        mainWindow.webContents.send("printer:progress", {
          stage: "generating",
          message: "Generating student report...",
        });

        // Simulate processing
        await new Promise((resolve) => setTimeout(resolve, 1000));

        mainWindow.webContents.send("printer:progress", {
          stage: "ready",
          message: "Report ready for printing",
        });

        return { success: true };
      } catch (error) {
        console.error("Error printing student report:", error);
        throw error;
      }
    },
  );
}

module.exports = {
  setupPrinterHandlers,
};
