const { app, Menu, dialog, shell } = require("electron");

function createMenu(mainWindow) {
  const template = [
    // App menu (macOS)
    ...(process.platform === "darwin"
      ? [
          {
            label: app.getName(),
            submenu: [
              { role: "about" },
              { type: "separator" },
              { role: "services" },
              { type: "separator" },
              { role: "hide" },
              { role: "hideothers" },
              { role: "unhide" },
              { type: "separator" },
              { role: "quit" },
            ],
          },
        ]
      : []),

    // File menu
    {
      label: "File",
      submenu: [
        {
          label: "New Student",
          accelerator: "CmdOrCtrl+N",
          click: () => {
            mainWindow.webContents.send("menu:new-student");
          },
        },
        {
          label: "Import Students",
          accelerator: "CmdOrCtrl+I",
          click: () => {
            mainWindow.webContents.send("menu:import-students");
          },
        },
        {
          label: "Export Data",
          accelerator: "CmdOrCtrl+E",
          click: () => {
            mainWindow.webContents.send("menu:export-data");
          },
        },
        { type: "separator" },
        {
          label: "Print",
          accelerator: "CmdOrCtrl+P",
          click: () => {
            mainWindow.webContents.send("menu:print");
          },
        },
        { type: "separator" },
        {
          label: "Backup Database",
          click: () => {
            mainWindow.webContents.send("menu:backup");
          },
        },
        {
          label: "Restore Database",
          click: () => {
            mainWindow.webContents.send("menu:restore");
          },
        },
        { type: "separator" },
        {
          label: "Exit",
          accelerator: "CmdOrCtrl+Q",
          click: () => {
            app.quit();
          },
        },
      ],
    },

    // Edit menu
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" },
      ],
    },

    // View menu
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },

    // Window menu
    {
      label: "Window",
      submenu: [
        { role: "minimize" },
        { role: "zoom" },
        ...(process.platform === "darwin"
          ? [
              { type: "separator" },
              { role: "front" },
              { type: "separator" },
              { role: "window" },
            ]
          : [{ role: "close" }]),
      ],
    },

    // Help menu
    {
      label: "Help",
      submenu: [
        {
          label: "Documentation",
          click: () => {
            shell.openExternal(
              "https://github.com/your-repo/student-management-system",
            );
          },
        },
        {
          label: "Report Issue",
          click: () => {
            shell.openExternal(
              "https://github.com/your-repo/student-management-system/issues",
            );
          },
        },
        { type: "separator" },
        {
          label: "About",
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: "info",
              title: "About Student Management System",
              message: "Student Management System v1.0.0",
              detail:
                "A comprehensive student management solution built with Electron, React, and Express.\n\n" +
                "Features:\n" +
                "• Student Registration\n" +
                "• Document Management\n" +
                "• Backup & Restore\n" +
                "• Print Reports\n" +
                "• And more!",
              buttons: ["OK"],
            });
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
  return menu;
}

module.exports = createMenu;
