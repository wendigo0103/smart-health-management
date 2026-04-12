import { useEffect } from "react";
import { toast } from "sonner";
import { Bell, AlertCircle, CheckCircle } from "lucide-react";

export type NotificationType = "info" | "success" | "error" | "warning";

interface NotificationProps {
  type: NotificationType;
  title: string;
  message: string;
  duration?: number;
}

// Helper function to show notifications
export function showNotification({
  type,
  title,
  message,
  duration = 5000,
}: NotificationProps) {
  const icons = {
    info: <Bell size={20} className="text-blue-500" />,
    success: <CheckCircle size={20} className="text-green-500" />,
    error: <AlertCircle size={20} className="text-red-500" />,
    warning: <AlertCircle size={20} className="text-yellow-500" />,
  };

  toast.custom(
    (t) => (
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 flex gap-3">
        <div className="flex-shrink-0">{icons[type]}</div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
          <p className="text-gray-600 text-xs mt-1">{message}</p>
        </div>
      </div>
    ),
    {
      duration: duration,
      position: "top-right",
    }
  );
}

// Component for common notifications
export function QueueNotifications() {
  useEffect(() => {
    // Example notifications - can be triggered based on actual events
    // These would be called from your queue update logic
  }, []);

  return null;
}

// Predefined notification types
export const notifications = {
  appointmentConfirmed: () =>
    showNotification({
      type: "success",
      title: "Appointment Confirmed",
      message: "Your appointment has been successfully booked",
    }),

  turnIsNear: () =>
    showNotification({
      type: "info",
      title: "Your Turn is Near!",
      message: "You are next in queue. Please report to the reception.",
    }),

  doctorDelayed: (minutes: number) =>
    showNotification({
      type: "warning",
      title: "Doctor Delayed",
      message: `Doctor is running ${minutes} minutes late. Updated wait time shown.`,
    }),

  patientCalled: (token: string) =>
    showNotification({
      type: "info",
      title: "Patient Called",
      message: `Token ${token} is now being called to the consultation room.`,
    }),

  queueUpdated: (position: number) =>
    showNotification({
      type: "info",
      title: "Queue Updated",
      message: `You are now ${position} people ahead in queue.`,
    }),

  appointmentCancelled: () =>
    showNotification({
      type: "error",
      title: "Appointment Cancelled",
      message: "Your appointment has been cancelled. Please book again.",
    }),

  bookingSuccess: (token: string) =>
    showNotification({
      type: "success",
      title: "Booking Successful",
      message: `Your appointment token is ${token}. Please save it for future reference.`,
    }),
};
