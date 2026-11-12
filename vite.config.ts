import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: mode === "desktop" ? "./" : "/app/",
  server: { host: "0.0.0.0", port: 4173, allowedHosts: ["terminal.local"] },
  build: {
    outDir: mode === "desktop" ? "dist/desktop" : "dist/app",
    emptyOutDir: true,
    chunkSizeWarningLimit: 650,
  },
}));
