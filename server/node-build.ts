import path from "node:path";
import { createServer as createHttpServer } from "http";
import express from "express";
import cors from "cors";
import { connectDb } from "./config/db";
import authRoutes from "./routes/auth.routes";
import doctorsRoutes from "./routes/doctors.routes";
import appointmentsRoutes from "./routes/appointments.routes";
import queueRoutes from "./routes/queue.routes";
import { handleDemo } from "./routes/demo";
import { initSocket } from "./config/socket";
import { getIo } from "./services/realtime.service";

const __dirname = import.meta.dirname;
const distPath = path.join(__dirname, "../dist/spa");

async function main() {
  await connectDb();

  const app = express();

  // Static file serving (must be before API routes)
  app.use(express.static(distPath));

  // SPA fallback - for non-API routes that don't match static files
  app.use((req, res, next) => {
    if (req.path.startsWith("/api/") || req.path.startsWith("/health") || req.path.startsWith("/socket.io/")) {
      return next();
    }
    res.sendFile(path.join(distPath, "index.html"));
  });

  // API middleware and routes
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);

  app.use("/api/auth", authRoutes);
  app.use("/api/doctors", doctorsRoutes);
  app.use("/api/appointments", appointmentsRoutes);
  app.use("/api/queue", queueRoutes);

  // 404 handler for API routes
  app.use((req, res, next) => {
    if (req.path.startsWith("/api/")) {
      return res.status(404).json({ error: "API endpoint not found" });
    }
    next();
  });

  const httpServer = createHttpServer(app);

  // Attach Socket.io
  if (!getIo()) {
    initSocket(httpServer);
  }

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
