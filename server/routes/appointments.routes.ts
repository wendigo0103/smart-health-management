import { Router, type RequestHandler } from "express";
import mongoose from "mongoose";
import type { AppointmentDto, CreateAppointmentBody, CreateAppointmentResponse } from "@shared/api";
import { requireAuth, requireRole } from "../middleware/auth";
import { Appointment } from "../models/Appointment";
import { User } from "../models/User";
import {
  buildQueueSnapshot,
  createBookedAppointment,
  removePatientFromQueue,
} from "../services/queue.service";
import { broadcastQueueUpdate } from "../services/realtime.service";

const router = Router();

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
    scheduledAt: doc.scheduledAt.toISOString(),
    token: doc.token,
    status: doc.status,
    createdAt: doc.createdAt?.toISOString(),
  };
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
  try {
    const { appointment } = await createBookedAppointment({
      patientId: req.authUser!.id,
      doctorId: body.doctorId,
      scheduledAt,
    });
    await broadcastQueueUpdate(body.doctorId);
    const dto = await toDto(appointment);
    const queue = await buildQueueSnapshot(body.doctorId);
    const out: CreateAppointmentResponse = { appointment: dto, queue };
    res.status(201).json(out);
  } catch (e) {
    if (e instanceof Error && e.message === "INVALID_DOCTOR") {
      res.status(400).json({ error: "Invalid doctor" });
      return;
    }
    throw e;
  }
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

router.post("/", requireAuth, requireRole("patient"), createAppointment);
router.get("/", requireAuth, requireRole("patient", "doctor", "admin"), listAppointments);
router.patch("/:id/cancel", requireAuth, requireRole("patient", "doctor", "admin"), cancelAppointment);

export default router;
