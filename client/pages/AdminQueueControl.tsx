import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DashboardLayout } from "@/components/admin/DashboardLayout";
import { CheckCircle, UserX } from "lucide-react";
import { apiFetch, ApiError, getStoredUser, getToken } from "@/lib/api";
import { getQueueSocket } from "@/lib/socket";
import type {
  DoctorAvailabilityStatus,
  DoctorQueueSnapshot,
  QueueSnapshot,
  UpdateDoctorStatusBody,
} from "@shared/api";
import { toast } from "sonner";

type StatusDraft = {
  status: DoctorAvailabilityStatus;
  delayMinutes: string;
  statusMessage: string;
};

export default function AdminQueueControl() {
  const user = getStoredUser();
  const [queues, setQueues] = useState<DoctorQueueSnapshot[]>([]);
  const [statusDrafts, setStatusDrafts] = useState<Record<string, StatusDraft>>({});
  const [selectedHospital, setSelectedHospital] = useState("all");

  const loadQueues = useCallback(async () => {
    try {
      setQueues(await apiFetch<DoctorQueueSnapshot[]>("/api/queue/admin/all"));
    } catch {
      toast.error("Could not load doctor queues.");
    }
  }, []);

  useEffect(() => {
    if (!user || user.role !== "admin") return;
    void loadQueues();
  }, [loadQueues, user]);

  useEffect(() => {
    setStatusDrafts((prev) => {
      const next = { ...prev };
      for (const q of queues) {
        if (!next[q.doctorId]) {
          next[q.doctorId] = {
            status: q.doctorStatus,
            delayMinutes: String(q.delayMinutes || 0),
            statusMessage: q.statusMessage,
          };
        }
      }
      return next;
    });
  }, [queues]);

  useEffect(() => {
    if (!user || user.role !== "admin" || queues.length === 0) return;
    const token = getToken();
    if (!token) return;
    const socket = getQueueSocket();
    (socket as unknown as { auth: { token: string } }).auth = { token };
    if (!socket.connected) socket.connect();
    queues.forEach((q) => socket.emit("watchQueue", { doctorId: q.doctorId }));
    const onUpdate = (snapshot: QueueSnapshot) => {
      setQueues((prev) =>
        prev.map((q) =>
          q.doctorId === snapshot.doctorId
            ? { ...snapshot, doctorName: q.doctorName, doctorDepartment: q.doctorDepartment }
            : q
        )
      );
      if (document.hidden && snapshot.currentPatientToken !== "0") {
        document.title = `Now serving ${snapshot.currentPatientToken}`;
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("Queue updated", { body: `Now serving ${snapshot.currentPatientToken}` });
        }
      }
    };
    socket.on("queueUpdated", onUpdate);
    return () => {
      socket.off("queueUpdated", onUpdate);
      document.title = "HealthQueue";
    };
  }, [queues.length, user]);

  const requestNotifications = async () => {
    if (!("Notification" in window)) {
      toast.error("This browser does not support tab notifications.");
      return;
    }
    const permission = await Notification.requestPermission();
    toast.message(permission === "granted" ? "Notifications enabled" : "Notifications not enabled");
  };

  const advanceQueue = async (doctorId: string, action: "next" | "absent") => {
    try {
      const snapshot = await apiFetch<QueueSnapshot>(`/api/queue/${doctorId}/${action}`, {
        method: "POST",
      });
      setQueues((prev) =>
        prev.map((q) =>
          q.doctorId === doctorId ? { ...snapshot, doctorName: q.doctorName, doctorDepartment: q.doctorDepartment } : q
        )
      );
      toast.success(action === "next" ? "Called next patient" : "Marked absent");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Queue update failed");
    }
  };

  const updateStatusDraft = (doctorId: string, patch: Partial<StatusDraft>) => {
    setStatusDrafts((prev) => ({
      ...prev,
      [doctorId]: {
        status: "on-time",
        delayMinutes: "0",
        statusMessage: "",
        ...prev[doctorId],
        ...patch,
      },
    }));
  };

  const saveDoctorStatus = async (doctorId: string) => {
    const draft = statusDrafts[doctorId];
    if (!draft) return;
    try {
      const body: UpdateDoctorStatusBody = {
        status: draft.status,
        delayMinutes: Number(draft.delayMinutes || 0),
        statusMessage: draft.statusMessage,
      };
      const snapshot = await apiFetch<QueueSnapshot>(`/api/queue/${doctorId}/status`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      setQueues((prev) =>
        prev.map((q) =>
          q.doctorId === doctorId ? { ...snapshot, doctorName: q.doctorName, doctorDepartment: q.doctorDepartment } : q
        )
      );
      toast.success("Patients notified");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not update doctor status");
    }
  };

  const hospitals = useMemo(() => {
    return Array.from(
      new Map(
        queues
          .filter((q) => q.hospitalId)
          .map((q) => [
            q.hospitalId,
            {
              id: q.hospitalId!,
              name: q.hospitalName || q.hospitalId!,
            },
          ])
      ).values()
    );
  }, [queues]);

  const sortedQueues = useMemo(() => {
    return [...queues]
      .filter((q) => {
        if (selectedHospital === "all") {
          return true;
        }

        return q.hospitalId === selectedHospital;
      })
      .sort((a, b) => a.doctorName.localeCompare(b.doctorName));
  }, [queues, selectedHospital]); 

  if (!user || user.role !== "admin") {
    return (
      <DashboardLayout>
        <p className="text-slate-600">Sign in as an admin to use queue control.</p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Queue Control</h1>
            <p className="text-gray-600 mt-2">One queue row for each doctor.</p>
          </div>
          <Button type="button" variant="outline" onClick={() => void requestNotifications()}>
            Enable notifications
          </Button>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">

        <div className="w-full sm:w-80">
          <Label className="mb-2 block">
            Filter by Hospital
          </Label>

          <Select
            value={selectedHospital}
            onValueChange={setSelectedHospital}
          >
            <SelectTrigger className="bg-white">
              <SelectValue placeholder="Select hospital" />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="all">
                All Hospitals
              </SelectItem>

              {hospitals.map((hospital) => (
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

      </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {sortedQueues.map((queue) => {
            const current = queue.waitingList.find((w) => w.status === "called");
            const waiting = queue.waitingList.filter((w) => w.status === "waiting");
            const completed = queue.waitingList.filter(
              (w) => w.status === "completed"
            );
            
            const missed = queue.waitingList.filter(
              (w) => w.status === "missed"
            );
            
            const servingCount = current ? 1 : 0;
            const draft = statusDrafts[queue.doctorId] ?? {
              status: queue.doctorStatus,
              delayMinutes: String(queue.delayMinutes || 0),
              statusMessage: queue.statusMessage,
            };
            return (
              <Card key={queue.doctorId} className="border-slate-200 bg-white">
                <CardHeader>
                  <CardTitle className="flex flex-col gap-1">
                    <span className="flex items-center justify-between gap-3">
                      <span>{queue.doctorName}</span>
                      <Badge
                        className={
                          queue.doctorStatus === "unavailable"
                            ? "bg-red-100 text-red-700 border-0"
                            : queue.doctorStatus === "delayed"
                              ? "bg-amber-100 text-amber-800 border-0"
                              : "bg-emerald-100 text-emerald-800 border-0"
                        }
                      >
                        {queue.doctorStatus === "on-time" ? "On time" : queue.doctorStatus}
                      </Badge>
                    </span>
                    <span className="text-sm font-normal text-slate-500">{queue.doctorDepartment} - {queue.hospitalName}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg border border-slate-200 p-4 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-[1fr_110px] gap-3">
                      <div className="space-y-2">
                        <Label>Status</Label>
                        <Select
                          value={draft.status}
                          onValueChange={(value: DoctorAvailabilityStatus) =>
                            updateStatusDraft(queue.doctorId, { status: value })
                          }
                        >
                          <SelectTrigger className="bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="on-time">On time</SelectItem>
                            <SelectItem value="delayed">Delayed</SelectItem>
                            <SelectItem value="unavailable">Unavailable</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Delay min</Label>
                        <Input
                          type="number"
                          min={0}
                          value={draft.delayMinutes}
                          disabled={draft.status !== "delayed"}
                          onChange={(e) => updateStatusDraft(queue.doctorId, { delayMinutes: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Patient message</Label>
                      <Input
                        value={draft.statusMessage}
                        placeholder="Example: Doctor is running 30 minutes late."
                        disabled={draft.status === "on-time"}
                        onChange={(e) => updateStatusDraft(queue.doctorId, { statusMessage: e.target.value })}
                      />
                    </div>
                    <Button type="button" variant="outline" onClick={() => void saveDoctorStatus(queue.doctorId)}>
                      Broadcast status
                    </Button>
                  </div>

                  <div className="rounded-lg border border-slate-200 p-4">
                    <p className="text-sm text-slate-500 mb-1">Currently serving</p>
                    {current ? (
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-2xl font-bold text-primary">{current.token}</p>
                          <p className="text-sm font-medium text-slate-900">{current.patientName}</p>
                        </div>
                        <Badge className="bg-blue-100 text-primary border-0">Called</Badge>
                      </div>
                    ) : (
                      <p className="text-slate-600">No patient currently called.</p>
                    )}
                  </div>

                  {/* Queue statistics */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-center">
                      <p className="text-xs text-slate-500">Waiting</p>
                      <p className="text-2xl font-bold text-primary">
                        {waiting.length}
                      </p>
                    </div>

                    <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-center">
                      <p className="text-xs text-slate-500">Serving</p>
                      <p className="text-2xl font-bold text-blue-700">
                        {servingCount}
                      </p>
                    </div>

                    <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-center">
                      <p className="text-xs text-slate-500">Completed</p>
                      <p className="text-2xl font-bold text-emerald-700">
                        {completed.length}
                      </p>
                    </div>

                    <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-center">
                      <p className="text-xs text-slate-500">Missed</p>
                      <p className="text-2xl font-bold text-red-700">
                        {missed.length}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-slate-900">Waiting ({waiting.length})</p>
                    {waiting.length === 0 ? (
                      <p className="text-sm text-slate-500">No waiting patients.</p>
                    ) : (
                      waiting.map((entry) => (
                        <div key={entry.token} className="flex items-center justify-between rounded-md bg-slate-50 p-3">
                          <div>
                            <p className="font-bold text-primary">{entry.token}</p>
                            <p className="text-sm text-slate-700">{entry.patientName}</p>
                          </div>
                          <Badge className="bg-slate-200 text-slate-700 border-0">Waiting</Badge>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                    <Button onClick={() => void advanceQueue(queue.doctorId, "next")} className="gap-2">
                      <CheckCircle size={18} />
                      Done / Call Next
                    </Button>
                    <Button
                      onClick={() => void advanceQueue(queue.doctorId, "absent")}
                      variant="outline"
                      disabled={!current || waiting.length === 0}
                      className="gap-2 border-red-300 text-red-600 hover:bg-red-50"
                    >
                      <UserX size={18} />
                      Patient Absent
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}
