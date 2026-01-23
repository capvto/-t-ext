import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // Required for Electron (file://) production loading
  base: "./",
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true
  }
});
