import { useMemo, useState, useEffect } from "react";
import { apiFetch, ApiError, getStoredUser } from "@/lib/api";
import { getQueueSocket } from "@/lib/socket";
import type { AppointmentDto, DoctorDailyStats } from "@shared/api";
import { toast } from "sonner";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type AppointmentStatus = "Confirmed" | "Pending" | "Cancelled" | "Completed" | "Missed";

export interface AppointmentRow {
  id: string;
  token: string;
  patientName: string;
  appointmentTime: string;
  doctor: string;

  hospitalId?: string;
  hospitalName?: string;

  status: AppointmentStatus;
}

const ALL_DOCTORS_VALUE = "__all__";

function mapDtoToRow(a: AppointmentDto): AppointmentRow {
  const time = new Date(a.scheduledAt).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const statusMap: Record<string, AppointmentStatus> = {
    confirmed: "Confirmed",
    pending: "Pending",
    cancelled: "Cancelled",
    completed: "Completed",
    missed: "Missed",
  };
  return {
    id: a.id,
    token: a.token,
    patientName: a.patientName,
    appointmentTime: time,
    doctor: a.doctorName,
  
    hospitalId: a.hospitalId,
    hospitalName: a.hospitalName,
  
    status: statusMap[a.status] ?? "Pending",
  };
}

function statusBadgeClass(status: AppointmentStatus) {
  switch (status) {
    case "Confirmed":
      return "bg-emerald-100 text-emerald-900 border-0";
    case "Pending":
      return "bg-amber-100 text-amber-900 border-0";
    case "Cancelled":
      return "bg-slate-200 text-slate-700 border-0";
    case "Completed":
      return "bg-blue-100 text-primary border-0";
    case "Missed":
      return "bg-red-100 text-red-700 border-0";
    default:
      return "border-0";
  }
}

