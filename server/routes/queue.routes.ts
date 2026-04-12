import { Router, type RequestHandler } from "express";
import mongoose from "mongoose";
import { requireAuth, requireRole } from "../middleware/auth";
import {
  buildQueueSnapshot,
  callNextPatient,
  markCurrentAbsent,
} from "../services/queue.service";
import { broadcastQueueUpdate } from "../services/realtime.service";

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

router.get("/:doctorId", getQueue);
router.post("/:doctorId/next", requireAuth, requireRole("doctor", "admin"), postNext);
router.post("/:doctorId/absent", requireAuth, requireRole("doctor", "admin"), postAbsent);

export default router;
