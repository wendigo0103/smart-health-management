/**
 * Shared contracts for REST + Socket.io between client and server
 */

export type UserRole = "patient" | "doctor" | "admin";

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

export type AppointmentStatusApi = "confirmed" | "pending" | "cancelled";

export interface AppointmentDto {
  id: string;
  patientId: string;
  doctorId: string;
  patientName: string;
  doctorName: string;
  scheduledAt: string;
  token: string;
  status: AppointmentStatusApi;
  createdAt?: string;
}

export type QueueWaitingStatus = "waiting" | "called" | "completed" | "delayed";

export interface QueueWaitingEntryDto {
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
  role?: UserRole;
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
