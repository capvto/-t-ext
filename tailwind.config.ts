import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Inter", "Roboto", "Helvetica", "Arial", "Apple Color Emoji", "Segoe UI Emoji"],
        mono: ["ui-monospace", "SFMono-Regular", "SF Mono", "Menlo", "Monaco", "Consolas", "Liberation Mono", "Courier New", "monospace"],
      },
      boxShadow: {
        glass: "0 10px 30px rgba(0,0,0,.18)",
        glow: "0 0 0 1px rgba(255,255,255,.08), 0 12px 40px rgba(0,0,0,.28)",
      },
      keyframes: {
        floaty: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-6px)" },
        }
      },
      animation: {
        floaty: "floaty 6s ease-in-out infinite",
      }
    },
  },
  plugins: [typography],
} satisfies Config;
