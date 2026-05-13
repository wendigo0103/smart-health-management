import "dotenv/config";
import { connectDb } from "../config/db";
import { User } from "../models/User";
import { hashPassword } from "../services/auth.service";
import { HOSPITALS } from "../../shared/api";

const DEMO_PASSWORD = "Doctor123!";

async function main() {
  await connectDb();

  const seeds = [
    {
      email: "dr.sarah@healthqueue.demo",
      name: "Sarah Chen",
      role: "doctor" as const,
      specialization: "Cardiology",
      hospitalId: HOSPITALS[0].id,
    },
    {
      email: "dr.rohan@healthqueue.demo",
      name: "Rohan Kapoor",
      role: "doctor" as const,
      specialization: "Cardiology",
      hospitalId: HOSPITALS[1].id,
    },
    {
      email: "dr.ananya@healthqueue.demo",
      name: "Ananya Shah",
      role: "doctor" as const,
      specialization: "Cardiology",
      hospitalId: HOSPITALS[2].id,
    },
    {
      email: "dr.michael@healthqueue.demo",
      name: "Michael Chen",
      role: "doctor" as const,
      specialization: "General Medicine",
      hospitalId: HOSPITALS[0].id,
    },
    {
      email: "dr.kavita@healthqueue.demo",
      name: "Kavita Menon",
      role: "doctor" as const,
      specialization: "General Medicine",
      hospitalId: HOSPITALS[1].id,
    },
    {
      email: "dr.sameer@healthqueue.demo",
      name: "Sameer Kulkarni",
      role: "doctor" as const,
      specialization: "General Medicine",
      hospitalId: HOSPITALS[2].id,
    },
    {
      email: "dr.priya@healthqueue.demo",
      name: "Priya Nair",
      role: "doctor" as const,
      specialization: "Dermatology",
      hospitalId: HOSPITALS[0].id,
    },
    {
      email: "dr.isha@healthqueue.demo",
      name: "Isha Verma",
      role: "doctor" as const,
      specialization: "Dermatology",
      hospitalId: HOSPITALS[1].id,
    },
    {
      email: "dr.neel@healthqueue.demo",
      name: "Neel Reddy",
      role: "doctor" as const,
      specialization: "Dermatology",
      hospitalId: HOSPITALS[2].id,
    },
    {
      email: "dr.arjun@healthqueue.demo",
      name: "Arjun Mehta",
      role: "doctor" as const,
      specialization: "ENT",
      hospitalId: HOSPITALS[0].id,
    },
    {
      email: "dr.farhan@healthqueue.demo",
      name: "Farhan Ali",
      role: "doctor" as const,
      specialization: "ENT",
      hospitalId: HOSPITALS[1].id,
    },
    {
      email: "dr.meera@healthqueue.demo",
      name: "Meera Krishnan",
      role: "doctor" as const,
      specialization: "ENT",
      hospitalId: HOSPITALS[2].id,
    },
    {
      email: "dr.nisha@healthqueue.demo",
      name: "Nisha Rao",
      role: "doctor" as const,
      specialization: "Ophthalmology",
      hospitalId: HOSPITALS[0].id,
    },
    {
      email: "dr.dev@healthqueue.demo",
      name: "Dev Malhotra",
      role: "doctor" as const,
      specialization: "Ophthalmology",
      hospitalId: HOSPITALS[1].id,
    },
    {
      email: "dr.leela@healthqueue.demo",
      name: "Leela Suresh",
      role: "doctor" as const,
      specialization: "Ophthalmology",
      hospitalId: HOSPITALS[2].id,
    },
    {
      email: "dr.vikram@healthqueue.demo",
      name: "Vikram Iyer",
      role: "doctor" as const,
      specialization: "Neurology",
      hospitalId: HOSPITALS[0].id,
    },
    {
      email: "dr.advait@healthqueue.demo",
      name: "Advait Rao",
      role: "doctor" as const,
      specialization: "Neurology",
      hospitalId: HOSPITALS[1].id,
    },
    {
      email: "dr.tara@healthqueue.demo",
      name: "Tara Bose",
      role: "doctor" as const,
      specialization: "Neurology",
      hospitalId: HOSPITALS[2].id,
    },
    {
      email: "admin@healthqueue.demo",
      name: "Queue Admin",
      role: "admin" as const,
      specialization: "Administration",
    },
  ];

  for (const s of seeds) {
    const existing = await User.findOne({ email: s.email });
    if (existing) {
      if (existing.role === "doctor" && !existing.hospitalId) {
        existing.hospitalId = s.hospitalId ?? HOSPITALS[0].id;
        await existing.save();
      }
      console.log("Skip (exists):", s.email);
      continue;
    }
    const passwordHash = await hashPassword(DEMO_PASSWORD);
    await User.create({
      email: s.email,
      passwordHash,
      name: s.name,
      phone: "",
      role: s.role,
      hospitalId: s.role === "doctor" ? s.hospitalId ?? HOSPITALS[0].id : undefined,
      doctorProfile:
        s.role === "doctor"
          ? { displayName: `Dr. ${s.name}`, specialization: s.specialization }
          : undefined,
    });
    console.log("Created:", s.email);
  }

  console.log("\nDone. Demo password for all new accounts:", DEMO_PASSWORD);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
