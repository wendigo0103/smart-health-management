import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { UserRole } from "@shared/api";
import { User, type IUser } from "../models/User";
import type { UserPublic } from "@shared/api";

const SALT_ROUNDS = 10;

export function getJwtSecret(): string {
  const s = process.env.JWT_SECRET;
  if (!s) {
    throw new Error("JWT_SECRET is not set");
  }
  return s;
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function signToken(userId: string, role: UserRole): string {
  return jwt.sign({ userId, role }, getJwtSecret(), { expiresIn: "7d" });
}

export function userToPublic(user: IUser): UserPublic {
  return {
    id: user._id.toString(),
    email: user.email,
    name: user.name,
    phone: user.phone || "",
    role: user.role,
    doctorProfile: user.doctorProfile
      ? {
          displayName: user.doctorProfile.displayName,
          specialization: user.doctorProfile.specialization,
          rating: user.doctorProfile.rating,
          averageDelayMinutes: user.doctorProfile.averageDelayMinutes,
        }
      : undefined,
    hospitalId: user.hospitalId,
  };
}

export async function createUser(data: {
  email: string;
  password: string;
  name: string;
  phone?: string;
  role: UserRole;
  hospitalId?: string;
}): Promise<IUser> {
  const passwordHash = await hashPassword(data.password);
  const doc = await User.create({
    email: data.email,
    passwordHash,
    name: data.name,
    phone: data.phone ?? "",
    role: data.role,
    hospitalId: data.hospitalId,
    doctorProfile:
      data.role === "doctor"
        ? { displayName: data.name, specialization: "General" }
        : undefined,
  });
  return doc;
}

export async function findUserByEmailWithSecret(email: string): Promise<IUser | null> {
  return User.findOne({ email: email.toLowerCase().trim() }).select("+passwordHash");
}
