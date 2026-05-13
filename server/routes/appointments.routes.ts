import { Router, type RequestHandler } from "express";
import mongoose from "mongoose";
import type {
  AnalyticsSummary,
  AppointmentDto,
  BookedSlotsResponse,
  CreateAppointmentBody,
  CreateAppointmentResponse,
  DoctorDailyStats,
  AppointmentStatusApi,
} from "@shared/api";
import { BOOKING_WINDOW_DAYS, CLINIC_TIME_SLOTS, HOSPITALS } from "../../shared/api";
import { requireAuth, requireRole } from "../middleware/auth";
import { Appointment } from "../models/Appointment";
import { User } from "../models/User";
import {
  buildQueueSnapshot,
  createBookedAppointment,
  removePatientFromQueue,
} from "../services/queue.service";
import { broadcastAppointmentBooked, broadcastQueueUpdate } from "../services/realtime.service";

const router = Router();
const ACTIVE_APPOINTMENT_STATUSES = ["confirmed", "pending"] as const;

async function toDto(doc: import("../models/Appointment").IAppointment): Promise<AppointmentDto> {
  const [patient, doctor] = await Promise.all([
    User.findById(doc.patientId).lean(),
    User.findById(doc.doctorId).lean(),
  ]);
  return {
    id: doc._id.toString(),
    patientId: doc.patientId.toString(),
    doctorId: doc.doctorId.toString(),
    patientName: patient?.name ?? "Unknown",
    doctorName: doctor?.doctorProfile?.displayName || doctor?.name || "Unknown",
    doctorDepartment: doctor?.doctorProfile?.specialization || "General",
    hospitalId: doc.hospitalId || doctor?.hospitalId,
    hospitalName: HOSPITALS.find((h) => h.id === (doc.hospitalId || doctor?.hospitalId))?.name,
    scheduledAt: doc.scheduledAt.toISOString(),
    token: doc.token,
    status: doc.status,
    createdAt: doc.createdAt?.toISOString(),
  };
}

function dayRange(dateInput?: string): { start: Date; end: Date; date: string } {
  const source =
    dateInput && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)
      ? dateInput
      : new Intl.DateTimeFormat("en-CA", {
          timeZone: "Asia/Kolkata",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(new Date());
  const start = new Date(`${source}T00:00:00.000+05:30`);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end, date: source };
}

