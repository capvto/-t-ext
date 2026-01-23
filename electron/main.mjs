import { app, BrowserWindow, ipcMain, dialog, shell, Menu, globalShortcut } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFile, writeFile } from "node:fs/promises";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const iconPath = path.join(
  __dirname,
  "assets",
  process.platform === "win32" ? "icon.ico" : "icon.png"
);

// ---- App identity (macOS menu bar + window title) ----
// On macOS, the first menu item uses the app name.
// In dev (and without packaging), Electron derives this from package.json "name",
// so we explicitly set it.
const APP_DISPLAY_NAME = "(t)ext";
app.setName(APP_DISPLAY_NAME);

// Native About panel (macOS). Not all fields render on other OSes.
// Note: the about panel is mostly plain text; we also show a clickable link
// inside the renderer UI (footer) for a better experience.
if (process.platform === "darwin") {
  app.setAboutPanelOptions({
    applicationName: APP_DISPLAY_NAME,
    website: "https://www.matteocaputo.dev",
    credits: "Sviluppato da Matteo Caputo"
  });
}

const devServerUrl = process.env.VITE_DEV_SERVER_URL;
const isDev = Boolean(devServerUrl);

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: "#0a0a0b",
    title: APP_DISPLAY_NAME,
    // Used on Windows/Linux (and by some desktop environments). On macOS the
    // app icon is driven by the bundle, but we also set the Dock icon below.
    icon: iconPath,
    // We use a custom top bar in the renderer. On macOS, keep the traffic-lights
    // but avoid our UI overlapping them.
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    ...(process.platform === "darwin"
      ? { trafficLightPosition: { x: 16, y: 12 } }
      : {}),
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      // Disable DevTools entirely (no Developer Console / Inspect Element).
      // This is enforced in addition to removing any menu items that could open them.
      devTools: false
    }
  });

  if (isDev) {
    win.loadURL(devServerUrl);
  } else {
    // In production Vite outputs to /dist
    win.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  // Open external links in the OS browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  // Hard-block the common shortcuts that open DevTools (F12, Cmd/Ctrl+Shift+I, Cmd/Ctrl+Alt+I, Cmd/Ctrl+Shift+C).
  // Even if DevTools are disabled above, this prevents the keybinds from doing anything.
  win.webContents.on("before-input-event", (event, input) => {
    const key = String(input.key || "").toLowerCase();
    const cmdOrCtrl = Boolean(input.control || input.meta);

    const isF12 = key === "f12";
    const isCtrlShiftI = cmdOrCtrl && input.shift && key === "i";
    const isCtrlAltI = cmdOrCtrl && input.alt && key === "i";
    const isCtrlShiftC = cmdOrCtrl && input.shift && key === "c";

    if (isF12 || isCtrlShiftI || isCtrlAltI || isCtrlShiftC) {
      event.preventDefault();
    }
  });

  // If anything tries to open DevTools anyway, immediately close them.
  win.webContents.on("devtools-opened", () => {
    try {
      win.webContents.closeDevTools();
    } catch {
      // ignore
    }
  });

  // Keep a stable window title (avoid Vite/React updating the page title)
  win.on("page-title-updated", (e) => e.preventDefault());
  win.setTitle(APP_DISPLAY_NAME);

  return win;
}

function createAppMenu() {
  const sendToFocused = (action) => {
    const win =
      BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
    if (!win) return;
    win.webContents.send("menu:action", String(action));
  };

  // NOTE: The user asked to remove the "File" tab from the macOS menu bar.
  // We still keep the same file actions available via keyboard shortcuts.
  const registerFileShortcuts = () => {
    const mappings = [
      ["CmdOrCtrl+N", "file:new"],
      ["CmdOrCtrl+O", "file:import"],
      ["CmdOrCtrl+S", "file:export"],
      ["CmdOrCtrl+Shift+S", "file:exportAs"]
    ];

    for (const [accelerator, action] of mappings) {
      try {
        // If already registered (unlikely), unregister first.
        if (globalShortcut.isRegistered(accelerator)) {
          globalShortcut.unregister(accelerator);
        }
        globalShortcut.register(accelerator, () => sendToFocused(action));
      } catch (err) {
        console.error(`Failed to register shortcut ${accelerator}`, err);
      }
    }
  };

  // View menu without any DevTools entries.
  const safeViewMenu = {
    label: "Vista",
    submenu: [
      { role: "reload", label: "Ricarica" },
      { role: "forceReload", label: "Ricarica forzata" },
      { type: "separator" },
      { role: "resetZoom", label: "Zoom normale" },
      { role: "zoomIn", label: "Aumenta zoom" },
      { role: "zoomOut", label: "Riduci zoom" },
      { type: "separator" },
      { role: "togglefullscreen", label: "Schermo intero" }
    ]
  };

  if (process.platform === "darwin") {
    const template = [
      {
        label: APP_DISPLAY_NAME,
        submenu: [
          { role: "about", label: `Informazioni su ${APP_DISPLAY_NAME}` },
          { type: "separator" },
          {
            label: "Sviluppato da Matteo Caputo",
            click: () => shell.openExternal("https://www.matteocaputo.dev")
          },
          { type: "separator" },
          { role: "services" },
          { type: "separator" },
          { role: "hide" },
          { role: "hideOthers" },
          { role: "unhide" },
          { type: "separator" },
          { role: "quit" }
        ]
      },
      { role: "editMenu" },
      safeViewMenu,
      { role: "windowMenu" }
    ];
    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
  } else {
    Menu.setApplicationMenu(
      Menu.buildFromTemplate([
        { role: "editMenu" },
        safeViewMenu,
        { role: "windowMenu" }
      ])
    );
  }

  registerFileShortcuts();
}


// ---- IPC: Native open/save for Markdown ----
ipcMain.handle("dialog:openMarkdown", async () => {
  try {
    // Attach dialogs to the focused window so they don't appear behind the app
    // (macOS can do this if a parent window isn't provided).
    const parent =
      BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];

    const { canceled, filePaths } = await dialog.showOpenDialog(parent, {
      properties: ["openFile"],
      filters: [{ name: "Markdown", extensions: ["md", "markdown", "txt"] }]
    });
    if (canceled || !filePaths?.length) return null;

    const filePath = filePaths[0];
    const content = await readFile(filePath, "utf-8");
    return { filePath, content };
  } catch (err) {
    console.error("openMarkdown failed", err);
    return null;
  }
});

ipcMain.handle("dialog:saveMarkdown", async (_event, { suggestedName, content }) => {
  try {
    const parent =
      BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];

    const { canceled, filePath } = await dialog.showSaveDialog(parent, {
      defaultPath: suggestedName || "document.md",
      filters: [{ name: "Markdown", extensions: ["md"] }]
    });
    if (canceled || !filePath) return null;

    await writeFile(filePath, String(content ?? ""), "utf-8");
    return { filePath };
  } catch (err) {
    console.error("saveMarkdown failed", err);
    return null;
  }
});

app.whenReady().then(() => {
  createAppMenu();

  // macOS: set Dock icon at runtime (useful in dev, and if the app isn't packaged yet).
  if (process.platform === "darwin") {
    try {
      app.dock.setIcon(iconPath);
    } catch {
      // ignore
    }
  }

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});


app.on("will-quit", () => {
  try {
    globalShortcut.unregisterAll();
  } catch {
    // ignore
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
