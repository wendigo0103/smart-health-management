import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, ApiError } from "@/lib/api";
import {
  BOOKING_WINDOW_DAYS,
  CLINIC_TIME_SLOTS,
  HOSPITALS,
  type BookedSlotsResponse,
  type CreateAppointmentResponse,
  type DoctorListItem,
} from "@shared/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

function toDateInputValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function labelTo24Hour(timeLabel: string): string {
  const match = timeLabel.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return timeLabel;
  let hours = Number(match[1]);
  const mins = match[2];
  const meridiem = match[3].toUpperCase();
  if (meridiem === "PM" && hours !== 12) hours += 12;
  if (meridiem === "AM" && hours === 12) hours = 0;
  return `${String(hours).padStart(2, "0")}:${mins}`;
}

function buildScheduledAtIso(dateValue: string, timeLabel: string): string {
  const parsed = new Date(`${dateValue}T${labelTo24Hour(timeLabel)}:00`);
  return parsed.toISOString();
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function slotDate(dateValue: string, timeLabel: string): Date {
  return new Date(`${dateValue}T${labelTo24Hour(timeLabel)}:00`);
}

export default function BookAppointment() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [selectedHospital, setSelectedHospital] = useState<string>(HOSPITALS[0]?.id ?? "");
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [bookingToken, setBookingToken] = useState<string | null>(null);
  const [bookingDoctorId, setBookingDoctorId] = useState<string | null>(null);
  const [apiDoctors, setApiDoctors] = useState<DoctorListItem[]>([]);
  const [doctorsLoading, setDoctorsLoading] = useState(true);
  const [doctorBookedSlots, setDoctorBookedSlots] = useState<string[]>([]);
  const [patientBookedSlots, setPatientBookedSlots] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const now = new Date();
  const todayValue = toDateInputValue(now);
  const maxBookingDateValue = toDateInputValue(addDays(now, BOOKING_WINDOW_DAYS - 1));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!selectedHospital || !selectedDepartment) {
        setApiDoctors([]);
        setDoctorsLoading(false);
        return;
      }
      setDoctorsLoading(true);
      try {
        const departmentName =
          departments.find((d) => d.id === selectedDepartment)?.name ?? selectedDepartment;
        const list = await apiFetch<DoctorListItem[]>(
          `/api/doctors?department=${encodeURIComponent(departmentName)}&hospitalId=${encodeURIComponent(selectedHospital)}`
        );
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
  }, [selectedDepartment, selectedHospital]);

  useEffect(() => {
    setSelectedDoctor(null);
  }, [selectedDepartment, selectedHospital]);

  useEffect(() => {
    if (!selectedDoctor || !selectedDate) {
      setDoctorBookedSlots([]);
      setPatientBookedSlots([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch<BookedSlotsResponse>(
          `/api/appointments/booked-slots?doctorId=${selectedDoctor}&date=${selectedDate}`
        );
        if (!cancelled) {
          setDoctorBookedSlots(res.doctorBookedSlots ?? res.slots);
          setPatientBookedSlots(res.patientBookedSlots ?? []);
        }
      } catch {
        if (!cancelled) {
          setDoctorBookedSlots([]);
          setPatientBookedSlots([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedDoctor, selectedDate]);

  useEffect(() => {
    setSelectedTime(null);
  }, [selectedDoctor, selectedDate]);

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
    rating: d.rating ?? 5,
    averageDelayMinutes: d.averageDelayMinutes ?? 0,
  }));

  const timeSlots = CLINIC_TIME_SLOTS;

  const dates = Array.from({ length: BOOKING_WINDOW_DAYS }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return {
      value: toDateInputValue(d),
      label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    };
  });

  const handleConfirmBooking = async () => {
    if (!selectedDoctor || !selectedDate || !selectedTime) return;
    setSubmitting(true);
    try {
      const scheduledAt = buildScheduledAtIso(selectedDate, selectedTime);
      const res = await apiFetch<CreateAppointmentResponse>("/api/appointments", {
        method: "POST",
        body: JSON.stringify({ doctorId: selectedDoctor, scheduledAt, hospitalId: selectedHospital }),
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
    } finally {
      setSubmitting(false);
    }
  };

  const handleBackToDashboard = () => {
    navigate("/dashboard");
  };

  const department = departments.find((d) => d.id === selectedDepartment);
  const doctor = doctors.find((d) => d.id === selectedDoctor);
  const hospital = HOSPITALS.find((h) => h.id === selectedHospital);

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
              {[1, 2, 3, 4].map((s) => (
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
                  {s < 4 && (
                    <div
                      className={`flex-1 h-1 mx-2 rounded-full transition-all ${
                        s < step ? "bg-success" : "bg-gray-200"
                      }`}
                    ></div>
                  )}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-4 mt-3 text-center text-xs font-medium">
              <span className={step >= 1 ? "text-primary" : "text-gray-400"}>Hospital</span>
              <span className={step >= 2 ? "text-primary" : "text-gray-400"}>Department</span>
              <span className={step >= 3 ? "text-primary" : "text-gray-400"}>Doctor</span>
              <span className={step >= 4 ? "text-primary" : "text-gray-400"}>Date & Time</span>
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
                      <p className="text-gray-600 text-sm font-medium">Hospital</p>
                      <p className="text-gray-900 font-semibold">{hospital?.name}</p>
                    </div>
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
                      <p className="text-gray-900 font-semibold">
                        {dates.find((d) => d.value === selectedDate)?.label ?? selectedDate}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 text-sm font-medium">Time</p>
                      <p className="text-gray-900 font-semibold">{selectedTime}</p>
                    </div>
                  </div>

                  <p className="text-gray-600 text-sm mb-8">Please arrive 10 minutes early.</p>

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
            {/* Step 1: Hospital Selection */}
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Select Hospital</h2>
                  <Select value={selectedHospital} onValueChange={setSelectedHospital}>
                    <SelectTrigger className="bg-white border-gray-200">
                      <SelectValue placeholder="Choose hospital" />
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
                    disabled={!selectedHospital}
                    className="bg-primary hover:bg-primary/90 text-white gap-2"
                  >
                    Next <ArrowRight size={18} />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Department Selection */}
            {step === 2 && (
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
                    onClick={() => setStep(1)}
                    variant="outline"
                    className="gap-2"
                  >
                    <ChevronLeft size={18} />
                    Back
                  </Button>
                  <Button
                    onClick={() => setStep(3)}
                    disabled={!selectedDepartment}
                    className="bg-primary hover:bg-primary/90 text-white gap-2"
                  >
                    Next <ArrowRight size={18} />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Doctor Selection */}
            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">Select Doctor</h2>
                  <p className="text-gray-600 mb-4">Choose a doctor from {department?.name}</p>
                  {doctorsLoading && <p className="text-sm text-gray-500 mb-2">Loading doctors…</p>}
                  {!doctorsLoading && doctors.length === 0 && (
                    <p className="text-sm text-amber-700 mb-2">
                      No doctors available for this department. Add a doctor or update seeded doctor departments.
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
                              <p className="text-xs text-gray-500">{doc.averageDelayMinutes}m avg delay</p>
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
                    onClick={() => setStep(2)}
                    variant="outline"
                    className="gap-2"
                  >
                    <ChevronLeft size={18} />
                    Back
                  </Button>
                  <Button
                    onClick={() => setStep(4)}
                    disabled={!selectedDoctor}
                    className="bg-primary hover:bg-primary/90 text-white gap-2"
                  >
                    Next <ArrowRight size={18} />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Date & Time Selection */}
            {step === 4 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Select Date & Time</h2>

                  {/* Date Selection */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-3">Choose Date</label>
                    <div className="grid grid-cols-2 sm:grid-cols-7 gap-2">
                      {dates.map((date) => (
                        <button
                          key={date.value}
                          onClick={() => setSelectedDate(date.value)}
                          className={`py-2 px-3 rounded-lg border-2 font-semibold transition-all text-center text-sm ${
                            selectedDate === date.value
                              ? "border-primary bg-blue-100 text-primary"
                              : "border-gray-200 text-gray-600 hover:border-primary hover:bg-gray-50"
                          }`}
                        >
                          {date.label}
                        </button>
                      ))}
                    </div>
                    <input
                      type="date"
                      min={todayValue}
                      max={maxBookingDateValue}
                      value={selectedDate ?? ""}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="mt-3 h-10 rounded-md border border-gray-200 px-3 text-sm"
                    />
                    <p className="mt-2 text-xs text-gray-500">
                      Appointments can be booked up to {BOOKING_WINDOW_DAYS} days in advance.
                    </p>
                  </div>

                  {/* Time Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Choose Time</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {timeSlots.map((time) => {
                        const slotKey = labelTo24Hour(time);
                        const isDoctorBooked = doctorBookedSlots.includes(slotKey);
                        const isPatientBooked = patientBookedSlots.includes(slotKey);
                        const isPast = selectedDate ? slotDate(selectedDate, time).getTime() <= Date.now() : false;
                        const disabled = isDoctorBooked || isPatientBooked || isPast;
                        return (
                        <button
                          key={time}
                          onClick={() => setSelectedTime(time)}
                          disabled={disabled}
                          className={`py-3 px-4 rounded-lg border-2 font-medium transition-all text-center ${
                            disabled
                              ? "border-gray-100 bg-gray-100 text-gray-400 cursor-not-allowed"
                              : selectedTime === time
                              ? "border-primary bg-blue-100 text-primary"
                              : "border-gray-200 text-gray-600 hover:border-primary hover:bg-gray-50"
                          }`}
                        >
                          {time}
                          {isPast && <span className="block text-[10px] font-normal">Past</span>}
                          {isDoctorBooked && <span className="block text-[10px] font-normal">Booked</span>}
                          {!isDoctorBooked && isPatientBooked && (
                            <span className="block text-[10px] font-normal">Already booked</span>
                          )}
                        </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 sm:p-6 border border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-3">Booking Summary</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Hospital:</span>
                      <span className="font-semibold text-gray-900">{hospital?.name}</span>
                    </div>
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
                      <span className="font-semibold text-gray-900">
                        {dates.find((d) => d.value === selectedDate)?.label ?? selectedDate}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Time:</span>
                      <span className="font-semibold text-gray-900">{selectedTime}</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between pt-6 border-t border-gray-200">
                  <Button
                    onClick={() => setStep(3)}
                    variant="outline"
                    className="gap-2"
                  >
                    <ChevronLeft size={18} />
                    Back
                  </Button>
                  <Button
                    onClick={() => void handleConfirmBooking()}
                    disabled={!selectedDate || !selectedTime || submitting}
                    className="bg-primary hover:bg-primary/90 text-white gap-2"
                  >
                    <CheckCircle size={18} />
                    {submitting ? "Booking..." : bookingToken ? "Booked" : "Confirm Booking"}
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