function timeLabel(d: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

function maxBookableAt(): Date {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  end.setDate(end.getDate() + BOOKING_WINDOW_DAYS - 1);
  return end;
}

function isClinicSlot(d: Date): boolean {
  const label = d.toLocaleTimeString("en-US", {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return (CLINIC_TIME_SLOTS as readonly string[]).includes(label);
}

const createAppointment: RequestHandler = async (req, res) => {
  const body = req.body as CreateAppointmentBody;
  if (!body.doctorId || !body.scheduledAt) {
    res.status(400).json({ error: "doctorId and scheduledAt required" });
    return;
  }
  if (!mongoose.Types.ObjectId.isValid(body.doctorId)) {
    res.status(400).json({ error: "invalid doctorId" });
    return;
  }
  const scheduledAt = new Date(body.scheduledAt);
  if (Number.isNaN(scheduledAt.getTime())) {
    res.status(400).json({ error: "invalid scheduledAt" });
    return;
  }
  if (scheduledAt.getTime() < Date.now()) {
    res.status(400).json({ error: "Cannot book appointments in the past" });
    return;
  }
  if (scheduledAt.getTime() > maxBookableAt().getTime()) {
    res.status(400).json({ error: `Appointments can be booked up to ${BOOKING_WINDOW_DAYS} days in advance` });
    return;
  }
  if (!isClinicSlot(scheduledAt)) {
    res.status(400).json({ error: "Select an available clinic time slot" });
    return;
  }
  try {
    const { appointment } = await createBookedAppointment({
      patientId: req.authUser!.id,
      doctorId: body.doctorId,
      hospitalId: body.hospitalId,
      scheduledAt,
    });
    await broadcastQueueUpdate(body.doctorId);
    broadcastAppointmentBooked(body.doctorId);
    const dto = await toDto(appointment);
    const queue = await buildQueueSnapshot(body.doctorId);
    const out: CreateAppointmentResponse = { appointment: dto, queue };
    res.status(201).json(out);
  } catch (e) {
    if (e instanceof Error && e.message === "INVALID_DOCTOR") {
      res.status(400).json({ error: "Invalid doctor" });
      return;
    }
    if (e instanceof Error && e.message === "SLOT_ALREADY_BOOKED") {
      res.status(409).json({ error: "This time slot is already booked" });
      return;
    }
    if (e instanceof Error && e.message === "DOCTOR_HOSPITAL_MISMATCH") {
      res.status(400).json({ error: "Selected doctor does not belong to this hospital" });
      return;
    }
    if (e instanceof Error && e.message === "PATIENT_SLOT_CONFLICT") {
      res.status(409).json({ error: "You already have an appointment at this time" });
      return;
    }
    throw e;
  }
};

const bookedSlots: RequestHandler = async (req, res) => {
  const doctorId = String(req.query.doctorId ?? "");
  const date = String(req.query.date ?? "");
  if (!mongoose.Types.ObjectId.isValid(doctorId) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    res.status(400).json({ error: "doctorId and date=YYYY-MM-DD are required" });
    return;
  }
  const { start, end } = dayRange(date);
  const [doctorDocs, patientDocs] = await Promise.all([
    Appointment.find({
      doctorId,
      scheduledAt: { $gte: start, $lt: end },
      status: { $in: ACTIVE_APPOINTMENT_STATUSES },
    }).select("scheduledAt"),
    Appointment.find({
      patientId: req.authUser!.id,
      scheduledAt: { $gte: start, $lt: end },
      status: { $in: ACTIVE_APPOINTMENT_STATUSES },
    }).select("scheduledAt"),
  ]);
  const doctorBookedSlots = doctorDocs.map((d) => timeLabel(d.scheduledAt));
  const patientBookedSlots = patientDocs.map((d) => timeLabel(d.scheduledAt));
  const out: BookedSlotsResponse = {
    doctorId,
    date,
    slots: Array.from(new Set([...doctorBookedSlots, ...patientBookedSlots])),
    doctorBookedSlots,
    patientBookedSlots,
  };
  res.json(out);
};

const listAppointments: RequestHandler = async (req, res) => {
  const { role, id } = req.authUser!;
  let filter: Record<string, unknown> = {};
  if (role === "patient") {
    filter = { patientId: id };
  } else if (role === "doctor") {
    filter = { doctorId: id };
  }
  const doctorIdQuery = req.query.doctorId as string | undefined;
  if (role === "admin" && doctorIdQuery && mongoose.Types.ObjectId.isValid(doctorIdQuery)) {
    filter = { doctorId: doctorIdQuery };
  } else if (role === "admin" && !doctorIdQuery) {
    filter = {};
  }
  const docs = await Appointment.find(filter).sort({ scheduledAt: -1 }).limit(200);
  const dtos: AppointmentDto[] = await Promise.all(docs.map((d) => toDto(d)));
  res.json(dtos);
};

const cancelAppointment: RequestHandler = async (req, res) => {
  const id = String(req.params.id ?? "");
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json({ error: "invalid id" });
    return;
  }
  const appt = await Appointment.findById(id);
  if (!appt) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const { role, id: userId } = req.authUser!;
  if (role === "patient" && appt.patientId.toString() !== userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  if (role === "doctor" && appt.doctorId.toString() !== userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  appt.status = "cancelled";
  await appt.save();
  await removePatientFromQueue(appt.doctorId.toString(), appt.patientId.toString(), appt.token);
  await broadcastQueueUpdate(appt.doctorId.toString());
  res.json(await toDto(appt));
};

const analytics: RequestHandler = async (req, res) => {
  const { start, end } = dayRange(String(req.query.date ?? ""));
  const match = { scheduledAt: { $gte: start, $lt: end } };

  const [statusCounts, hourlyCounts] = await Promise.all([
    Appointment.aggregate<{ _id: AppointmentStatusApi; count: number }>([
      { $match: match },
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    Appointment.aggregate<{ _id: number; count: number }>([
      { $match: match },
      {
        $group: {
          _id: { $hour: { date: "$scheduledAt", timezone: "+05:30" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ]);

  const total = statusCounts.reduce((sum, s) => sum + s.count, 0);
  const countFor = (status: AppointmentStatusApi) =>
    statusCounts.find((s) => s._id === status)?.count ?? 0;
  const completed = countFor("completed");
  const cancelled = countFor("cancelled");
  const remaining = countFor("confirmed") + countFor("pending");
  const peak = hourlyCounts.reduce((best, item) => (item.count > best.count ? item : best), {
    _id: 0,
    count: 0,
  });

  const out: AnalyticsSummary = {
    totalAppointmentsToday: total,
    completedToday: completed,
    remainingToday: remaining,
    cancelledToday: cancelled,
    completionRate: total ? Math.round((completed / total) * 100) : 0,
    peakHour: peak.count ? `${String(peak._id).padStart(2, "0")}:00` : "No bookings",
    patientsPerHour: hourlyCounts.map((h) => ({
      hour: `${String(h._id).padStart(2, "0")}:00`,
      count: h.count,
    })),
    statusDistribution: statusCounts.map((s) => ({
      status: s._id,
      count: s.count,
      percentage: total ? Math.round((s.count / total) * 100) : 0,
    })),
  };
  res.json(out);
};

const doctorDailyStats: RequestHandler = async (req, res) => {
  const { start, end } = dayRange(String(req.query.date ?? ""));
  const [doctors, grouped] = await Promise.all([
    User.find({ role: "doctor" }).sort({ name: 1 }).lean(),
    Appointment.aggregate<{ _id: { doctorId: mongoose.Types.ObjectId; status: AppointmentStatusApi }; count: number }>([
      { $match: { scheduledAt: { $gte: start, $lt: end }, status: { $ne: "cancelled" } } },
      { $group: { _id: { doctorId: "$doctorId", status: "$status" }, count: { $sum: 1 } } },
    ]),
  ]);
  const key = (doctorId: string, status: AppointmentStatusApi) => `${doctorId}:${status}`;
  const counts = new Map(grouped.map((g) => [key(g._id.doctorId.toString(), g._id.status), g.count]));
  const out: DoctorDailyStats[] = doctors.map((d) => {
    const doctorId = d._id.toString();
    const completedAppointments = counts.get(key(doctorId, "completed")) ?? 0;
    const remainingAppointments =
      (counts.get(key(doctorId, "confirmed")) ?? 0) + (counts.get(key(doctorId, "pending")) ?? 0);
    return {
      doctorId,
      doctorName: d.doctorProfile?.displayName || d.name,
      doctorDepartment: d.doctorProfile?.specialization || "General",
      completedAppointments,
      remainingAppointments,
      totalAppointments: completedAppointments + remainingAppointments,
    };
  });
  res.json(out);
};

router.post("/", requireAuth, requireRole("patient"), createAppointment);
router.get("/", requireAuth, requireRole("patient", "doctor", "admin"), listAppointments);
router.get("/booked-slots", requireAuth, requireRole("patient", "admin"), bookedSlots);
router.get("/admin/analytics", requireAuth, requireRole("admin"), analytics);
router.get("/admin/doctor-stats", requireAuth, requireRole("admin"), doctorDailyStats);
router.patch("/:id/cancel", requireAuth, requireRole("patient", "doctor", "admin"), cancelAppointment);

export default router;
