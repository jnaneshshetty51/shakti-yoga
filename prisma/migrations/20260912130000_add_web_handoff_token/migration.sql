-- CreateTable
CREATE TABLE "WebHandoffToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebHandoffToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WebHandoffToken_tokenHash_key" ON "WebHandoffToken"("tokenHash");

-- CreateIndex
CREATE INDEX "WebHandoffToken_userId_idx" ON "WebHandoffToken"("userId");

-- CreateIndex
CREATE INDEX "WebHandoffToken_expiresAt_idx" ON "WebHandoffToken"("expiresAt");

-- AddForeignKey
ALTER TABLE "WebHandoffToken" ADD CONSTRAINT "WebHandoffToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
