import type { Server } from "socket.io";
import { buildQueueSnapshot } from "./queue.service";

let io: Server | null = null;

export function setIo(server: Server): void {
  io = server;
}

export function getIo(): Server | null {
  return io;
}

export function emitNotification(userId: string, payload: unknown) {
  const io = getIo();

  if (!io) return;

  io.to(`user:${userId}`).emit("notification", payload);
}

export async function broadcastQueueUpdate(doctorId: string): Promise<void> {
  if (!io) return;
  const snapshot = await buildQueueSnapshot(doctorId);
  io.to(`doctor:${doctorId}`).emit("queueUpdated", snapshot);
  io.to(`doctor:${doctorId}`).emit("queueNotification", {
    title: "HealthQueue",
    body:
      snapshot.doctorStatus === "delayed"
        ? `Doctor is running ${snapshot.delayMinutes} minutes late.`
        : snapshot.doctorStatus === "unavailable"
          ? "Doctor is currently unavailable."
          : `Queue updated. Current token: ${snapshot.currentPatientToken}`,
    doctorId,
  });
}

export function broadcastAppointmentBooked(doctorId: string): void {
  if (!io) return;
  io.to("appointments:admin").emit("appointmentBooked", { doctorId });
  io.to(`appointments:doctor:${doctorId}`).emit("appointmentBooked", { doctorId });
  io.to(`doctor:${doctorId}`).emit("appointmentBooked", { doctorId });
}
