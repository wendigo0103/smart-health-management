import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import MainLayout from "@/components/layout/MainLayout";
import { Bell, BellOff, LogOut, Clock, Users, AlertCircle } from "lucide-react";
import { apiFetch, getToken } from "@/lib/api";
import { getQueueSocket } from "@/lib/socket";
import type { QueueSnapshot, QueueWaitingEntryDto } from "@shared/api";
import { toast } from "sonner";

type QueueLocationState = { doctorId?: string; token?: string };

const QUEUE_CTX_KEY = "queue_ctx";

export default function QueueTracker() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state || {}) as QueueLocationState;

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [snapshot, setSnapshot] = useState<QueueSnapshot | null>(null);
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [myToken, setMyToken] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let d = state.doctorId ?? null;
    let t = state.token ?? null;
    if (!d || !t) {
      try {
        const raw = sessionStorage.getItem(QUEUE_CTX_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as QueueLocationState;
          d = d || parsed.doctorId || null;
          t = t || parsed.token || null;
        }
      } catch {
        /* ignore */
      }
    }
    if (!d || !t) {
      setLoadError("missing_context");
      return;
    }
    setDoctorId(d);
    setMyToken(t);
  }, [state.doctorId, state.token]);

  useEffect(() => {
    if (!doctorId) return;
    let cancelled = false;
    (async () => {
      try {
        const snap = await apiFetch<QueueSnapshot>(`/api/queue/${doctorId}`);
        if (!cancelled) setSnapshot(snap);
      } catch {
        if (!cancelled) toast.error("Could not load queue.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [doctorId]);

  useEffect(() => {
    if (!doctorId || !myToken) return;
    const token = getToken();
    if (!token) {
      toast.error("Please log in to track the live queue.");
      return;
    }
    const s = getQueueSocket();
    (s as unknown as { auth: { token: string } }).auth = { token };
    if (!s.connected) {
      s.connect();
    }
    s.emit("joinQueue", { doctorId, token: myToken }, (ack: unknown) => {
      const r = ack as { error?: string; ok?: boolean };
      if (r?.error) {
        toast.error("Could not join live updates.");
      }
    });
    const onUpd = (snap: QueueSnapshot) => {
      if (snap.doctorId === doctorId) {
        setSnapshot(snap);
        const activeToken = snap.currentPatientToken;
        if (
          notificationsEnabled &&
          (snap.doctorStatus === "delayed" || snap.doctorStatus === "unavailable") &&
          document.hidden &&
          "Notification" in window &&
          Notification.permission === "granted"
        ) {
          new Notification("HealthQueue", {
            body:
              snap.statusMessage ||
              (snap.doctorStatus === "delayed"
                ? `Doctor is running ${snap.delayMinutes} minutes late.`
                : "Doctor is currently unavailable."),
          });
        }
        if (notificationsEnabled && activeToken === myToken && document.hidden) {
          document.title = `Your turn: ${myToken}`;
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification("HealthQueue", { body: `Token ${myToken}, please proceed to consultation.` });
          }
        }
      }
    };
    s.on("queueUpdated", onUpd);
    return () => {
      s.off("queueUpdated", onUpd);
      document.title = "HealthQueue";
    };
  }, [doctorId, myToken, notificationsEnabled]);

  const toggleNotifications = async () => {
    if (!notificationsEnabled && "Notification" in window && Notification.permission === "default") {
      await Notification.requestPermission();
    }
    setNotificationsEnabled((v) => !v);
  };

  const myEntry = useMemo(() => {
    if (!snapshot || !myToken) return null;
    return snapshot.waitingList.find((w) => w.token === myToken) ?? null;
  }, [snapshot, myToken]);

  const { patientsAhead, statusLabel, estWaitMins } = useMemo(() => {
    if (!snapshot || !myToken) {
      return { patientsAhead: 0, statusLabel: "…", estWaitMins: snapshot?.estimatedWaitPerPatient ?? 15 };
    }
    if (!myEntry) {
      return {
        patientsAhead: 0,
        statusLabel: "In queue",
        estWaitMins: snapshot.estimatedWaitPerPatient,
      };
    }
    const active = snapshot.waitingList.filter((w) => w.status === "waiting" || w.status === "called");
    const myOrder = active.findIndex((w) => w.token === myToken);
    const ahead =
      myEntry.status === "waiting"
        ? active.filter((w, i) => w.status === "waiting" && i < myOrder).length
        : 0;
    let label = "Waiting";
    if (myEntry.status === "called") label = "You're being seen";
    if (myEntry.status === "completed") label = "Completed";
    if (myEntry.status === "delayed") label = "Delayed";
    const delay = snapshot.doctorStatus === "delayed" ? snapshot.delayMinutes : 0;
    const est = ahead * snapshot.estimatedWaitPerPatient + delay;
    return {
      patientsAhead: ahead,
      statusLabel: label,
      estWaitMins: est || snapshot.estimatedWaitPerPatient + delay,
    };
  }, [snapshot, myToken, myEntry]);

  const queueListUi = useMemo(() => {
    if (!snapshot || !myToken) return [];
    const ordered = [...snapshot.waitingList].sort(
      (a, b) => new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime()
    );
    return ordered.map((item) => mapRow(item, myToken, snapshot.currentPatientToken));
  }, [snapshot, myToken]);

  const handleLeaveQueue = () => {
    if (confirm("Leave the tracker? Your appointment in the system is unchanged.")) {
      sessionStorage.removeItem(QUEUE_CTX_KEY);
      navigate("/dashboard");
    }
  };

  if (loadError === "missing_context" || (!doctorId && !myToken)) {
    return (
      <MainLayout>
        <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
          <h1 className="text-2xl font-bold text-gray-900">No queue session</h1>
          <p className="text-gray-600">Book an appointment first, then open the queue from the confirmation screen.</p>
          <Button onClick={() => navigate("/book-appointment")} className="bg-primary text-white">
            Book appointment
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Live Queue Status</h1>
          <p className="text-gray-600 mt-2">Real-time appointment queue tracking</p>
        </div>

        {snapshot && snapshot.doctorStatus !== "on-time" && (
          <Card
            className={`mb-6 border-2 ${
              snapshot.doctorStatus === "unavailable"
                ? "border-red-200 bg-red-50"
                : "border-amber-200 bg-amber-50"
            }`}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertCircle
                  size={22}
                  className={snapshot.doctorStatus === "unavailable" ? "text-red-600" : "text-amber-700"}
                />
                <div>
                  <p className="font-semibold text-gray-900">
                    {snapshot.doctorStatus === "unavailable"
                      ? "Doctor unavailable"
                      : `Doctor delayed by ${snapshot.delayMinutes} minutes`}
                  </p>
                  <p className="text-sm text-gray-700 mt-1">
                    {snapshot.statusMessage ||
                      "Clinic staff will keep this queue updated as the schedule changes."}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="bg-gradient-to-br from-blue-50 to-white border-2 border-primary shadow-lg mb-8">
          <CardContent className="p-8 sm:p-12">
            <div className="flex flex-col items-center space-y-8">
              <div className="text-center">
                <p className="text-gray-600 font-medium mb-3">Your Token</p>
                <div className="text-6xl sm:text-7xl font-bold text-primary mb-4">{myToken}</div>
                <div className="flex justify-center mb-6">
                  <svg width="200" height="200" className="transform -rotate-90">
                    <circle cx="100" cy="100" r="90" fill="none" stroke="#e5e7eb" strokeWidth="8" />
                    <circle
                      cx="100"
                      cy="100"
                      r="90"
                      fill="none"
                      stroke="#2563eb"
                      strokeWidth="8"
                      strokeDasharray={`${Math.min(1, patientsAhead / 10) * 565.48} 565.48`}
                      strokeLinecap="round"
                      style={{ transition: "stroke-dasharray 0.5s ease" }}
                    />
                    <text x="100" y="100" textAnchor="middle" dy="0.35em" className="text-2xl font-bold fill-primary">
                      {patientsAhead}
                    </text>
                  </svg>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
                <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
                  <Users size={24} className="text-primary mx-auto mb-2" />
                  <p className="text-gray-600 text-sm font-medium">Patients Ahead</p>
                  <p className="text-3xl font-bold text-primary">{patientsAhead}</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
                  <Clock size={24} className="text-warning mx-auto mb-2" />
                  <p className="text-gray-600 text-sm font-medium">Est. Wait</p>
                  <p className="text-3xl font-bold text-warning">~{estWaitMins}m</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
                  <AlertCircle size={24} className="text-info mx-auto mb-2" />
                  <p className="text-gray-600 text-sm font-medium">Status</p>
                  <Badge className="mt-2 bg-info text-white border-0 text-xs">{statusLabel}</Badge>
                </div>
              </div>

              <div className="w-full bg-blue-50 rounded-lg p-4 border border-blue-200">
                <p className="text-center text-gray-900 font-semibold">
                  {myEntry?.status === "called"
                    ? "It's your turn — please proceed to the consultation room."
                    : `${patientsAhead} patient${patientsAhead !== 1 ? "s" : ""} ahead of you`}
                </p>
                <p className="text-center text-gray-600 text-sm mt-1">
                  Estimated time: <span className="font-semibold">~{estWaitMins} minutes</span>
                </p>
                {snapshot?.doctorStatus === "unavailable" && (
                  <p className="text-center text-red-700 text-sm mt-2 font-medium">
                    Please wait for clinic staff to reschedule or reopen this queue.
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <Button
            onClick={() => void toggleNotifications()}
            variant="outline"
            className="flex-1 gap-2 border-primary text-primary hover:bg-blue-50"
          >
            {notificationsEnabled ? (
              <>
                <Bell size={18} />
                Notifications ON
              </>
            ) : (
              <>
                <BellOff size={18} />
                Notifications OFF
              </>
            )}
          </Button>
          <Button
            onClick={handleLeaveQueue}
            variant="destructive"
            className="flex-1 bg-red-600 hover:bg-red-700 text-white gap-2"
          >
            <LogOut size={18} />
            Leave Queue
          </Button>
        </div>

        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Queue Overview</h2>
          <Card className="border border-gray-200 shadow-md">
            <CardContent className="p-0">
              <div className="divide-y divide-gray-200">
                {queueListUi.length === 0 ? (
                  <p className="p-6 text-center text-gray-500">Queue is empty or loading…</p>
                ) : (
                  queueListUi.map((item, index) => (
                    <div
                      key={item.token}
                      className={`p-4 sm:p-6 transition-all ${
                        item.isYou
                          ? "bg-blue-50 border-l-4 border-primary"
                          : index % 2 === 0
                            ? "bg-white hover:bg-gray-50"
                            : "bg-gray-50 hover:bg-white"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          <span className="text-3xl">{item.icon}</span>
                          <div>
                            <p className={`font-bold text-lg ${item.isYou ? "text-primary" : "text-gray-900"}`}>
                              Token {item.token}
                            </p>
                            <p className="text-gray-600 text-sm font-medium">{item.status}</p>
                          </div>
                        </div>
                        <div>
                          {item.status === "Done" && (
                            <Badge className="bg-success text-white border-0 text-xs">Completed</Badge>
                          )}
                          {item.status === "In Progress" && (
                            <Badge className="bg-warning text-gray-900 border-0 text-xs">Now Serving</Badge>
                          )}
                          {item.status === "Waiting" && !item.isYou && (
                            <Badge className="bg-gray-200 text-gray-800 border-0 text-xs">Waiting</Badge>
                          )}
                          {item.isYou && (
                            <Badge className="bg-primary text-white border-0 text-xs font-semibold">You</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
          <p className="text-gray-600 text-sm text-center mt-6">Updates arrive live via Socket.io when staff advances the queue.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mt-8 pt-6 border-t border-gray-200">
          <Button onClick={() => navigate("/dashboard")} variant="outline" className="flex-1">
            Back to Dashboard
          </Button>
          <Button
            onClick={() => navigate("/book-appointment")}
            className="flex-1 bg-primary hover:bg-primary/90 text-white"
          >
            Book Another Appointment
          </Button>
        </div>
      </div>
    </MainLayout>
  );
}

function mapRow(
  item: QueueWaitingEntryDto,
  myToken: string,
  currentToken: string
): {
  token: string;
  status: string;
  icon: string;
  isYou?: boolean;
} {
  const isYou = item.token === myToken;
  let status = "Waiting";
  let icon = "⏳";
  if (item.status === "called") {
    status = "In Progress";
    icon = "🔵";
  }
  if (item.status === "completed") {
    status = "Done";
    icon = "✅";
  }
  if (item.status === "delayed") {
    status = "Delayed";
    icon = "⏸️";
  }
  if (item.token === currentToken && item.status === "called") {
    status = "In Progress";
  }
  return { token: item.token, status, icon, isYou };
}
