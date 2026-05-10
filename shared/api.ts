/**
 * Shared contracts for REST + Socket.io between client and server
 */

export type UserRole = "patient" | "doctor" | "admin";
export type RegisterableRole = "patient" | "admin";

export const BOOKING_WINDOW_DAYS = 14;
export const CLINIC_TIME_SLOTS = [
  "9:00 AM",
  "9:30 AM",
  "10:00 AM",
  "10:30 AM",
  "11:00 AM",
  "11:30 AM",
  "2:00 PM",
  "2:30 PM",
  "3:00 PM",
  "3:30 PM",
  "4:00 PM",
  "4:30 PM",
  "5:00 PM",
] as const;

export interface DemoResponse {
  message: string;
}

export interface UserPublic {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: UserRole;
  doctorProfile?: {
    displayName?: string;
    specialization?: string;
  };
}

export interface AuthResponse {
  token: string;
  user: UserPublic;
}

export type AppointmentStatusApi = "confirmed" | "pending" | "cancelled" | "completed" | "missed";

export interface AppointmentDto {
  id: string;
  patientId: string;
  doctorId: string;
  patientName: string;
  doctorName: string;
  doctorDepartment: string;
  scheduledAt: string;
  token: string;
  status: AppointmentStatusApi;
  createdAt?: string;
}

export type QueueWaitingStatus = "waiting" | "called" | "completed" | "delayed";
export type DoctorAvailabilityStatus = "on-time" | "delayed" | "unavailable";

export interface QueueWaitingEntryDto {
  appointmentId?: string;
  patientId: string;
  token: string;
  status: QueueWaitingStatus;
  joinedAt: string;
  patientName: string;
}

export interface QueueSnapshot {
  doctorId: string;
  currentPatientToken: string;
  waitingList: QueueWaitingEntryDto[];
  estimatedWaitPerPatient: number;
  doctorStatus: DoctorAvailabilityStatus;
  delayMinutes: number;
  statusMessage: string;
}

export interface UpdateDoctorStatusBody {
  status: DoctorAvailabilityStatus;
  delayMinutes?: number;
  statusMessage?: string;
}

/** Server → client after queue mutations */
export interface QueueUpdatedEvent extends QueueSnapshot {}

export interface DoctorListItem {
  id: string;
  name: string;
  specialization: string;
  nextAvailableLabel?: string;
}

export interface RegisterBody {
  email: string;
  password: string;
  name: string;
  phone?: string;
  role: RegisterableRole;
}

export interface LoginBody {
  email: string;
  password: string;
}

export interface CreateAppointmentBody {
  doctorId: string;
  scheduledAt: string;
}

export interface CreateAppointmentResponse {
  appointment: AppointmentDto;
  queue: QueueSnapshot;
}

export interface BookedSlotsResponse {
  doctorId: string;
  date: string;
  slots: string[];
}

export interface AnalyticsSummary {
  totalAppointmentsToday: number;
  completedToday: number;
  remainingToday: number;
  cancelledToday: number;
  completionRate: number;
  peakHour: string;
  patientsPerHour: { hour: string; count: number }[];
  statusDistribution: { status: AppointmentStatusApi; count: number; percentage: number }[];
}

export interface ActiveQueueEntry {
  doctorId: string;
  doctorName: string;
  doctorDepartment: string;
  patientId: string;
  patientName: string;
  token: string;
  status: QueueWaitingStatus;
  joinedAt: string;
}

export interface DoctorQueueSnapshot extends QueueSnapshot {
  doctorName: string;
  doctorDepartment: string;
}

export interface DoctorDailyStats {
  doctorId: string;
  doctorName: string;
  doctorDepartment: string;
  completedAppointments: number;
  remainingAppointments: number;
  totalAppointments: number;
}
