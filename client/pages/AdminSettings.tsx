import { DashboardLayout } from "@/components/admin/DashboardLayout";
import { SettingsScreen } from "@/components/admin/SettingsScreen";

export default function AdminSettings() {
  return (
    <DashboardLayout title="Settings">
      <SettingsScreen />
    </DashboardLayout>
  );
}
