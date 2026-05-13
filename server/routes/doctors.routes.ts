import { Router, type RequestHandler } from "express";
import type { CreateDoctorBody, DoctorListItem } from "@shared/api";
import { HOSPITALS } from "../../shared/api";
import { requireAuth, requireRole } from "../middleware/auth";
import { hashPassword } from "../services/auth.service";
import { User } from "../models/User";

const router = Router();
const DEFAULT_DOCTOR_PASSWORD = "Doctor123!";

const listDoctors: RequestHandler = async (req, res) => {
  const department = String(req.query.department ?? "").trim();
  const hospitalId = String(req.query.hospitalId ?? "").trim();
  const filter: Record<string, unknown> = { role: "doctor" };
  if (department) {
    filter["doctorProfile.specialization"] = new RegExp(`^${department.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
  }
  if (hospitalId) {
    filter.$or =
      hospitalId === HOSPITALS[0].id
        ? [{ hospitalId }, { hospitalId: { $exists: false } }, { hospitalId: "" }]
        : [{ hospitalId }];
  }
  const doctors = await User.find(filter).sort({ name: 1 }).lean();
  const out: DoctorListItem[] = doctors.map((d) => ({
    id: d._id.toString(),
    name: d.doctorProfile?.displayName || d.name,
    specialization: d.doctorProfile?.specialization || "General",
    hospitalId: d.hospitalId ?? HOSPITALS[0].id,
    hospitalName: HOSPITALS.find((h) => h.id === (d.hospitalId ?? HOSPITALS[0].id))?.name,
    rating: d.doctorProfile?.rating ?? 5,
    averageDelayMinutes: d.doctorProfile?.averageDelayMinutes ?? 0,
    nextAvailableLabel: "Book a slot",
  }));
  res.json(out);
};

const createDoctor: RequestHandler = async (req, res) => {
  const body = req.body as CreateDoctorBody;
  const name = body.name?.trim();
  const email = body.email?.toLowerCase().trim();
  const specialization = body.specialization?.trim();
  const hospitalId = body.hospitalId?.trim();
  if (!name || !email || !specialization || !hospitalId) {
    res.status(400).json({ error: "name, email, specialization, and hospitalId are required" });
    return;
  }
  if (!HOSPITALS.some((h) => h.id === hospitalId)) {
    res.status(400).json({ error: "Select a valid hospital" });
    return;
  }
  const existing = await User.findOne({ email });
  if (existing) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }
  const passwordHash = await hashPassword(body.password || DEFAULT_DOCTOR_PASSWORD);
  const doctor = await User.create({
    email,
    passwordHash,
    name,
    phone: body.phone ?? "",
    role: "doctor",
    hospitalId,
    doctorProfile: {
      displayName: name.startsWith("Dr.") ? name : `Dr. ${name}`,
      specialization,
      rating: 5,
      averageDelayMinutes: 0,
    },
  });
  const out: DoctorListItem = {
    id: doctor._id.toString(),
    name: doctor.doctorProfile?.displayName || doctor.name,
    specialization: doctor.doctorProfile?.specialization || "General",
    hospitalId: doctor.hospitalId,
    hospitalName: HOSPITALS.find((h) => h.id === doctor.hospitalId)?.name,
    rating: doctor.doctorProfile?.rating ?? 5,
    averageDelayMinutes: doctor.doctorProfile?.averageDelayMinutes ?? 0,
    nextAvailableLabel: "Book a slot",
  };
  res.status(201).json(out);
};

router.get("/", listDoctors);
router.post("/", requireAuth, requireRole("admin"), createDoctor);

export default router;
