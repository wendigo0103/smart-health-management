import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// Production-only vite config (no server integration)
export default defineConfig({
  build: {
    outDir: "dist/spa",
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
});
