import mongoose, { Schema, type Document, type Model } from "mongoose";
import type { UserRole } from "@shared/api";

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  name: string;
  phone: string;
  role: UserRole;
  hospitalId?: string;
  doctorProfile?: {
    displayName?: string;
    specialization?: string;
    rating?: number;
    averageDelayMinutes?: number;
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
    hospitalId: { type: String, trim: true, index: true },
    role: {
      type: String,
      enum: ["patient", "doctor", "admin"] satisfies UserRole[],
      required: true,
    },
    doctorProfile: {
      displayName: { type: String },
      specialization: { type: String },
      rating: { type: Number, default: 5, min: 0, max: 5 },
      averageDelayMinutes: { type: Number, default: 0, min: 0 },
    },
  },
  { timestamps: true }
);

export const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
