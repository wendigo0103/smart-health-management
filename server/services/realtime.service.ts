import type { Server } from "socket.io";
import { buildQueueSnapshot } from "./queue.service";

let io: Server | null = null;

export function setIo(server: Server): void {
  io = server;
}

export function getIo(): Server | null {
  return io;
}

export async function broadcastQueueUpdate(doctorId: string): Promise<void> {
  if (!io) return;
  const snapshot = await buildQueueSnapshot(doctorId);
  io.to(`doctor:${doctorId}`).emit("queueUpdated", snapshot);
}
