import mongoose, { Schema, type Document, type Model } from "mongoose";
import type { UserRole } from "@shared/api";

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  name: string;
  phone: string;
  role: UserRole;
  doctorProfile?: {
    displayName?: string;
    specialization?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    name: { type: String, required: true, trim: true },
    phone: { type: String, default: "" },
    role: {
      type: String,
      enum: ["patient", "doctor", "admin"] satisfies UserRole[],
      required: true,
    },
    doctorProfile: {
      displayName: { type: String },
      specialization: { type: String },
    },
  },
  { timestamps: true }
);

export const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
