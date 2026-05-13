import mongoose from "mongoose";
import type {
  DoctorAvailabilityStatus,
  QueueSnapshot,
  QueueWaitingEntryDto,
} from "@shared/api";
import { Appointment, type IAppointment } from "../models/Appointment";
import { Queue, type IQueue, type IWaitingEntry } from "../models/Queue";
import { User } from "../models/User";

function appointmentDayRange(scheduledAt: Date): { start: Date; end: Date } {
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(scheduledAt);
  const start = new Date(`${date}T00:00:00.000+05:30`);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

export async function ensureQueueForDoctor(doctorId: string): Promise<IQueue> {
  let q = await Queue.findOne({ doctorId });
  if (!q) {
    q = await Queue.create({
      doctorId,
      currentPatientToken: "0",
      waitingList: [],
      estimatedWaitPerPatient: 15,
      doctorStatus: "on-time",
      delayMinutes: 0,
      statusMessage: "",
    });
  }
  return q;
}

async function nextDailyDoctorToken(doctorId: string, scheduledAt: Date): Promise<string> {
  const { start, end } = appointmentDayRange(scheduledAt);
  const appointments = await Appointment.find({
    doctorId,
    scheduledAt: { $gte: start, $lt: end },
  }).select("token");
  const maxToken = appointments.reduce((max, appointment) => {
    const numeric = Number(appointment.token);
    return Number.isInteger(numeric) && numeric > max ? numeric : max;
  }, 0);
  return String(maxToken + 1);
}

export async function buildQueueSnapshot(doctorId: string): Promise<QueueSnapshot> {
  const q = await Queue.findOne({ doctorId });
  if (!q) {
    return {
      doctorId,
      currentPatientToken: "0",
    waitingList: [],
    estimatedWaitPerPatient: 15,
    doctorStatus: "on-time",
    delayMinutes: 0,
    statusMessage: "",
    };
  }
  const patientIds = q.waitingList.map((w) => w.patientId);
  const users = await User.find({ _id: { $in: patientIds } }).lean();
  const nameById = new Map(users.map((u) => [u._id.toString(), u.name]));

  const waitingList: QueueWaitingEntryDto[] = q.waitingList.map((w: IWaitingEntry) => ({
    appointmentId: w.appointmentId?.toString(),
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
    doctorStatus: q.doctorStatus ?? "on-time",
    delayMinutes: q.delayMinutes ?? 0,
    statusMessage: q.statusMessage ?? "",
  };
}

export async function updateDoctorQueueStatus(args: {
  doctorId: string;
  status: DoctorAvailabilityStatus;
  delayMinutes: number;
  statusMessage: string;
}): Promise<IQueue> {
  const q = await ensureQueueForDoctor(args.doctorId);
  q.doctorStatus = args.status;
  q.delayMinutes = args.status === "delayed" ? Math.max(0, args.delayMinutes) : 0;
  q.statusMessage = args.statusMessage.trim().slice(0, 240);
  if (args.status === "on-time") {
    q.statusMessage = "";
  }
  if (args.status === "unavailable" && !q.statusMessage) {
    q.statusMessage = "Doctor is currently unavailable. Clinic staff will update you shortly.";
  }
  await q.save();
  return q;
}

export async function enqueuePatient(args: {
  appointmentId: string;
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
      appointmentId: new mongoose.Types.ObjectId(args.appointmentId),
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
  const existingSlot = await Appointment.findOne({
    doctorId: args.doctorId,
    scheduledAt: args.scheduledAt,
    status: { $ne: "cancelled" },
  });
  if (existingSlot) {
    throw new Error("SLOT_ALREADY_BOOKED");
  }
  const token = await nextDailyDoctorToken(args.doctorId, args.scheduledAt);
  let appointment: IAppointment;
  try {
    appointment = await Appointment.create({
      patientId: args.patientId,
      doctorId: args.doctorId,
      scheduledAt: args.scheduledAt,
      token,
      status: "confirmed",
    });
  } catch (e) {
    if ((e as { code?: number }).code === 11000) {
      throw new Error("SLOT_ALREADY_BOOKED");
    }
    throw e;
  }
  await enqueuePatient({
    appointmentId: appointment._id.toString(),
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
  const completedTokens: string[] = [];
  const completedAppointmentIds: mongoose.Types.ObjectId[] = [];
  for (const entry of q.waitingList) {
    if (entry.status === "called") {
      entry.status = "completed";
      if (entry.appointmentId) {
        completedAppointmentIds.push(entry.appointmentId);
      } else {
        completedTokens.push(entry.token);
      }
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
  if (completedAppointmentIds.length) {
    await Appointment.updateMany(
      { _id: { $in: completedAppointmentIds }, status: { $ne: "cancelled" } },
      { $set: { status: "completed" } }
    );
  }
  if (completedTokens.length) {
    await Appointment.updateMany(
      { doctorId, token: { $in: completedTokens }, status: { $ne: "cancelled" } },
      { $set: { status: "completed" } }
    );
  }
  return q;
}

/** Mark the active "called" patient as delayed (no-show) and call the next waiting patient. */
export async function markCurrentAbsent(doctorId: string): Promise<IQueue> {
  const q = await ensureQueueForDoctor(doctorId);
  const current = q.waitingList.find((w) => w.status === "called");
  const next = q.waitingList.find((w) => w.status === "waiting");
  if (!current || !next) {
    return q;
  }
  current.status = "delayed";
  if (current.appointmentId) {
    await Appointment.updateOne(
      { _id: current.appointmentId, status: { $ne: "cancelled" } },
      { $set: { status: "missed" } }
    );
  } else {
    await Appointment.updateOne(
      { doctorId, patientId: current.patientId, token: current.token, status: { $ne: "cancelled" } },
      { $set: { status: "missed" } }
    );
  }
  next.status = "called";
  q.currentPatientToken = next.token;
  await q.save();
  return q;
}
