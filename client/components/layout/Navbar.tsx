import { useEffect, useState } from "react";
import { Bell, CalendarClock, CheckCircle2, LogOut, Route, User } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { clearAuthSession, getStoredUser } from "@/lib/api";
import { apiFetch } from "@/lib/api";
import type { NotificationDto } from "@shared/api";
import { getQueueSocket } from "@/lib/socket";
import { getToken } from "@/lib/api";

export default function Navbar() {
  const navigate = useNavigate();
  const stored = getStoredUser();
  const patientName = stored?.name ?? "Guest";
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);

  const handleLogout = () => {
    clearAuthSession();
    navigate("/");
  };

  useEffect(() => {
    let cancelled = false;
  
    (async () => {
      try {
        const data = await apiFetch<NotificationDto[]>(
          "/api/notifications"
        );
  
        if (!cancelled) {
          setNotifications(data);
        }
      } catch {
        /* ignore */
      }
    })();
  
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const token = getToken();
  
    if (!token) return;
  
    const socket = getQueueSocket();
  
    (
      socket as unknown as {
        auth: { token: string };
      }
    ).auth = { token };
  
    if (!socket.connected) {
      socket.connect();
    }
  
    const onNotification = (payload: NotificationDto) => {
      setNotifications((prev) => [
        {
          ...payload,
          id: crypto.randomUUID(),
          read: false,
        },
        ...prev,
      ]);
    };
  
    socket.on("notification", onNotification);
  
    return () => {
      socket.off("notification", onNotification);
    };
  }, []);

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-lg">H</span>
            </div>
            <span className="hidden sm:inline font-bold text-lg text-gray-900">HealthQueue</span>
          </Link>

          <div className="flex items-center gap-4">

          <Popover
            onOpenChange={async (open) => {
              if (!open) return;

              try {
                await apiFetch("/api/notifications/read-all", {
                  method: "PATCH",
                });

                setNotifications((prev) =>
                  prev.map((n) => ({
                    ...n,
                    read: true,
                  }))
                );
              } catch {
                /* ignore */
              }
            }}
          >
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="relative p-2 text-gray-600 hover:text-primary hover:bg-blue-50 rounded-lg transition-colors"
                  aria-label="Notifications"
                >
                  <Bell size={20} />
                  {notifications.some((n) => !n.read) && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-0">
                <div className="border-b border-gray-100 px-4 py-3">
                  <p className="font-semibold text-gray-900">Notifications</p>
                  <p className="text-xs text-gray-500">Appointment and queue updates appear here.</p>
                </div>
                <div className="divide-y divide-gray-100">
                {notifications.length === 0 ? (
                      <div className="px-4 py-6 text-sm text-gray-500">
                        No notifications yet.
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          className={`flex gap-3 px-4 py-3 ${
                            !n.read ? "bg-blue-50" : ""
                          }`}
                        >
                          <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                            <Bell size={16} className="text-primary" />
                          </div>

                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">
                              {n.title}
                            </p>

                            <p className="text-xs text-gray-500">
                              {n.message}
                            </p>

                            <p className="mt-1 text-[11px] text-gray-400">
                              {new Date(n.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                </div>
              </PopoverContent>
            </Popover>

            <div className="hidden sm:flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg">
              <User size={18} className="text-primary" />
              <span className="text-sm font-medium text-gray-900">{patientName}</span>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-gray-600 hover:text-red-600 gap-2"
            >
              <LogOut size={18} />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
