import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(() => {
  // Electron packaging needs relative asset paths (file://), while Netlify
  // needs absolute paths so routes like /p/:id can load JS/CSS from /assets.
  const isNetlify = process.env.NETLIFY === "true" || !!process.env.NETLIFY;

  return {
    base: isNetlify ? "/" : "./",
    plugins: [react()],
    server: {
      port: 5173,
      strictPort: true
    }
  };
});
