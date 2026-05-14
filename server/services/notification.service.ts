import { Notification } from "../models/Notification";

export async function createNotification(args: {
  userId: string;

  title: string;

  message: string;

  type:
    | "queue_called"
    | "doctor_delayed"
    | "doctor_unavailable"
    | "appointment_confirmed"
    | "appointment_missed";
}) {
  return Notification.create({
    userId: args.userId,

    title: args.title,

    message: args.message,

    type: args.type,

    read: false,
  });
}