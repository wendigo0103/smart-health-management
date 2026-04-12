import { DashboardLayout } from "@/components/admin/DashboardLayout";
import { AnalyticsScreen } from "@/components/admin/AnalyticsScreen";

export default function AdminAnalytics() {
  return (
    <DashboardLayout title="Analytics">
      <AnalyticsScreen />
    </DashboardLayout>
  );
}
