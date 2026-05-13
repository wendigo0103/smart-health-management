import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Timer, TrendingUp, Percent } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { apiFetch } from "@/lib/api";
import type { AnalyticsSummary } from "@shared/api";
import { toast } from "sonner";

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
}) {
  return (
    <Card className="border-slate-200 shadow-sm bg-white">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-slate-600 text-sm font-medium mb-1">{label}</p>
            <p className="text-2xl sm:text-3xl font-bold text-slate-900 break-words">{value}</p>
          </div>
          <div className="bg-blue-100 p-3 rounded-lg shrink-0">
            <Icon className="h-6 w-6 text-primary" aria-hidden />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function AnalyticsScreen() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiFetch<AnalyticsSummary>("/api/appointments/admin/analytics");
        if (!cancelled) setSummary(data);
      } catch {
        if (!cancelled) toast.error("Could not load analytics.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const maxHour = Math.max(...(summary?.patientsPerHour.map((h) => h.count) ?? [1]), 1);

  return (
    <div className="space-y-8">
      <p className="text-slate-600">Data insights from actual appointments in MongoDB.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Appointments Today" value={String(summary?.totalAppointmentsToday ?? 0)} icon={Users} />
        <StatCard label="Remaining Today" value={String(summary?.remainingToday ?? 0)} icon={Timer} />
        <StatCard label="Peak Hour" value={summary?.peakHour ?? "No bookings"} icon={TrendingUp} />
        <StatCard label="Completion Rate" value={`${summary?.completionRate ?? 0}%`} icon={Percent} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardHeader>
            <CardTitle>Patients per Hour</CardTitle>
            <CardDescription>Grouped by appointment time.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(summary?.patientsPerHour ?? []).length === 0 ? (
                <p className="text-sm text-slate-500">No appointments booked today.</p>
              ) : (
                summary!.patientsPerHour.map((row) => (
                  <div key={row.hour} className="grid grid-cols-[64px_1fr_40px] items-center gap-3">
                    <span className="text-sm text-slate-600">{row.hour}</span>
                    <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${(row.count / maxHour) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-slate-900 text-right">{row.count}</span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm bg-white">
          <CardHeader>
            <CardTitle>Status Distribution</CardTitle>
            <CardDescription>Confirmed, completed, pending, and cancelled appointments.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(summary?.statusDistribution ?? []).length === 0 ? (
                <p className="text-sm text-slate-500">No status data available.</p>
              ) : (
                summary!.statusDistribution.map((item) => (
                  <div key={item.status} className="flex items-center justify-between gap-4">
                    <span className="capitalize text-sm font-medium text-slate-800">{item.status}</span>
                    <span className="text-sm text-slate-600">
                      {item.count} ({item.percentage}%)
                    </span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
