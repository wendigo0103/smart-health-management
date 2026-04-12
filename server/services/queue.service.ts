import mongoose from "mongoose";
import type { QueueSnapshot, QueueWaitingEntryDto } from "@shared/api";
import { Appointment, type IAppointment } from "../models/Appointment";
import { Queue, type IQueue, type IWaitingEntry } from "../models/Queue";
import { User } from "../models/User";

function genAppointmentToken(): string {
  return `A-${Math.floor(1000 + Math.random() * 9000)}`;
}

export async function ensureQueueForDoctor(doctorId: string): Promise<IQueue> {
  let q = await Queue.findOne({ doctorId });
  if (!q) {
    q = await Queue.create({
      doctorId,
      currentPatientToken: "0",
      waitingList: [],
      estimatedWaitPerPatient: 15,
    });
  }
  return q;
}

async function uniqueToken(): Promise<string> {
  for (let i = 0; i < 8; i++) {
    const t = genAppointmentToken();
    const exists = await Appointment.findOne({ token: t });
    if (!exists) return t;
  }
  return `A-${Date.now()}`;
}

export async function buildQueueSnapshot(doctorId: string): Promise<QueueSnapshot> {
  const q = await Queue.findOne({ doctorId });
  if (!q) {
    return {
      doctorId,
      currentPatientToken: "0",
      waitingList: [],
      estimatedWaitPerPatient: 15,
    };
  }
  const patientIds = q.waitingList.map((w) => w.patientId);
  const users = await User.find({ _id: { $in: patientIds } }).lean();
  const nameById = new Map(users.map((u) => [u._id.toString(), u.name]));

  const waitingList: QueueWaitingEntryDto[] = q.waitingList.map((w: IWaitingEntry) => ({
    patientId: w.patientId.toString(),
    token: w.token,
    status: w.status,
    joinedAt: w.joinedAt.toISOString(),
    patientName: nameById.get(w.patientId.toString()) ?? "Unknown",
  }));

  return {
    doctorId,
    currentPatientToken: q.currentPatientToken,
    waitingList,
    estimatedWaitPerPatient: q.estimatedWaitPerPatient,
  };
}

export async function enqueuePatient(args: {
  doctorId: string;
  patientId: string;
  token: string;
}): Promise<IQueue> {
  const q = await ensureQueueForDoctor(args.doctorId);
  const already = q.waitingList.some(
    (w) =>
      w.token === args.token ||
      (w.patientId.toString() === args.patientId &&
        (w.status === "waiting" || w.status === "called"))
  );
  if (!already) {
    q.waitingList.push({
      patientId: new mongoose.Types.ObjectId(args.patientId),
      token: args.token,
      status: "waiting",
      joinedAt: new Date(),
    });
    await q.save();
  }
  return q;
}

export async function removePatientFromQueue(doctorId: string, patientId: string, token: string): Promise<void> {
  const q = await Queue.findOne({ doctorId });
  if (!q) return;
  q.waitingList = q.waitingList.filter(
    (w) => !(w.patientId.toString() === patientId && w.token === token)
  );
  await q.save();
}

export async function createBookedAppointment(args: {
  patientId: string;
  doctorId: string;
  scheduledAt: Date;
}): Promise<{ appointment: IAppointment; token: string }> {
  const doctor = await User.findById(args.doctorId);
  if (!doctor || doctor.role !== "doctor") {
    throw new Error("INVALID_DOCTOR");
  }
  const token = await uniqueToken();
  const appointment = await Appointment.create({
    patientId: args.patientId,
    doctorId: args.doctorId,
    scheduledAt: args.scheduledAt,
    token,
    status: "confirmed",
  });
  await enqueuePatient({
    doctorId: args.doctorId,
    patientId: args.patientId,
    token,
  });
  return { appointment, token };
}

/**
 * Complete any "called" entry, then promote the next "waiting" to "called".
 * Updates currentPatientToken to the new active token or "0".
 */
export async function callNextPatient(doctorId: string): Promise<IQueue> {
  const q = await ensureQueueForDoctor(doctorId);
  for (const entry of q.waitingList) {
    if (entry.status === "called") {
      entry.status = "completed";
    }
  }
  const next = q.waitingList.find((w) => w.status === "waiting");
  if (next) {
    next.status = "called";
    q.currentPatientToken = next.token;
  } else {
    q.currentPatientToken = "0";
  }
  await q.save();
  return q;
}

/** Mark the active "called" patient as delayed (no-show) and call the next waiting patient. */
export async function markCurrentAbsent(doctorId: string): Promise<IQueue> {
  const q = await ensureQueueForDoctor(doctorId);
  for (const entry of q.waitingList) {
    if (entry.status === "called") {
      entry.status = "delayed";
    }
  }
  const next = q.waitingList.find((w) => w.status === "waiting");
  if (next) {
    next.status = "called";
    q.currentPatientToken = next.token;
  } else {
    q.currentPatientToken = "0";
  }
  await q.save();
  return q;
}
