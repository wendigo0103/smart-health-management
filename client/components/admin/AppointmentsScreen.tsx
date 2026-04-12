import { useMemo, useState, useEffect } from "react";
import { apiFetch, ApiError, getStoredUser } from "@/lib/api";
import type { AppointmentDto } from "@shared/api";
import { toast } from "sonner";
import { Pencil, XCircle } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type AppointmentStatus = "Confirmed" | "Pending" | "Cancelled";

export interface AppointmentRow {
  id: string;
  token: string;
  patientName: string;
  appointmentTime: string;
  doctor: string;
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
  };
  return {
    id: a.id,
    token: a.token,
    patientName: a.patientName,
    appointmentTime: time,
    doctor: a.doctorName,
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
    default:
      return "border-0";
  }
}

export function AppointmentsScreen() {
  const staffUser = getStoredUser();
  const [rows, setRows] = useState<AppointmentRow[]>([]);
  const [search, setSearch] = useState("");
  const [doctorFilter, setDoctorFilter] = useState<string>(ALL_DOCTORS_VALUE);
  const [editRow, setEditRow] = useState<AppointmentRow | null>(null);

  useEffect(() => {
    if (!staffUser || (staffUser.role !== "doctor" && staffUser.role !== "admin")) {
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const list = await apiFetch<AppointmentDto[]>("/api/appointments");
        if (!cancelled) setRows(list.map(mapDtoToRow));
      } catch {
        if (!cancelled) toast.error("Could not load appointments.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [staffUser]);

  const doctorOptions = useMemo(() => {
    const set = new Set(rows.map((r) => r.doctor));
    return Array.from(set).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      const matchesDoctor = doctorFilter === ALL_DOCTORS_VALUE || r.doctor === doctorFilter;
      const matchesSearch =
        q === "" ||
        r.patientName.toLowerCase().includes(q) ||
        r.token.toLowerCase().includes(q);
      return matchesDoctor && matchesSearch;
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

  if (!staffUser || (staffUser.role !== "doctor" && staffUser.role !== "admin")) {
    return (
      <p className="text-slate-600">Sign in as a doctor or admin to manage appointments.</p>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-slate-600">Search, filter, and manage scheduled visits.</p>

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
                            className="text-slate-600 hover:text-primary"
                            aria-label={`Edit appointment ${row.token}`}
                            onClick={() => setEditRow(row)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
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

      <Dialog open={editRow !== null} onOpenChange={(open) => !open && setEditRow(null)}>
        <DialogContent className="border-slate-200">
          <DialogHeader>
            <DialogTitle>Appointment details</DialogTitle>
            <DialogDescription>
              Review-only preview for demo. Connect to your API to edit fields.
            </DialogDescription>
          </DialogHeader>
          {editRow && (
            <dl className="grid grid-cols-1 gap-3 text-sm">
              <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
                <dt className="text-slate-500">Token</dt>
                <dd className="font-medium text-slate-900">{editRow.token}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
                <dt className="text-slate-500">Patient</dt>
                <dd className="font-medium text-slate-900">{editRow.patientName}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
                <dt className="text-slate-500">Time</dt>
                <dd className="font-medium text-slate-900">{editRow.appointmentTime}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
                <dt className="text-slate-500">Doctor</dt>
                <dd className="font-medium text-slate-900">{editRow.doctor}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Status</dt>
                <dd>
                  <Badge className={cn("text-xs font-semibold", statusBadgeClass(editRow.status))}>
                    {editRow.status}
                  </Badge>
                </dd>
              </div>
            </dl>
          )}
          <DialogFooter>
            <Button type="button" onClick={() => setEditRow(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
