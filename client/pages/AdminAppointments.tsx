import { DashboardLayout } from "@/components/admin/DashboardLayout";
import { AppointmentsScreen } from "@/components/admin/AppointmentsScreen";

export default function AdminAppointments() {
  return (
    <DashboardLayout title="Appointments">
      <AppointmentsScreen />
    </DashboardLayout>
  );
}
