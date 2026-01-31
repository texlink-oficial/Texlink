-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "PartnerCategory" AS ENUM (
        'HEALTH_WELLNESS',
        'COMPLIANCE',
        'ACCOUNTING',
        'FINANCE',
        'TECHNOLOGY',
        'TRAINING',
        'INSURANCE',
        'OTHER'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "partners" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "logoUrl" TEXT,
    "website" TEXT NOT NULL,
    "category" "PartnerCategory" NOT NULL,
    "benefits" TEXT[],
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "discountCode" TEXT,
    "discountInfo" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partners_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "partners_isActive_idx" ON "partners"("isActive");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "partners_category_idx" ON "partners"("category");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "partners_displayOrder_idx" ON "partners"("displayOrder");
