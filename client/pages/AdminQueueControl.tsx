import { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DashboardLayout } from "@/components/admin/DashboardLayout";
import { CheckCircle, User, Clock } from "lucide-react";
import { apiFetch, ApiError, getStoredUser, getToken } from "@/lib/api";
import { getQueueSocket } from "@/lib/socket";
import type { DoctorListItem, QueueSnapshot } from "@shared/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function AdminQueueControl() {
  const user = getStoredUser();
  const [doctors, setDoctors] = useState<DoctorListItem[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>(
    user?.role === "doctor" ? user.id : ""
  );
  const [snapshot, setSnapshot] = useState<QueueSnapshot | null>(null);
  const [delayMinutes, setDelayMinutes] = useState(0);

  useEffect(() => {
    if (!user || (user.role !== "doctor" && user.role !== "admin")) return;
    let cancelled = false;
    (async () => {
      try {
        const list = await apiFetch<DoctorListItem[]>("/api/doctors");
        if (!cancelled) {
          setDoctors(list);
          if (user.role === "doctor") {
            setSelectedDoctorId(user.id);
          } else if (list.length && !selectedDoctorId) {
            setSelectedDoctorId(list[0].id);
          }
        }
      } catch {
        if (!cancelled) toast.error("Could not load doctors.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const loadQueue = useCallback(async (doctorId: string) => {
    if (!doctorId) return;
    try {
      const snap = await apiFetch<QueueSnapshot>(`/api/queue/${doctorId}`);
      setSnapshot(snap);
    } catch {
      toast.error("Could not load queue.");
    }
  }, []);

  useEffect(() => {
    if (!selectedDoctorId) return;
    void loadQueue(selectedDoctorId);
  }, [selectedDoctorId, loadQueue]);

  useEffect(() => {
    if (!selectedDoctorId || !user || (user.role !== "doctor" && user.role !== "admin")) return;
    const token = getToken();
    if (!token) return;
    const s = getQueueSocket();
    (s as unknown as { auth: { token: string } }).auth = { token };
    if (!s.connected) s.connect();
    s.emit("watchQueue", { doctorId: selectedDoctorId }, (ack: unknown) => {
      const r = ack as { error?: string; ok?: boolean };
      if (r?.error) {
        toast.error("Live updates unavailable.");
      }
    });
    const onUpd = (snap: QueueSnapshot) => {
      if (snap.doctorId === selectedDoctorId) {
        setSnapshot(snap);
      }
    };
    s.on("queueUpdated", onUpd);
    return () => {
      s.off("queueUpdated", onUpd);
    };
  }, [selectedDoctorId, user]);

  const waitingOnly = useMemo(() => {
    if (!snapshot) return [];
    return snapshot.waitingList
      .filter((w) => w.status === "waiting")
      .sort((a, b) => new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime());
  }, [snapshot]);

  const currentEntry = useMemo(() => {
    if (!snapshot) return null;
    return (
      snapshot.waitingList.find((w) => w.status === "called") ??
      snapshot.waitingList.find((w) => w.token === snapshot.currentPatientToken && snapshot.currentPatientToken !== "0")
    );
  }, [snapshot]);

  const doctorLabel =
    doctors.find((d) => d.id === selectedDoctorId)?.name ?? "Doctor";

  const handleDoneCallNext = async () => {
    if (!selectedDoctorId) return;
    try {
      const snap = await apiFetch<QueueSnapshot>(`/api/queue/${selectedDoctorId}/next`, {
        method: "POST",
      });
      setSnapshot(snap);
      toast.success("Called next patient");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Request failed";
      toast.error(msg);
    }
  };

  const handlePatientAbsent = async () => {
    if (!selectedDoctorId) return;
    try {
      const snap = await apiFetch<QueueSnapshot>(`/api/queue/${selectedDoctorId}/absent`, {
        method: "POST",
      });
      setSnapshot(snap);
      toast.success("Marked absent and advanced queue");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Request failed";
      toast.error(msg);
    }
  };

  const handleAddDelay = () => {
    if (delayMinutes > 0) {
      toast.message(`Delay of ${delayMinutes} min recorded locally (no SMS in this demo).`);
    }
  };

  if (!user || (user.role !== "doctor" && user.role !== "admin")) {
    return (
      <DashboardLayout>
        <p className="text-slate-600">Sign in as a doctor or admin to use queue control.</p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Queue Control Panel</h1>
          <p className="text-gray-600 mt-2">Manage the live queue; patients update in real time.</p>
        </div>

        {user.role === "admin" && (
          <div className="max-w-md space-y-2">
            <Label htmlFor="qc-doctor">Doctor queue</Label>
            <Select value={selectedDoctorId || undefined} onValueChange={setSelectedDoctorId}>
              <SelectTrigger id="qc-doctor">
                <SelectValue placeholder="Select doctor" />
              </SelectTrigger>
              <SelectContent>
                {doctors.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Waiting ({waitingOnly.length})</h2>
            <div className="space-y-2">
              {waitingOnly.length === 0 && (
                <p className="text-sm text-gray-500">No patients waiting. Bookings will appear here.</p>
              )}
              {waitingOnly.map((item) => (
                <div
                  key={item.token}
                  className="p-4 rounded-lg border-2 bg-white border-gray-200 hover:border-primary hover:shadow-md transition-all"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg font-bold text-primary">{item.token}</span>
                        <Badge className="bg-gray-100 text-gray-800 border-0 text-xs">Waiting</Badge>
                      </div>
                      <p className="text-sm font-medium text-gray-900">{item.patientName}</p>
                      <p className="text-xs text-gray-500">{doctorLabel}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Currently Being Seen</h2>
            <Card className="bg-gradient-to-br from-blue-50 to-white border-2 border-primary shadow-lg">
              <CardContent className="p-6 space-y-6">
                {currentEntry ? (
                  <>
                    <div>
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-4xl font-bold text-primary">{currentEntry.token}</span>
                            <Badge className="bg-blue-100 text-primary border-0">In Progress</Badge>
                          </div>
                          <p className="text-2xl font-bold text-gray-900">{currentEntry.patientName}</p>
                        </div>
                        <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                          <User size={24} className="text-white" />
                        </div>
                      </div>

                      <div className="space-y-2 bg-white rounded-lg p-4 border border-gray-200">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Doctor:</span>
                          <span className="text-sm font-medium text-gray-900">{doctorLabel}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-medium text-gray-600">Slot progress (demo)</p>
                        <Clock size={18} className="text-primary" />
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div className="bg-primary h-2 rounded-full w-1/3 transition-all" />
                          </div>
                        </div>
                        <span className="text-lg font-bold text-gray-900">—</span>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <label className="block text-sm font-medium text-gray-600 mb-3">Add Delay (minutes)</label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min="0"
                          max="60"
                          value={delayMinutes}
                          onChange={(e) => setDelayMinutes(Number(e.target.value))}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="Minutes"
                        />
                        <Button
                          onClick={handleAddDelay}
                          variant="outline"
                          className="border-primary text-primary hover:bg-blue-50"
                        >
                          Note delay
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-3 pt-4 border-t border-gray-200">
                      <Button
                        onClick={() => void handleDoneCallNext()}
                        className="w-full bg-success hover:bg-green-700 text-white font-semibold py-3 gap-2"
                      >
                        <CheckCircle size={20} />
                        Done - Call Next Patient
                      </Button>
                      <Button
                        onClick={() => void handlePatientAbsent()}
                        variant="outline"
                        className="w-full border-red-300 text-red-600 hover:bg-red-50 font-semibold py-3"
                      >
                        Patient Absent
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-gray-600">
                    <p>No patient is currently being seen.</p>
                    <p className="text-sm mt-2">Use “Call next” from the dashboard or wait for the queue.</p>
                    <Button className="mt-6" onClick={() => void handleDoneCallNext()}>
                      Call next patient
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
