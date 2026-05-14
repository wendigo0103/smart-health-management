import mongoose, { Schema, type Document, type Model, type Types } from "mongoose";

export type NotificationType =
  | "queue_called"
  | "doctor_delayed"
  | "doctor_unavailable"
  | "appointment_confirmed"
  | "appointment_missed";

export interface INotification extends Document {
  userId: Types.ObjectId;

  title: string;

  message: string;

  type: NotificationType;

  read: boolean;

  createdAt: Date;

  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    message: {
      type: String,
      required: true,
      trim: true,
    },

    type: {
      type: String,
      enum: [
        "queue_called",
        "doctor_delayed",
        "doctor_unavailable",
        "appointment_confirmed",
        "appointment_missed",
      ],
      required: true,
    },

    read: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

NotificationSchema.index({ userId: 1, createdAt: -1 });

export const Notification: Model<INotification> =
  mongoose.models.Notification ||
  mongoose.model<INotification>(
    "Notification",
    NotificationSchema
  );