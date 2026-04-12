import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, ApiError } from "@/lib/api";
import type { CreateAppointmentResponse, DoctorListItem } from "@shared/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import MainLayout from "@/components/layout/MainLayout";
import {
  Heart,
  Stethoscope,
  Pill,
  Ear,
  Eye,
  Brain,
  ArrowRight,
  CheckCircle,
  Calendar,
  Clock,
  ChevronLeft,
} from "lucide-react";

function buildScheduledAtIso(dateLabel: string, timeLabel: string): string {
  const parsed = Date.parse(`${dateLabel}, 2026 ${timeLabel}`);
  if (Number.isNaN(parsed)) {
    return new Date().toISOString();
  }
  return new Date(parsed).toISOString();
}

export default function BookAppointment() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [bookingToken, setBookingToken] = useState<string | null>(null);
  const [bookingDoctorId, setBookingDoctorId] = useState<string | null>(null);
  const [apiDoctors, setApiDoctors] = useState<DoctorListItem[]>([]);
  const [doctorsLoading, setDoctorsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await apiFetch<DoctorListItem[]>("/api/doctors");
        if (!cancelled) setApiDoctors(list);
      } catch {
        if (!cancelled) {
          toast.error("Could not load doctors. Check that the API and MongoDB are running.");
          setApiDoctors([]);
        }
      } finally {
        if (!cancelled) setDoctorsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const departments = [
    { id: "cardiology", name: "Cardiology", icon: Heart, color: "bg-red-100" },
    { id: "dermatology", name: "Dermatology", icon: Stethoscope, color: "bg-green-100" },
    { id: "general", name: "General Medicine", icon: Pill, color: "bg-blue-100" },
    { id: "ent", name: "ENT", icon: Ear, color: "bg-purple-100" },
    { id: "ophthalmology", name: "Ophthalmology", icon: Eye, color: "bg-yellow-100" },
    { id: "neurology", name: "Neurology", icon: Brain, color: "bg-pink-100" },
  ];

  const doctors = apiDoctors.map((d) => ({
    id: d.id,
    name: d.name,
    specialization: d.specialization,
    nextAvailable: d.nextAvailableLabel || "Flexible",
    rating: 5,
  }));

  const timeSlots = ["9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "2:00 PM", "2:30 PM", "3:00 PM"];

  const dates = ["Mar 30", "Mar 31", "Apr 1", "Apr 2", "Apr 3", "Apr 4"];

  const handleConfirmBooking = async () => {
    if (!selectedDoctor || !selectedDate || !selectedTime) return;
    try {
      const scheduledAt = buildScheduledAtIso(selectedDate, selectedTime);
      const res = await apiFetch<CreateAppointmentResponse>("/api/appointments", {
        method: "POST",
        body: JSON.stringify({ doctorId: selectedDoctor, scheduledAt }),
      });
      setBookingToken(res.appointment.token);
      setBookingDoctorId(selectedDoctor);
      sessionStorage.setItem(
        "queue_ctx",
        JSON.stringify({ doctorId: selectedDoctor, token: res.appointment.token })
      );
      toast.success("Appointment booked — you are in the queue.");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Booking failed";
      toast.error(msg);
    }
  };

  const handleBackToDashboard = () => {
    navigate("/dashboard");
  };

  const department = departments.find((d) => d.id === selectedDepartment);
  const doctor = doctors.find((d) => d.id === selectedDoctor);

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Book an Appointment</h1>
          <p className="text-gray-600 mt-2">Follow the steps below to schedule your appointment</p>
        </div>

        {/* Step Indicator */}
        {!bookingToken && (
          <div className="mb-8">
            <div className="flex items-center justify-between">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                      s === step
                        ? "bg-primary text-white shadow-md scale-110"
                        : s < step
                          ? "bg-success text-white"
                          : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {s < step ? <CheckCircle size={20} /> : s}
                  </div>
                  {s < 3 && (
                    <div
                      className={`flex-1 h-1 mx-2 rounded-full transition-all ${
                        s < step ? "bg-success" : "bg-gray-200"
                      }`}
                    ></div>
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-3 text-xs font-medium">
              <span className={step >= 1 ? "text-primary" : "text-gray-400"}>Department</span>
              <span className={step >= 2 ? "text-primary" : "text-gray-400"}>Doctor</span>
              <span className={step >= 3 ? "text-primary" : "text-gray-400"}>Date & Time</span>
            </div>
          </div>
        )}

        {/* Content */}
        {bookingToken ? (
          /* Success Screen */
          <div className="space-y-8">
            <Card className="bg-gradient-to-br from-green-50 to-white border-2 border-success shadow-lg">
              <CardContent className="p-8 sm:p-12">
                <div className="text-center">
                  <div className="flex justify-center mb-6">
                    <div className="w-20 h-20 bg-success rounded-full flex items-center justify-center animate-pulse">
                      <CheckCircle size={40} className="text-white" />
                    </div>
                  </div>

                  <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                    Booking Confirmed!
                  </h2>
                  <p className="text-gray-600 mb-8">Your appointment has been successfully booked.</p>

                  <div className="bg-white border-2 border-success rounded-lg p-6 mb-8 inline-block">
                    <p className="text-gray-600 text-sm font-medium mb-2">Your Appointment Token</p>
                    <p className="text-5xl font-bold text-primary">{bookingToken}</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left bg-gray-50 rounded-lg p-6 mb-8">
                    <div>
                      <p className="text-gray-600 text-sm font-medium">Department</p>
                      <p className="text-gray-900 font-semibold">{department?.name}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 text-sm font-medium">Doctor</p>
                      <p className="text-gray-900 font-semibold">{doctor?.name}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 text-sm font-medium">Date</p>
                      <p className="text-gray-900 font-semibold">{selectedDate}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 text-sm font-medium">Time</p>
                      <p className="text-gray-900 font-semibold">{selectedTime}</p>
                    </div>
                  </div>

                  <p className="text-gray-600 text-sm mb-8">
                    A confirmation has been sent to your email. Please arrive 10 minutes early.
                  </p>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      onClick={handleBackToDashboard}
                      variant="outline"
                      className="flex-1"
                    >
                      Back to Dashboard
                    </Button>
                    <Button
                      onClick={() =>
                        navigate("/queue", {
                          state: {
                            doctorId: bookingDoctorId ?? selectedDoctor,
                            token: bookingToken,
                          },
                        })
                      }
                      className="flex-1 bg-primary hover:bg-primary/90 text-white"
                    >
                      Track Queue Status
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div>
            {/* Step 1: Department Selection */}
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Select Department</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {departments.map((dept) => {
                      const Icon = dept.icon;
                      return (
                        <Card
                          key={dept.id}
                          onClick={() => setSelectedDepartment(dept.id)}
                          className={`cursor-pointer transition-all border-2 ${
                            selectedDepartment === dept.id
                              ? "border-primary bg-blue-50 shadow-lg"
                              : "border-gray-200 hover:border-primary hover:shadow-md"
                          }`}
                        >
                          <CardContent className="p-6 text-center">
                            <div
                              className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${dept.color}`}
                            >
                              <Icon size={32} className="text-gray-700" />
                            </div>
                            <p className="font-semibold text-gray-900">{dept.name}</p>
                            {selectedDepartment === dept.id && (
                              <Badge className="mt-3 bg-primary text-white border-0">Selected</Badge>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-between pt-6 border-t border-gray-200">
                  <Button
                    onClick={() => navigate("/dashboard")}
                    variant="outline"
                    className="gap-2"
                  >
                    <ChevronLeft size={18} />
                    Cancel
                  </Button>
                  <Button
                    onClick={() => setStep(2)}
                    disabled={!selectedDepartment}
                    className="bg-primary hover:bg-primary/90 text-white gap-2"
                  >
                    Next <ArrowRight size={18} />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Doctor Selection */}
            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">Select Doctor</h2>
                  <p className="text-gray-600 mb-4">Choose a doctor from {department?.name}</p>
                  {doctorsLoading && <p className="text-sm text-gray-500 mb-2">Loading doctors…</p>}
                  {!doctorsLoading && doctors.length === 0 && (
                    <p className="text-sm text-amber-700 mb-2">
                      No doctors available. Run <code className="text-xs">npm run seed</code> and ensure MongoDB is
                      running.
                    </p>
                  )}

                  <div className="space-y-3">
                    {doctors.map((doc) => (
                      <Card
                        key={doc.id}
                        onClick={() => setSelectedDoctor(doc.id)}
                        className={`cursor-pointer transition-all border-2 ${
                          selectedDoctor === doc.id
                            ? "border-primary bg-blue-50 shadow-lg"
                            : "border-gray-200 hover:border-primary hover:shadow-md"
                        }`}
                      >
                        <CardContent className="p-4 sm:p-6">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-semibold text-gray-900">{doc.name}</p>
                              <p className="text-gray-600 text-sm">{doc.specialization}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <Clock size={16} className="text-primary" />
                                <p className="text-gray-600 text-sm">Next available: {doc.nextAvailable}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold text-gray-900">⭐ {doc.rating}</p>
                              {selectedDoctor === doc.id && (
                                <Badge className="mt-2 bg-primary text-white border-0">Selected</Badge>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                <div className="flex justify-between pt-6 border-t border-gray-200">
                  <Button
                    onClick={() => setStep(1)}
                    variant="outline"
                    className="gap-2"
                  >
                    <ChevronLeft size={18} />
                    Back
                  </Button>
                  <Button
                    onClick={() => setStep(3)}
                    disabled={!selectedDoctor}
                    className="bg-primary hover:bg-primary/90 text-white gap-2"
                  >
                    Next <ArrowRight size={18} />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Date & Time Selection */}
            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Select Date & Time</h2>

                  {/* Date Selection */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-3">Choose Date</label>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                      {dates.map((date) => (
                        <button
                          key={date}
                          onClick={() => setSelectedDate(date)}
                          className={`py-2 px-3 rounded-lg border-2 font-semibold transition-all text-center text-sm ${
                            selectedDate === date
                              ? "border-primary bg-blue-100 text-primary"
                              : "border-gray-200 text-gray-600 hover:border-primary hover:bg-gray-50"
                          }`}
                        >
                          {date}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Time Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Choose Time</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {timeSlots.map((time) => (
                        <button
                          key={time}
                          onClick={() => setSelectedTime(time)}
                          className={`py-3 px-4 rounded-lg border-2 font-medium transition-all text-center ${
                            selectedTime === time
                              ? "border-primary bg-blue-100 text-primary"
                              : "border-gray-200 text-gray-600 hover:border-primary hover:bg-gray-50"
                          }`}
                        >
                          {time}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 sm:p-6 border border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-3">Booking Summary</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Department:</span>
                      <span className="font-semibold text-gray-900">{department?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Doctor:</span>
                      <span className="font-semibold text-gray-900">{doctor?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Date:</span>
                      <span className="font-semibold text-gray-900">{selectedDate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Time:</span>
                      <span className="font-semibold text-gray-900">{selectedTime}</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between pt-6 border-t border-gray-200">
                  <Button
                    onClick={() => setStep(2)}
                    variant="outline"
                    className="gap-2"
                  >
                    <ChevronLeft size={18} />
                    Back
                  </Button>
                  <Button
                    onClick={() => void handleConfirmBooking()}
                    disabled={!selectedDate || !selectedTime}
                    className="bg-primary hover:bg-primary/90 text-white gap-2"
                  >
                    <CheckCircle size={18} />
                    Confirm Booking
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
