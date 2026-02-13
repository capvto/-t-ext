import { contextBridge, ipcRenderer } from "electron";

// NOTE: If the preload script throws during evaluation, Electron will silently
// skip exposing our API (especially with DevTools disabled). That makes the
// native menu actions (File → …) and Import/Export buttons look "broken".
//
// In some hardened/sandboxed configurations, `process` can be unavailable in the
// preload context. Keep platform detection defensive so the bridge always loads.
let safePlatform = "unknown";
try {
  // eslint-disable-next-line no-undef
  safePlatform = process.platform;
} catch {
  safePlatform = "unknown";
}

// In some macOS builds (especially with sandbox + contextIsolation), passing a
// callback function across the contextBridge can be unreliable.
// To make native menu actions bulletproof, we also emit a DOM CustomEvent that
// the renderer can listen to via window.addEventListener.
const MENU_DOM_EVENT = "text:menu-action";

try {
  ipcRenderer.on("menu:action", (_event, action) => {
    try {
      const a = String(action);
      // DOM event
      window.dispatchEvent(new CustomEvent(MENU_DOM_EVENT, { detail: a }));
      // postMessage (cross-world safe)
      window.postMessage({ type: MENU_DOM_EVENT, action: a }, "*");
    } catch {
      // ignore
    }
  });
} catch {
  // ignore
}

contextBridge.exposeInMainWorld("electronAPI", {
  platform: safePlatform,
  menuEventName: MENU_DOM_EVENT,
  openMarkdown: () => ipcRenderer.invoke("dialog:openMarkdown"),
  saveMarkdown: (suggestedName, content) =>
    ipcRenderer.invoke("dialog:saveMarkdown", { suggestedName, content }),

  // Robust local persistence (stored in Electron userData)
  kvGet: (key) => ipcRenderer.invoke("kv:get", key),
  kvSet: (key, value) => ipcRenderer.invoke("kv:set", { key, value }),
  kvDel: (key) => ipcRenderer.invoke("kv:del", key),

  // Listen to native menu actions (File → New / Import / Export, etc.).
  // Returns an unsubscribe function.
  // Back-compat helper (still exposed), but renderer should prefer listening to
  // window events using `menuEventName`.
  onMenuAction: (callback) => {
    const handler = (_event, action) => {
      try {
        callback?.(String(action));
      } catch {
        // ignore
      }
    };
    try {
      ipcRenderer.on("menu:action", handler);
    } catch {
      // ignore
    }
    return () => {
      try {
        ipcRenderer.removeListener("menu:action", handler);
      } catch {
        // ignore
      }
    };
  }
});
