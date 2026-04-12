import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DashboardLayout } from "@/components/admin/DashboardLayout";
import { Users, Clock, CheckCircle, Activity, Volume2, SkipForward, AlertCircle } from "lucide-react";

export default function AdminDashboard() {
  const [queueData] = useState([
    {
      id: 1,
      token: "A039",
      patientName: "Sarah Johnson",
      doctor: "Dr. Sarah Chen",
      waitTime: "3 mins",
      status: "Done",
      statusColor: "bg-green-100 text-green-800",
    },
    {
      id: 2,
      token: "A040",
      patientName: "John Smith",
      doctor: "Dr. Michael Chen",
      waitTime: "Now",
      status: "In Progress",
      statusColor: "bg-blue-100 text-blue-800",
    },
    {
      id: 3,
      token: "A041",
      patientName: "Emma Wilson",
      doctor: "Dr. Emily Rodriguez",
      waitTime: "~5 mins",
      status: "Waiting",
      statusColor: "bg-yellow-100 text-yellow-800",
    },
    {
      id: 4,
      token: "A042",
      patientName: "Michael Davis",
      doctor: "Dr. James Wilson",
      waitTime: "~10 mins",
      status: "Waiting",
      statusColor: "bg-yellow-100 text-yellow-800",
    },
    {
      id: 5,
      token: "A043",
      patientName: "Lisa Anderson",
      doctor: "Dr. Sarah Chen",
      waitTime: "~15 mins",
      status: "Waiting",
      statusColor: "bg-yellow-100 text-yellow-800",
    },
  ]);

  const stats = [
    {
      label: "Total Patients Today",
      value: "47",
      icon: Users,
      color: "bg-blue-100",
      textColor: "text-blue-600",
    },
    {
      label: "Currently Waiting",
      value: "12",
      icon: Clock,
      color: "bg-yellow-100",
      textColor: "text-yellow-600",
    },
    {
      label: "Avg Wait Time",
      value: "8.3 mins",
      icon: Activity,
      color: "bg-purple-100",
      textColor: "text-purple-600",
    },
    {
      label: "Completed Today",
      value: "35",
      icon: CheckCircle,
      color: "bg-green-100",
      textColor: "text-green-600",
    },
  ];

  const handleCallNext = () => {
    alert("Calling next patient: A041 (Emma Wilson)");
  };

  const handleSkip = (token: string) => {
    alert(`Skipped patient: ${token}`);
  };

  const handleMarkDelay = (token: string) => {
    alert(`Marked delay for patient: ${token}`);
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-2">Real-time queue monitoring and management</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label} className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-gray-600 text-sm font-medium mb-1">{stat.label}</p>
                      <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                    </div>
                    <div className={`p-3 rounded-lg ${stat.color}`}>
                      <Icon size={24} className={stat.textColor} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Call Next Patient Button */}
        <div>
          <Button
            onClick={handleCallNext}
            size="lg"
            className="w-full md:w-auto bg-success hover:bg-green-700 text-white font-bold py-6 text-lg rounded-lg shadow-lg flex items-center justify-center gap-2"
          >
            <Volume2 size={24} />
            Call Next Patient
          </Button>
        </div>

        {/* Active Queue Table */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Active Queue</h2>
          <Card className="border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Token</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Patient Name</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Doctor</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Wait Time</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Status</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {queueData.map((patient) => (
                    <tr key={patient.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-bold text-primary">{patient.token}</td>
                      <td className="px-6 py-4 text-sm text-gray-900 font-medium">{patient.patientName}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{patient.doctor}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{patient.waitTime}</td>
                      <td className="px-6 py-4">
                        <Badge className={`${patient.statusColor} border-0 text-xs font-semibold`}>
                          {patient.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleSkip(patient.token)}
                            className="text-gray-600 hover:text-primary transition-colors p-1"
                            title="Skip"
                          >
                            <SkipForward size={18} />
                          </button>
                          <button
                            onClick={() => handleMarkDelay(patient.token)}
                            className="text-gray-600 hover:text-yellow-600 transition-colors p-1"
                            title="Mark Delay"
                          >
                            <AlertCircle size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Recent Activity</h2>
            <Card className="border border-gray-200 shadow-sm">
              <CardContent className="p-6">
                <div className="space-y-4">
                  {[
                    { time: "2 mins ago", action: "Patient A040 called", doctor: "Dr. Michael Chen" },
                    { time: "5 mins ago", action: "Patient A039 completed", doctor: "Dr. Sarah Chen" },
                    { time: "8 mins ago", action: "Patient A038 marked as no-show", doctor: "Dr. Emily Rodriguez" },
                    { time: "12 mins ago", action: "Patient A037 added delay (15 mins)", doctor: "Dr. James Wilson" },
                    { time: "15 mins ago", action: "New appointment booked", doctor: "Dr. Sarah Chen" },
                  ].map((activity, idx) => (
                    <div key={idx} className="flex items-start gap-4 pb-4 border-b border-gray-200 last:border-b-0 last:pb-0">
                      <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                        <p className="text-xs text-gray-500 mt-1">{activity.doctor}</p>
                      </div>
                      <span className="text-xs text-gray-500 whitespace-nowrap">{activity.time}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* System Status */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">System Status</h2>
            <Card className="border border-gray-200 shadow-sm">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">System Status</span>
                  <Badge className="bg-green-100 text-green-800 border-0">Operational</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">Connected Doctors</span>
                  <span className="text-lg font-bold text-primary">8/10</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">Active Sessions</span>
                  <span className="text-lg font-bold text-primary">12</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">Avg Response Time</span>
                  <span className="text-lg font-bold text-primary">245ms</span>
                </div>
                <div className="pt-4 border-t border-gray-200">
                  <Button variant="outline" className="w-full text-sm border-primary text-primary hover:bg-blue-50">
                    View System Health
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
