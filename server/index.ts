import "dotenv/config";
import express from "express";
import cors from "cors";
import type { Server as HttpServer } from "http";
import { handleDemo } from "./routes/demo";
import authRoutes from "./routes/auth.routes";
import doctorsRoutes from "./routes/doctors.routes";
import appointmentsRoutes from "./routes/appointments.routes";
import queueRoutes from "./routes/queue.routes";
import { initSocket } from "./config/socket";
import { getIo } from "./services/realtime.service";

/**
 * Express app (REST). Mount Socket.io on the same HTTP server via `attachSockets`.
 */
export function createApp(): express.Express {
  const app = express();

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

  return app;
}

/** Attach Socket.io once per HTTP server (dev + production). */
export function attachSockets(httpServer: HttpServer): void {
  if (getIo()) {
    return;
  }
  initSocket(httpServer);
}
