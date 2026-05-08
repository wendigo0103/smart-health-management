import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/api";
import type { DoctorListItem } from "@shared/api";
import { toast } from "sonner";

export function SettingsScreen() {
  const [doctors, setDoctors] = useState<DoctorListItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await apiFetch<DoctorListItem[]>("/api/doctors");
        if (!cancelled) setDoctors(list);
      } catch {
        if (!cancelled) toast.error("Could not load doctors.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <p className="text-slate-600">Doctor directory and department assignments.</p>

      <Card className="border-slate-200 bg-white">
        <CardHeader>
          <CardTitle>Doctors and Departments</CardTitle>
          <CardDescription>Used by appointment booking filters and queue grouping.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Doctor</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Department</th>
                </tr>
              </thead>
              <tbody>
                {doctors.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-4 py-8 text-center text-slate-500">
                      No doctors found.
                    </td>
                  </tr>
                ) : (
                  doctors.map((doctor) => (
                    <tr key={doctor.id} className="border-b border-slate-100">
                      <td className="px-4 py-3 font-medium text-slate-900">{doctor.name}</td>
                      <td className="px-4 py-3">
                        <Badge className="bg-blue-100 text-primary border-0">{doctor.specialization}</Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
