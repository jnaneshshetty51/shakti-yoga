-- CreateTable
CREATE TABLE "TherapyModule" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "attachmentUrl" TEXT,
    "attachmentName" TEXT,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TherapyModule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TherapyModule_userId_idx" ON "TherapyModule"("userId");

-- AddForeignKey
ALTER TABLE "TherapyModule" ADD CONSTRAINT "TherapyModule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TherapyModule" ADD CONSTRAINT "TherapyModule_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TherapyModule" ADD CONSTRAINT "TherapyModule_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

