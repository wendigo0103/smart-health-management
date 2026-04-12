import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import MainLayout from "@/components/layout/MainLayout";
import { Clock, User, MapPin, ChevronRight } from "lucide-react";

export default function Dashboard() {
  const navigate = useNavigate();

  // Mock data for active token
  const activeToken = {
    number: "A042",
    doctor: "Dr. Sarah Johnson",
    specialization: "Cardiologist",
    queuePosition: 3,
    estimatedWait: "~15 mins",
    status: "Waiting", // "Waiting" | "Almost Your Turn" | "Called"
  };

  // Mock upcoming appointments
  const upcomingAppointments = [
    {
      id: 1,
      date: "Mar 30, 2025",
      time: "10:30 AM",
      doctor: "Dr. Michael Chen",
      specialization: "Dermatologist",
      status: "Confirmed",
    },
    {
      id: 2,
      date: "Apr 5, 2025",
      time: "2:00 PM",
      doctor: "Dr. Emily Rodriguez",
      specialization: "General Physician",
      status: "Confirmed",
    },
    {
      id: 3,
      date: "Apr 12, 2025",
      time: "11:00 AM",
      doctor: "Dr. James Wilson",
      specialization: "ENT Specialist",
      status: "Pending",
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Called":
        return "bg-green-100 text-green-800";
      case "Almost Your Turn":
        return "bg-yellow-100 text-yellow-800";
      case "Waiting":
        return "bg-blue-100 text-blue-800";
      case "Confirmed":
        return "bg-green-100 text-green-800";
      case "Pending":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Welcome Back, John</h1>
          <p className="text-gray-600 mt-2">Manage your health appointments and queue status</p>
        </div>

        {/* Active Token Card */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Your Current Queue</h2>
          <Card className="bg-gradient-to-br from-blue-50 to-white border-2 border-primary shadow-lg">
            <CardContent className="p-6 sm:p-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Token Number */}
                <div className="flex flex-col items-center sm:items-start justify-center">
                  <p className="text-gray-600 text-sm font-medium mb-2">Your Token</p>
                  <div className="flex items-center gap-4">
                    <div className="text-5xl font-bold text-primary">{activeToken.number}</div>
                  </div>
                </div>

                {/* Queue Info */}
                <div className="space-y-4">
                  {/* Doctor */}
                  <div className="flex items-start gap-3">
                    <User size={20} className="text-primary mt-1 flex-shrink-0" />
                    <div>
                      <p className="text-gray-600 text-sm font-medium">Doctor</p>
                      <p className="text-gray-900 font-semibold">{activeToken.doctor}</p>
                      <p className="text-gray-500 text-xs">{activeToken.specialization}</p>
                    </div>
                  </div>

                  {/* Queue Position & Wait Time */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-gray-600 text-sm font-medium">Queue Position</p>
                      <p className="text-lg font-bold text-primary">
                        {activeToken.queuePosition} ahead
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 text-sm font-medium">Estimated Wait</p>
                      <p className="text-lg font-bold text-primary">{activeToken.estimatedWait}</p>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="pt-2">
                    <Badge
                      className={`${getStatusColor(activeToken.status)} border-0 text-sm font-semibold px-3 py-1`}
                    >
                      {activeToken.status}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 mt-6 pt-6 border-t border-gray-200">
                <Button
                  onClick={() => navigate("/queue")}
                  variant="outline"
                  className="flex-1 border-primary text-primary hover:bg-blue-50"
                >
                  View Queue Status
                </Button>
                <Button
                  onClick={() => navigate("/queue")}
                  className="flex-1 bg-primary hover:bg-primary/90 text-white"
                >
                  Track My Position
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Book Appointment CTA */}
        <div className="mb-8">
          <Button
            onClick={() => navigate("/book-appointment")}
            size="lg"
            className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-6 text-lg rounded-lg shadow-md"
          >
            📅 Book New Appointment
          </Button>
        </div>

        {/* Upcoming Appointments */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Upcoming Appointments</h2>
            <Button
              onClick={() => navigate("/book-appointment")}
              variant="ghost"
              className="text-primary hover:bg-blue-50"
            >
              Add More
              <ChevronRight size={18} />
            </Button>
          </div>

          <div className="space-y-3">
            {upcomingAppointments.map((appointment) => (
              <Card key={appointment.id} className="border border-gray-200 hover:shadow-md transition-shadow">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      {/* Date & Time */}
                      <div className="flex items-center gap-2 mb-2">
                        <Clock size={16} className="text-primary" />
                        <p className="text-gray-600 text-sm font-medium">
                          {appointment.date} at {appointment.time}
                        </p>
                      </div>

                      {/* Doctor Info */}
                      <p className="text-gray-900 font-semibold mb-1">{appointment.doctor}</p>
                      <p className="text-gray-500 text-sm">{appointment.specialization}</p>
                    </div>

                    {/* Status Badge */}
                    <Badge
                      className={`${getStatusColor(appointment.status)} border-0 text-xs font-semibold px-2 py-1 whitespace-nowrap`}
                    >
                      {appointment.status}
                    </Badge>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-primary border-primary hover:bg-blue-50"
                    >
                      Reschedule
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
