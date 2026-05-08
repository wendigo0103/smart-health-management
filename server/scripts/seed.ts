import "dotenv/config";
import { connectDb } from "../config/db";
import { User } from "../models/User";
import { hashPassword } from "../services/auth.service";

const DEMO_PASSWORD = "Doctor123!";

async function main() {
  await connectDb();

  const seeds = [
    {
      email: "dr.sarah@healthqueue.demo",
      name: "Sarah Chen",
      role: "doctor" as const,
      specialization: "Cardiology",
    },
    {
      email: "dr.michael@healthqueue.demo",
      name: "Michael Chen",
      role: "doctor" as const,
      specialization: "General Medicine",
    },
    {
      email: "dr.priya@healthqueue.demo",
      name: "Priya Nair",
      role: "doctor" as const,
      specialization: "Dermatology",
    },
    {
      email: "dr.arjun@healthqueue.demo",
      name: "Arjun Mehta",
      role: "doctor" as const,
      specialization: "ENT",
    },
    {
      email: "dr.nisha@healthqueue.demo",
      name: "Nisha Rao",
      role: "doctor" as const,
      specialization: "Ophthalmology",
    },
    {
      email: "dr.vikram@healthqueue.demo",
      name: "Vikram Iyer",
      role: "doctor" as const,
      specialization: "Neurology",
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
