import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import type { Server as HttpServer } from "node:http";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    fs: {
      allow: ["./client", "./shared", "index.html"],
      deny: [".env", ".env.*", "*.{crt,pem}", "**/.git/**", "server/**"],
    },
  },
  build: {
    outDir: "dist/spa",
  },
  plugins: [react(), expressPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
}));

function expressPlugin(): Plugin {
  return {
    name: "express-plugin",
    apply: "serve",
    async configureServer(server) {
      // Dynamic imports only during serve mode
      const { createApp, attachSockets } = await import("./server");
      const { connectDb } = await import("./server/config/db");

      try {
        await connectDb();
      } catch (err) {
        console.error("[healthqueue] MongoDB connection failed — API will error until MONGO_URI is valid:", err);
      }

      const app = createApp();
      server.middlewares.use(app);

      const httpServer = server.httpServer;
      if (httpServer) {
        attachSockets(httpServer as HttpServer);
      }
    },
  };
}
