-- CreateEnum
CREATE TYPE "DataDeletionStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'REJECTED');

-- CreateTable
CREATE TABLE "data_deletion_requests" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "DataDeletionStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "processedAt" TIMESTAMP(3),
    "processedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "data_deletion_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "data_deletion_requests_userId_idx" ON "data_deletion_requests"("userId");

-- CreateIndex
CREATE INDEX "data_deletion_requests_status_idx" ON "data_deletion_requests"("status");

-- AddForeignKey
ALTER TABLE "data_deletion_requests" ADD CONSTRAINT "data_deletion_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
