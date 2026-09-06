-- A teacher can hold only one live (pending/confirmed) session per start time.
-- Partial unique index: cancelled / completed / no-show rows don't block re-booking.
CREATE UNIQUE INDEX "Booking_teacherId_date_active_key"
  ON "Booking" ("teacherId", "date")
  WHERE status IN ('PENDING', 'CONFIRMED');
