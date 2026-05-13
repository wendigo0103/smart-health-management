import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/api";
import { HOSPITALS, type CreateDoctorBody, type DoctorListItem } from "@shared/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function SettingsScreen() {
  const [doctors, setDoctors] = useState<DoctorListItem[]>([]);
  const [form, setForm] = useState<CreateDoctorBody>({
    name: "",
    email: "",
    phone: "",
    specialization: "General Medicine",
    hospitalId: HOSPITALS[0]?.id ?? "",
  });
  const [saving, setSaving] = useState(false);

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

  const addDoctor = async () => {
    setSaving(true);
    try {
      const doctor = await apiFetch<DoctorListItem>("/api/doctors", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setDoctors((prev) => [...prev, doctor].sort((a, b) => a.name.localeCompare(b.name)));
      setForm({
        name: "",
        email: "",
        phone: "",
        specialization: form.specialization,
        hospitalId: form.hospitalId,
      });
      toast.success("Doctor added");
    } catch {
      toast.error("Could not add doctor.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <p className="text-slate-600">Doctor directory and department assignments.</p>

      <Card className="border-slate-200 bg-white">
        <CardHeader>
          <CardTitle>Add Doctor</CardTitle>
          <CardDescription>Create a doctor profile tied to a hospital and department.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="doctor-name">Name</Label>
            <Input
              id="doctor-name"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Dr. Asha Mehta"
              className="bg-white"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="doctor-email">Email</Label>
            <Input
              id="doctor-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="doctor@hospital.test"
              className="bg-white"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="doctor-phone">Phone</Label>
            <Input
              id="doctor-phone"
              value={form.phone ?? ""}
              onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
              placeholder="+91 98765 43210"
              className="bg-white"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="doctor-specialization">Department</Label>
            <Input
              id="doctor-specialization"
              value={form.specialization}
              onChange={(e) => setForm((prev) => ({ ...prev, specialization: e.target.value }))}
              placeholder="Cardiology"
              className="bg-white"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="doctor-hospital">Hospital</Label>
            <Select value={form.hospitalId} onValueChange={(hospitalId) => setForm((prev) => ({ ...prev, hospitalId }))}>
              <SelectTrigger id="doctor-hospital" className="bg-white">
                <SelectValue placeholder="Hospital" />
              </SelectTrigger>
              <SelectContent>
                {HOSPITALS.map((h) => (
                  <SelectItem key={h.id} value={h.id}>
                    {h.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button
              type="button"
              onClick={() => void addDoctor()}
              disabled={saving || !form.name || !form.email || !form.specialization || !form.hospitalId}
              className="w-full md:w-auto bg-primary text-white"
            >
              {saving ? "Adding..." : "Add Doctor"}
            </Button>
          </div>
        </CardContent>
      </Card>

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
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Hospital</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Feedback</th>
                </tr>
              </thead>
              <tbody>
                {doctors.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
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
                      <td className="px-4 py-3 text-slate-700">{doctor.hospitalName ?? "Unassigned"}</td>
                      <td className="px-4 py-3 text-slate-700">
                        {(doctor.rating ?? 5).toFixed(1)} / 5, {doctor.averageDelayMinutes ?? 0}m avg delay
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
