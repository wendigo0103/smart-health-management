import { Router, type RequestHandler } from "express";
import mongoose from "mongoose";
import type { ActiveQueueEntry, DoctorQueueSnapshot, UpdateDoctorStatusBody } from "@shared/api";
import { requireAuth, requireRole } from "../middleware/auth";
import {
  buildQueueSnapshot,
  callNextPatient,
  markCurrentAbsent,
  updateDoctorQueueStatus,
} from "../services/queue.service";
import { broadcastQueueUpdate } from "../services/realtime.service";
import { User } from "../models/User";
import { HOSPITALS } from "@shared/api";

const router = Router();

function canManageQueue(userId: string, role: import("@shared/api").UserRole, doctorId: string): boolean {
  if (role === "admin") return true;
  if (role === "doctor" && userId === doctorId) return true;
  return false;
}

const getQueue: RequestHandler = async (req, res) => {
  const doctorId = String(req.params.doctorId ?? "");
  if (!mongoose.Types.ObjectId.isValid(doctorId)) {
    res.status(400).json({ error: "invalid doctorId" });
    return;
  }
  const snapshot = await buildQueueSnapshot(doctorId);
  res.json(snapshot);
};

const getAllDoctorQueues: RequestHandler = async (_req, res) => {
  const doctors = await User.find({ role: "doctor" }).sort({ name: 1 }).lean();
  const out: DoctorQueueSnapshot[] = await Promise.all(
    doctors.map(async (doctor) => {
      const doctorId = doctor._id.toString();
      const snapshot = await buildQueueSnapshot(doctorId);
      return {
        ...snapshot,
        doctorName: doctor.doctorProfile?.displayName || doctor.name,
        doctorDepartment: doctor.doctorProfile?.specialization || "General",
        hospitalId: doctor.hospitalId,

        hospitalName:
          HOSPITALS.find((h) => h.id === doctor.hospitalId)?.name ||
          "Unknown Hospital",
      };
    })
  );
  res.json(out);
};

const getActiveQueue: RequestHandler = async (_req, res) => {
  const doctors = await User.find({ role: "doctor" }).sort({ name: 1 }).lean();
  const snapshots = await Promise.all(
    doctors.map(async (doctor) => {
      const doctorId = doctor._id.toString();
      return {
        doctor,
        snapshot: await buildQueueSnapshot(doctorId),
      };
    })
  );
  const rows: ActiveQueueEntry[] = snapshots.flatMap(({ doctor, snapshot }) =>
    snapshot.waitingList
      .filter((entry) => entry.status === "waiting" || entry.status === "called")
      .map((entry) => ({
        doctorId: snapshot.doctorId,
        doctorName: doctor.doctorProfile?.displayName || doctor.name,
        doctorDepartment: doctor.doctorProfile?.specialization || "General",
        patientId: entry.patientId,
        patientName: entry.patientName,
        token: entry.token,
        status: entry.status,
        joinedAt: entry.joinedAt,
      }))
  );
  rows.sort((a, b) => new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime());
  res.json(rows);
};

const postNext: RequestHandler = async (req, res) => {
  const doctorId = String(req.params.doctorId ?? "");
  if (!mongoose.Types.ObjectId.isValid(doctorId)) {
    res.status(400).json({ error: "invalid doctorId" });
    return;
  }
  const { id, role } = req.authUser!;
  if (!canManageQueue(id, role, doctorId)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  await callNextPatient(doctorId);
  await broadcastQueueUpdate(doctorId);
  res.json(await buildQueueSnapshot(doctorId));
};

const postAbsent: RequestHandler = async (req, res) => {
  const doctorId = String(req.params.doctorId ?? "");
  if (!mongoose.Types.ObjectId.isValid(doctorId)) {
    res.status(400).json({ error: "invalid doctorId" });
    return;
  }
  const { id, role } = req.authUser!;
  if (!canManageQueue(id, role, doctorId)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  await markCurrentAbsent(doctorId);
  await broadcastQueueUpdate(doctorId);
  res.json(await buildQueueSnapshot(doctorId));
};

const patchDoctorStatus: RequestHandler = async (req, res) => {
  const doctorId = String(req.params.doctorId ?? "");
  if (!mongoose.Types.ObjectId.isValid(doctorId)) {
    res.status(400).json({ error: "invalid doctorId" });
    return;
  }
  const { id, role } = req.authUser!;
  if (!canManageQueue(id, role, doctorId)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const body = req.body as UpdateDoctorStatusBody;
  if (!["on-time", "delayed", "unavailable"].includes(body.status)) {
    res.status(400).json({ error: "Invalid doctor status" });
    return;
  }
  await updateDoctorQueueStatus({
    doctorId,
    status: body.status,
    delayMinutes: Number(body.delayMinutes ?? 0),
    statusMessage: String(body.statusMessage ?? ""),
  });
  await broadcastQueueUpdate(doctorId);
  res.json(await buildQueueSnapshot(doctorId));
};

router.get("/admin/all", requireAuth, requireRole("admin"), getAllDoctorQueues);
router.get("/admin/active", requireAuth, requireRole("admin"), getActiveQueue);
router.get("/:doctorId", requireAuth, getQueue);
router.post("/:doctorId/next", requireAuth, requireRole("admin"), postNext);
router.post("/:doctorId/absent", requireAuth, requireRole("admin"), postAbsent);
router.patch("/:doctorId/status", requireAuth, requireRole("admin"), patchDoctorStatus);

export default router;
