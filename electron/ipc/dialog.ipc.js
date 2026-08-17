const { dialog, BrowserWindow } = require("electron");
const path = require("path");

function setupDialogHandlers(mainWindow) {
  // Open dialog
  mainWindow.webContents.ipc.handle("dialog:open", async (event, options) => {
    try {
      const defaultOptions = {
        properties: ["openFile", "openDirectory", "multiSelections"],
        title: "Select Files or Folder",
        buttonLabel: "Select",
      };

      const mergedOptions = { ...defaultOptions, ...options };
      const result = await dialog.showOpenDialog(mainWindow, mergedOptions);

      if (result.canceled) {
        return { canceled: true };
      }

      return {
        canceled: false,
        filePaths: result.filePaths,
      };
    } catch (error) {
      console.error("Error in open dialog:", error);
      throw error;
    }
  });

  // Save dialog
  mainWindow.webContents.ipc.handle("dialog:save", async (event, options) => {
    try {
      const defaultOptions = {
        title: "Save File",
        buttonLabel: "Save",
        defaultPath: path.join(
          process.env.HOME || process.env.USERPROFILE,
          "Documents",
        ),
      };

      const mergedOptions = { ...defaultOptions, ...options };
      const result = await dialog.showSaveDialog(mainWindow, mergedOptions);

      if (result.canceled) {
        return { canceled: true };
      }

      return {
        canceled: false,
        filePath: result.filePath,
      };
    } catch (error) {
      console.error("Error in save dialog:", error);
      throw error;
    }
  });

  // Message box
  mainWindow.webContents.ipc.handle(
    "dialog:message",
    async (event, options) => {
      try {
        const defaultOptions = {
          type: "info",
          buttons: ["OK"],
          defaultId: 0,
          title: "Information",
        };

        const mergedOptions = { ...defaultOptions, ...options };
        const result = await dialog.showMessageBox(mainWindow, mergedOptions);

        return {
          response: result.response,
          checkboxChecked: result.checkboxChecked,
        };
      } catch (error) {
        console.error("Error in message box:", error);
        throw error;
      }
    },
  );

  // Error dialog
  mainWindow.webContents.ipc.handle(
    "dialog:error",
    async (event, message, title = "Error") => {
      try {
        await dialog.showErrorBox(title, message);
        return { success: true };
      } catch (error) {
        console.error("Error in error dialog:", error);
        throw error;
      }
    },
  );
}

module.exports = {
  setupDialogHandlers,
};
