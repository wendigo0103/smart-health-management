# HealthQueue Progression File

## What This Project Is

HealthQueue is a hospital queue and appointment management system built as a React SPA with an Express API, MongoDB/Mongoose persistence, and Socket.io real-time queue updates. The app runs through Vite on port 8080 in development.

Core areas in the current codebase:

- Patient booking flow: `client/pages/BookAppointment.tsx`
- Patient dashboard and queue tracking: `client/pages/Dashboard.tsx`, `client/pages/QueueTracker.tsx`
- Admin portal: `client/components/admin/*`
- Appointment API and validation: `server/routes/appointments.routes.ts`, `server/services/queue.service.ts`
- Doctor API and doctor records: `server/routes/doctors.routes.ts`, `server/models/User.ts`
- Shared frontend/backend contracts: `shared/api.ts`
- Socket.io setup and broadcasts: `server/config/socket.ts`, `server/services/realtime.service.ts`

## What Was Earlier

- Booking was organized as Department -> Doctor -> Date & Time.
- Doctors were not tied to hospitals.
- Appointments were unique per doctor/time, but the UI did not block the same patient from taking that same time with another doctor.
- The confirmation screen still mentioned email confirmation.
- Doctor management in admin settings only listed doctors; it did not create them.
- Doctor feedback/rating fields were not part of the shared doctor response.
- Admin appointment lists loaded by HTTP but did not refresh from a dedicated appointment socket event.
- Browser notifications used direct `new Notification(...)` calls and had no service worker boilerplate.

## What Changed Now

- Added hospital support through shared `HOSPITALS`, `hospitalId`, and `hospitalName` fields.
- Added hospital selection as the first booking step.
- Doctor search can now filter by hospital and department.
- Appointments store `hospitalId` and validate that the selected doctor belongs to the selected hospital.
- Patients can book multiple appointments with different doctors, but cannot book the same exact slot with another doctor.
- Slot API now returns `doctorBookedSlots`, `patientBookedSlots`, and their union.
- Slot picker disables doctor-booked slots as `Booked` and cross-doctor patient conflicts as `Already booked`.
- Added a MongoDB partial unique index for `patientId + scheduledAt` to prevent race-condition double booking.
- Removed email confirmation text from the booking success screen.
- Added a persistent `Track Queue` link in the navbar and patient dashboard.
- Made appointment cards clickable so users can navigate back to booking.
- Added admin doctor creation in Settings.
- Added doctor feedback fields: `rating` and `averageDelayMinutes`.
- Queue delay updates now update doctor feedback metrics.
- Added Socket.io `watchAppointments` and `appointmentBooked` event flow for dynamic admin appointment refresh.
- Added service worker and client helper boilerplate for more reliable notification permission, registration, and display.
- Updated seed script to assign doctors to all hospitals, ensuring each department has doctors in Central City Hospital, Northside Medical Center, and Lakeside Care Hospital.

## Files Changed

- `shared/api.ts`
- `server/models/Appointment.ts`
- `server/models/User.ts`
- `server/routes/appointments.routes.ts`
- `server/routes/doctors.routes.ts`
- `server/services/auth.service.ts`
- `server/services/queue.service.ts`
- `server/services/realtime.service.ts`
- `server/config/socket.ts`
- `server/scripts/seed.ts`
- `client/pages/BookAppointment.tsx`
- `client/pages/Dashboard.tsx`
- `client/pages/QueueTracker.tsx`
- `client/components/layout/Navbar.tsx`
- `client/components/admin/SettingsScreen.tsx`
- `client/components/admin/AppointmentsScreen.tsx`
- `client/lib/pushNotifications.ts`
- `public/service-worker.js`

## Push Notification Checklist

- Serve the app from `https://` in production. Browser push notifications are unreliable or blocked on plain HTTP outside localhost.
- Register `/service-worker.js` on app startup or before asking for notification permission.
- Ask permission only from a user gesture, such as the Queue Tracker notification toggle.
- Use Socket.io events for live in-app events and the service worker `showNotification` path for background-friendly local notifications.
- For true remote push when the browser tab is closed, add a server-side Web Push provider, store user push subscriptions in MongoDB, and send with VAPID keys. The current implementation provides the client/service-worker boilerplate and Socket.io event emission path.
- Keep notification payloads small: `title`, `body`, `url`, and optional `tag`.