export function AppointmentsScreen() {
  const staffUser = getStoredUser();
  const [rows, setRows] = useState<AppointmentRow[]>([]);
  const [search, setSearch] = useState("");
  const [doctorFilter, setDoctorFilter] = useState<string>(ALL_DOCTORS_VALUE);
  const [hospitalFilter, setHospitalFilter] = useState("__all_hospitals__");
  const [doctorStats, setDoctorStats] = useState<DoctorDailyStats[]>([]);

  const loadAppointments = async (cancelled: () => boolean) => {
    const [list, stats] = await Promise.all([
      apiFetch<AppointmentDto[]>("/api/appointments"),
      apiFetch<DoctorDailyStats[]>("/api/appointments/admin/doctor-stats"),
    ]);
    if (!cancelled()) setRows(list.map(mapDtoToRow));
    if (!cancelled()) setDoctorStats(stats);
  };

  useEffect(() => {
    if (!staffUser || staffUser.role !== "admin") {
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        await loadAppointments(() => cancelled);
      } catch {
        if (!cancelled) toast.error("Could not load appointments.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [staffUser]);

  useEffect(() => {
    if (!staffUser || staffUser.role !== "admin") return;
    const s = getQueueSocket();
    if (!s.connected) s.connect();
    s.emit("watchAppointments", undefined);
    const refresh = () => {
      void loadAppointments(() => false);
    };
    s.on("appointmentBooked", refresh);
    return () => {
      s.off("appointmentBooked", refresh);
    };
  }, [staffUser]);

  const doctorOptions = useMemo(() => {
    const set = new Set(rows.map((r) => r.doctor));
    return Array.from(set).sort();
  }, [rows]);

  const hospitalOptions = useMemo(() => {
    return Array.from(
      new Map(
        rows
          .filter((r) => r.hospitalId)
          .map((r) => [
            r.hospitalId,
            {
              id: r.hospitalId!,
              name: r.hospitalName || r.hospitalId!,
            },
          ])
      ).values()
    );
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      const matchesDoctor = doctorFilter === ALL_DOCTORS_VALUE || r.doctor === doctorFilter;
      const matchesHospital = hospitalFilter === "__all_hospitals__" || r.hospitalId === hospitalFilter;
      const matchesSearch =
        q === "" ||
        r.patientName.toLowerCase().includes(q) ||
        r.token.toLowerCase().includes(q);
      return matchesDoctor && matchesHospital && matchesSearch;
    });
  }, [rows, search, doctorFilter]);

  const cancelAppointment = async (id: string) => {
    try {
      await apiFetch(`/api/appointments/${id}/cancel`, { method: "PATCH" });
      setRows((prev) =>
        prev.map((r) => (r.id === id && r.status !== "Cancelled" ? { ...r, status: "Cancelled" as const } : r))
      );
      toast.success("Appointment cancelled");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Cancel failed");
    }
  };

  if (!staffUser || staffUser.role !== "admin") {
    return (
      <p className="text-slate-600">Sign in as an admin to manage appointments.</p>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-slate-600">Search, filter, and manage scheduled visits.</p>

      <div>
        <h2 className="text-lg font-semibold text-slate-900">Today's doctor workload</h2>
        <p className="text-sm text-slate-500">Completed and remaining counts for appointments scheduled today.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {doctorStats.map((stat) => (
          <Card key={stat.doctorId} className="border-slate-200 bg-white">
            <CardContent className="p-5">
              <p className="font-semibold text-slate-900">{stat.doctorName}</p>
              <p className="text-sm text-slate-500 mb-4">{stat.doctorDepartment}</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-md bg-blue-50 p-3">
                  <p className="text-xs text-slate-600">Completed today</p>
                  <p className="text-2xl font-bold text-primary">{stat.completedAppointments}</p>
                </div>
                <div className="rounded-md bg-amber-50 p-3">
                  <p className="text-xs text-slate-600">Remaining today</p>
                  <p className="text-2xl font-bold text-amber-700">{stat.remainingAppointments}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-2 min-w-0">
          <Label htmlFor="appointment-search">Search by patient or token</Label>
          <Input
            id="appointment-search"
            type="search"
            placeholder="Name or token #"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border-slate-200 bg-white max-w-md"
            autoComplete="off"
          />
        </div>
        <div className="w-full sm:w-64 space-y-2">
          <Label htmlFor="hospital-filter">
            Filter by hospital
          </Label>

          <Select
            value={hospitalFilter}
            onValueChange={setHospitalFilter}
          >
            <SelectTrigger
              id="hospital-filter"
              className="border-slate-200 bg-white"
            >
              <SelectValue placeholder="Hospital" />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="__all_hospitals__">
                All hospitals
              </SelectItem>

              {hospitalOptions.map((hospital) => (
                <SelectItem
                  key={hospital.id}
                  value={hospital.id}
                >
                  {hospital.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-full sm:w-64 space-y-2">
          <Label htmlFor="doctor-filter">Filter by doctor</Label>
          <Select value={doctorFilter} onValueChange={setDoctorFilter}>
            <SelectTrigger id="doctor-filter" className="border-slate-200 bg-white" aria-label="Filter by doctor">
              <SelectValue placeholder="Doctor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_DOCTORS_VALUE}>All doctors</SelectItem>
              {doctorOptions.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="border-slate-200 shadow-sm overflow-hidden bg-white">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 hover:bg-slate-50 border-slate-200">
                  <TableHead className="font-semibold text-slate-900">Token #</TableHead>
                  <TableHead className="font-semibold text-slate-900">Patient Name</TableHead>
                  <TableHead className="font-semibold text-slate-900">Appointment Time</TableHead>
                  <TableHead className="font-semibold text-slate-900">Doctor</TableHead>
                  <TableHead className="font-semibold text-slate-900">Status</TableHead>
                  <TableHead className="font-semibold text-slate-900 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-slate-500 py-10">
                      No appointments match your filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((row) => (
                    <TableRow key={row.id} className="border-slate-200">
                      <TableCell className="font-bold text-primary">{row.token}</TableCell>
                      <TableCell className="font-medium text-slate-900">{row.patientName}</TableCell>
                      <TableCell className="text-slate-700">{row.appointmentTime}</TableCell>
                      <TableCell className="text-slate-700">{row.doctor}</TableCell>
                      <TableCell>
                        <Badge className={cn("text-xs font-semibold", statusBadgeClass(row.status))}>
                          {row.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-slate-600 hover:text-destructive disabled:opacity-40"
                            aria-label={`Cancel appointment ${row.token}`}
                            disabled={row.status === "Cancelled"}
                            onClick={() => void cancelAppointment(row.id)}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
