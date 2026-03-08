import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(() => {
  // Web deployments MUST use an absolute base ("/") so deep links like
  // /:id, /edit/:id, /p/:id... can load JS/CSS from /assets.
  //
  // Electron packaging (file://) needs relative asset paths ("./").
  // We enable that via a dedicated build script that sets ELECTRON_BUILD=true.
  const isElectronBuild = process.env.ELECTRON_BUILD === "true";

  return {
    base: isElectronBuild ? "./" : "/",
    plugins: [react()],
    server: {
      port: 5173,
      strictPort: true
    }
  };
});
