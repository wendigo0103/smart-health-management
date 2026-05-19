import "dotenv/config";
import { existsSync } from "node:fs";
import path from "node:path";
import { createServer as createHttpServer } from "http";
import express from "express";
import { connectDb } from "./config/db";
import { validateProductionEnv } from "./config/env";
import { attachSockets, createApp } from "./index";

const __dirname = import.meta.dirname;
const distPath = path.join(__dirname, "../dist/spa");
const hasClientBuild = existsSync(path.join(distPath, "index.html"));

async function main() {
  validateProductionEnv();
  await connectDb();

  const app = createApp();

  if (hasClientBuild) {
    // Static client assets for a single-service deployment.
    app.use(express.static(distPath));

    // SPA fallback - only for non-API and non-socket routes.
    app.use((req, res, next) => {
      if (
        req.path.startsWith("/api/") ||
        req.path.startsWith("/health") ||
        req.path.startsWith("/socket.io/")
      ) {
        return next();
      }
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // 404 handler for API routes
  app.use((req, res, next) => {
    if (req.path.startsWith("/api/")) {
      return res.status(404).json({ error: "API endpoint not found" });
    }
    next();
  });

  const httpServer = createHttpServer(app);

  attachSockets(httpServer);

  const port = Number(process.env.PORT) || 8080;
  httpServer.listen(port, () => {
    console.log(`HealthQueue server running on port ${port}`);
    console.log(`Client assets: ${hasClientBuild ? distPath : "not bundled in this deployment"}`);
    console.log(`API: http://localhost:${port}/api`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

process.on("SIGTERM", () => process.exit(0));
process.on("SIGINT", () => process.exit(0));
