import path from "node:path";
import { createServer as createHttpServer } from "http";
import * as express from "express";
import { connectDb } from "./config/db";
import { createApp, attachSockets } from "./index";

const __dirname = import.meta.dirname;
const distPath = path.join(__dirname, "../spa");

async function main() {
  await connectDb();

  const app = createApp();
  const httpServer = createHttpServer(app);
  attachSockets(httpServer);

  app.use(express.static(distPath));

  app.get("*", (req, res) => {
    if (req.path.startsWith("/api/") || req.path.startsWith("/health")) {
      return res.status(404).json({ error: "API endpoint not found" });
    }
    res.sendFile(path.join(distPath, "index.html"));
  });

  const port = Number(process.env.PORT) || 8080;
  httpServer.listen(port, () => {
    console.log(`Fusion Starter server running on port ${port}`);
    console.log(`Frontend: http://localhost:${port}`);
    console.log(`API: http://localhost:${port}/api`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

process.on("SIGTERM", () => process.exit(0));
process.on("SIGINT", () => process.exit(0));
