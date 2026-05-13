import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import MainLayout from "@/components/layout/MainLayout";
import { Calendar, Clock, Route, Stethoscope } from "lucide-react";
import { apiFetch, getStoredUser } from "@/lib/api";
import type { AppointmentDto } from "@shared/api";
import { toast } from "sonner";

function statusClass(status: AppointmentDto["status"]) {
  switch (status) {
    case "completed":
      return "bg-emerald-100 text-emerald-900";
    case "cancelled":
      return "bg-slate-200 text-slate-700";
    case "pending":
      return "bg-amber-100 text-amber-900";
    case "missed":
      return "bg-red-100 text-red-700";
    default:
      return "bg-blue-100 text-primary";
  }
}

function AppointmentCard({
  appointment,
  onReschedule,
  onOpenBooking,
  clickable = true,
}: {
  appointment: AppointmentDto;
  onReschedule: () => void;
  onOpenBooking: () => void;
  clickable?: boolean;
}) {
  const when = new Date(appointment.scheduledAt);
  return (
    <Card
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : -1}
      onClick={clickable ? onOpenBooking : undefined}
      onKeyDown={(e) => {
        if (
          clickable &&
          (e.key === "Enter" || e.key === " ")
        ) {
          onOpenBooking();
        }
      }}
      className={`
        border border-gray-200 shadow-sm transition-all
        ${clickable ? "cursor-pointer hover:border-primary hover:shadow-md" : ""}
      `}
    >
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-3 min-w-0">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar size={16} className="text-primary" />
              <span>
                {when.toLocaleDateString(undefined, { dateStyle: "medium" })} at{" "}
                {when.toLocaleTimeString(undefined, { timeStyle: "short" })}
              </span>
            </div>
            <div>
              <p className="font-semibold text-gray-900">{appointment.doctorName}</p>
              <p className="text-sm text-gray-600">{appointment.doctorDepartment} - {appointment.hospitalName}</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock size={16} className="text-primary" />
              <span>Token {appointment.token}</span>
            </div>
          </div>
          <Badge className={`${statusClass(appointment.status)} border-0 capitalize w-fit`}>
            {appointment.status}
          </Badge>
          {appointment.status === "missed" && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                onReschedule();
              }}
            >
              Reschedule
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const user = getStoredUser();
  const [appointments, setAppointments] = useState<AppointmentDto[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAppointments = useCallback(async () => {
    try {
      const list = await apiFetch<AppointmentDto[]>("/api/appointments");
      setAppointments(list);
    } catch {
      toast.error("Could not load your appointments.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAppointments();
    const onFocus = () => void loadAppointments();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [loadAppointments]);

  const { upcoming, past } = useMemo(() => {
    const now = Date.now();
    const active = appointments.filter((a) => a.status !== "cancelled");
    return {
      upcoming: active
        .filter((a) => a.status !== "completed" && a.status !== "missed" && new Date(a.scheduledAt).getTime() >= now)
        .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()),
      past: appointments
        .filter((a) => a.status === "completed" || a.status === "missed" || new Date(a.scheduledAt).getTime() < now)
        .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()),
    };
  }, [appointments]);

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Welcome Back, {user?.name ?? "Patient"}</h1>
            <p className="text-gray-600 mt-2">Your appointments and visit history.</p>
          </div>
          <Button onClick={() => navigate("/book-appointment")} className="bg-primary text-white gap-2">
            <Stethoscope size={18} />
            Book Appointment
          </Button>
          <Button onClick={() => navigate("/queue")} variant="outline" className="gap-2">
            <Route size={18} />
            Track Queue
          </Button>
        </div>

        {loading ? (
          <p className="text-gray-600">Loading appointments...</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Upcoming Appointments
              </h2>

              <div className="space-y-3">
                {upcoming.length === 0 ? (
                  <Card className="border border-gray-200">
                    <CardContent className="p-6 text-gray-600">
                      No upcoming appointments.
                    </CardContent>
                  </Card>
                ) : (
                  upcoming.map((appointment) => (
                    <AppointmentCard
                      key={appointment.id}
                      appointment={appointment}
                      onReschedule={() => navigate("/book-appointment")}
                      onOpenBooking={() => navigate(`/queue`)}
                    />
                  ))
                )}
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Past Appointments
              </h2>

              <div className="space-y-3">
                {past.length === 0 ? (
                  <Card className="border border-gray-200">
                    <CardContent className="p-6 text-gray-600">
                      No past appointments yet.
                    </CardContent>
                  </Card>
                ) : (
                  past.map((appointment) => (
                    <AppointmentCard
                      key={appointment.id}
                      appointment={appointment}
                      onReschedule={() => {}}

                      // Empty function = no navigation
                      onOpenBooking={() => {}}
                      clickable={false}
                    />
                  ))
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
