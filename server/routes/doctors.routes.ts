import { Router, type RequestHandler } from "express";
import type { DoctorListItem } from "@shared/api";
import { User } from "../models/User";

const router = Router();

const listDoctors: RequestHandler = async (_req, res) => {
  const doctors = await User.find({ role: "doctor" }).sort({ name: 1 }).lean();
  const out: DoctorListItem[] = doctors.map((d) => ({
    id: d._id.toString(),
    name: d.doctorProfile?.displayName || d.name,
    specialization: d.doctorProfile?.specialization || "General",
    nextAvailableLabel: "Book a slot",
  }));
  res.json(out);
};

router.get("/", listDoctors);

export default router;
