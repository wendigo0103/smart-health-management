import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DashboardLayout } from "@/components/admin/DashboardLayout";
import { Activity, CalendarCheck, Clock, Users, Volume2 } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api";
import type { ActiveQueueEntry, AnalyticsSummary, QueueSnapshot } from "@shared/api";
import { toast } from "sonner";

export default function AdminDashboard() {
  const [queue, setQueue] = useState<ActiveQueueEntry[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);

  const load = useCallback(async () => {
    try {
      const [queueRows, stats] = await Promise.all([
        apiFetch<ActiveQueueEntry[]>("/api/queue/admin/active"),
        apiFetch<AnalyticsSummary>("/api/appointments/admin/analytics"),
      ]);
      setQueue(queueRows);
      setAnalytics(stats);
    } catch {
      toast.error("Could not load admin dashboard.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const callNext = async (doctorId: string) => {
    try {
      await apiFetch<QueueSnapshot>(`/api/queue/${doctorId}/next`, { method: "POST" });
      toast.success("Queue advanced");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not advance queue");
    }
  };

  const stats = [
    { label: "Appointments Today", value: analytics?.totalAppointmentsToday ?? 0, icon: Users },
    { label: "Completed Today", value: analytics?.completedToday ?? 0, icon: CalendarCheck },
    { label: "Remaining", value: analytics?.remainingToday ?? 0, icon: Clock },
    { label: "Completion Rate", value: `${analytics?.completionRate ?? 0}%`, icon: Activity },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reception Dashboard</h1>
          <p className="text-gray-600 mt-2">Live queue overview across all doctors.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label} className="border border-gray-200 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-gray-600 text-sm font-medium mb-1">{stat.label}</p>
                      <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-blue-100">
                      <Icon size={24} className="text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Active Queue</h2>
          <Card className="border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Token</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Patient</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Doctor</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Department</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Status</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {queue.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                        No active queue entries.
                      </td>
                    </tr>
                  ) : (
                    queue.map((row) => (
                      <tr key={`${row.doctorId}-${row.token}`} className="border-b border-gray-200">
                        <td className="px-6 py-4 text-sm font-bold text-primary">{row.token}</td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{row.patientName}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{row.doctorName}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{row.doctorDepartment}</td>
                        <td className="px-6 py-4">
                          <Badge className="capitalize border-0 bg-blue-100 text-primary">{row.status}</Badge>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button size="sm" onClick={() => void callNext(row.doctorId)} className="gap-2">
                            <Volume2 size={16} />
                            Call next
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
