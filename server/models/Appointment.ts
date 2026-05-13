import mongoose, { Schema, type Document, type Model, type Types } from "mongoose";
import type { AppointmentStatusApi } from "@shared/api";

export interface IAppointment extends Document {
  patientId: Types.ObjectId;
  doctorId: Types.ObjectId;
  scheduledAt: Date;
  token: string;
  status: AppointmentStatusApi;
  createdAt: Date;
  updatedAt: Date;
}

const AppointmentSchema = new Schema<IAppointment>(
  {
    patientId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    doctorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    scheduledAt: { type: Date, required: true },
    token: { type: String, required: true, unique: true, index: true },
    status: {
      type: String,
      enum: ["confirmed", "pending", "cancelled", "completed"] satisfies AppointmentStatusApi[],
      default: "confirmed",
    },
  },
  { timestamps: true }
);

AppointmentSchema.index(
  { doctorId: 1, scheduledAt: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ["confirmed", "pending", "completed"] } },
  }
);

export const Appointment: Model<IAppointment> =
  mongoose.models.Appointment || mongoose.model<IAppointment>("Appointment", AppointmentSchema);
