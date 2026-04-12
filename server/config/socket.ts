import type { Server as HttpServer } from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import type { UserRole } from "@shared/api";
import { getJwtSecret } from "../services/auth.service";
import { setIo } from "../services/realtime.service";
import { Queue } from "../models/Queue";
import { User } from "../models/User";

export function initSocket(httpServer: HttpServer): void {
  const io = new Server(httpServer, {
    path: "/socket.io/",
    cors: { origin: true, credentials: true },
  });
  setIo(io);

  io.use((socket, next) => {
    const token = (socket.handshake.auth as { token?: string })?.token;
    if (!token) {
      next(new Error("Unauthorized"));
      return;
    }
    try {
      const payload = jwt.verify(token, getJwtSecret()) as { userId: string; role: UserRole };
      socket.data.userId = payload.userId;
      socket.data.role = payload.role;
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    socket.on(
      "joinQueue",
      async (payload: { doctorId: string; token: string }, ack?: (r: unknown) => void) => {
        try {
          const userId = socket.data.userId as string;
          const { doctorId, token } = payload;
          const queue = await Queue.findOne({ doctorId });
          if (!queue) {
            ack?.({ error: "queue_not_found" });
            return;
          }
          const entry = queue.waitingList.find((w) => w.token === token);
          if (!entry) {
            ack?.({ error: "token_not_in_queue" });
            return;
          }
          if (entry.patientId.toString() !== userId) {
            ack?.({ error: "forbidden" });
            return;
          }
          await socket.join(`doctor:${doctorId}`);
          ack?.({ ok: true });
        } catch (e) {
          ack?.({ error: String(e) });
        }
      }
    );

    socket.on("watchQueue", async (payload: { doctorId: string }, ack?: (r: unknown) => void) => {
      try {
        const userId = socket.data.userId as string;
        const role = socket.data.role as UserRole;
        const { doctorId } = payload;
        const user = await User.findById(userId);
        if (!user) {
          ack?.({ error: "user_not_found" });
          return;
        }
        if (role === "admin" || (role === "doctor" && userId === doctorId)) {
          await socket.join(`doctor:${doctorId}`);
          ack?.({ ok: true });
          return;
        }
        ack?.({ error: "forbidden" });
      } catch (e) {
        ack?.({ error: String(e) });
      }
    });
  });
}
