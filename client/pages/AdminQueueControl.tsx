import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DashboardLayout } from "@/components/admin/DashboardLayout";
import { CheckCircle, UserX } from "lucide-react";
import { apiFetch, ApiError, getStoredUser, getToken } from "@/lib/api";
import { getQueueSocket } from "@/lib/socket";
import type { DoctorQueueSnapshot, QueueSnapshot } from "@shared/api";
import { toast } from "sonner";

export default function AdminQueueControl() {
  const user = getStoredUser();
  const [queues, setQueues] = useState<DoctorQueueSnapshot[]>([]);

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

  const sortedQueues = useMemo(
    () => [...queues].sort((a, b) => a.doctorName.localeCompare(b.doctorName)),
    [queues]
  );

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

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {sortedQueues.map((queue) => {
            const current = queue.waitingList.find((w) => w.status === "called");
            const waiting = queue.waitingList.filter((w) => w.status === "waiting");
            return (
              <Card key={queue.doctorId} className="border-slate-200 bg-white">
                <CardHeader>
                  <CardTitle className="flex flex-col gap-1">
                    <span>{queue.doctorName}</span>
                    <span className="text-sm font-normal text-slate-500">{queue.doctorDepartment}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
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
