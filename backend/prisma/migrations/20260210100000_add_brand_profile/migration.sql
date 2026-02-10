-- CreateTable
CREATE TABLE "brand_profiles" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "onboardingPhase" INTEGER NOT NULL DEFAULT 1,
    "onboardingComplete" BOOLEAN NOT NULL DEFAULT false,
    "businessQualification" JSONB,
    "productNeeds" JSONB,
    "productTypes" TEXT[],
    "specialties" TEXT[],
    "monthlyVolume" INTEGER,
    "desiredRevenue" DECIMAL(12,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brand_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "brand_profiles_companyId_key" ON "brand_profiles"("companyId");

-- AddForeignKey
ALTER TABLE "brand_profiles" ADD CONSTRAINT "brand_profiles_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
