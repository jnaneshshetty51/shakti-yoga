-- Public-facing staff / teacher profile.
CREATE TABLE "StaffProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT,
    "bio" TEXT,
    "specialties" TEXT[],
    "yearsExperience" INTEGER,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "publicVisible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StaffProfile_userId_key" ON "StaffProfile"("userId");

ALTER TABLE "StaffProfile" ADD CONSTRAINT "StaffProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
