import mongoose, { Schema, type Document, type Model, type Types } from "mongoose";
import type { QueueWaitingStatus } from "@shared/api";

export interface IWaitingEntry {
  patientId: Types.ObjectId;
  token: string;
  status: QueueWaitingStatus;
  joinedAt: Date;
}

export interface IQueue extends Document {
  doctorId: Types.ObjectId;
  currentPatientToken: string;
  waitingList: IWaitingEntry[];
  estimatedWaitPerPatient: number;
  createdAt: Date;
  updatedAt: Date;
}

const WaitingEntrySchema = new Schema<IWaitingEntry>(
  {
    patientId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    token: { type: String, required: true },
    status: {
      type: String,
      enum: ["waiting", "called", "completed", "delayed"] satisfies QueueWaitingStatus[],
      default: "waiting",
    },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const QueueSchema = new Schema<IQueue>(
  {
    doctorId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    currentPatientToken: { type: String, default: "0" },
    waitingList: { type: [WaitingEntrySchema], default: [] },
    estimatedWaitPerPatient: { type: Number, default: 15 },
  },
  { timestamps: true }
);

export const Queue: Model<IQueue> = mongoose.models.Queue || mongoose.model<IQueue>("Queue", QueueSchema);
