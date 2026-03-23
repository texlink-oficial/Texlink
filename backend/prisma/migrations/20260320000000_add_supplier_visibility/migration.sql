-- CreateEnum
CREATE TYPE "SupplierOrigin" AS ENUM ('SELF_REGISTERED', 'INVITED');

-- CreateEnum
CREATE TYPE "PoolVisibility" AS ENUM ('PUBLIC', 'EXCLUSIVE');

-- AlterTable
ALTER TABLE "supplier_profiles"
ADD COLUMN "origin" "SupplierOrigin" NOT NULL DEFAULT 'SELF_REGISTERED',
ADD COLUMN "poolVisibility" "PoolVisibility" NOT NULL DEFAULT 'PUBLIC',
ADD COLUMN "invitedByCompanyId" TEXT;

-- AddForeignKey
ALTER TABLE "supplier_profiles"
ADD CONSTRAINT "supplier_profiles_invitedByCompanyId_fkey"
FOREIGN KEY ("invitedByCompanyId") REFERENCES "companies"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "supplier_profiles_poolVisibility_idx" ON "supplier_profiles"("poolVisibility");

-- CreateIndex
CREATE INDEX "supplier_profiles_invitedByCompanyId_idx" ON "supplier_profiles"("invitedByCompanyId");

-- Backfill: Mark suppliers that were invited via SupplierCredential as INVITED/EXCLUSIVE
UPDATE "supplier_profiles" sp
SET
  "origin" = 'INVITED',
  "poolVisibility" = 'EXCLUSIVE',
  "invitedByCompanyId" = sc."brandId"
FROM "supplier_credentials" sc
WHERE sc."supplierId" = sp."companyId"
  AND sc."status" IN ('ACTIVE', 'ONBOARDING_STARTED', 'ONBOARDING_IN_PROGRESS', 'CONTRACT_PENDING', 'CONTRACT_SIGNED');
