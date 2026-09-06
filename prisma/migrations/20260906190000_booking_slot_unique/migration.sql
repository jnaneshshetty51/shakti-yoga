-- A teacher can hold only one live (pending/confirmed) session per start time.

-- First, heal any pre-existing collisions: if two live bookings share a
-- (teacher, start time), keep the earliest and cancel the rest.
WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY "teacherId", "date"
           ORDER BY "createdAt" ASC, id ASC
         ) AS rn
  FROM "Booking"
  WHERE status IN ('PENDING', 'CONFIRMED')
)
UPDATE "Booking" b
   SET status = 'CANCELLED'
  FROM ranked r
 WHERE b.id = r.id
   AND r.rn > 1;

-- Partial unique index: cancelled / completed / no-show rows don't block re-booking.
CREATE UNIQUE INDEX "Booking_teacherId_date_active_key"
  ON "Booking" ("teacherId", "date")
  WHERE status IN ('PENDING', 'CONFIRMED');
