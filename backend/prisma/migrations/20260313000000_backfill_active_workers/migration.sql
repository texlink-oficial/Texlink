-- Backfill activeWorkers from businessQualification.qtdColaboradores
-- for suppliers who completed onboarding via OnboardingBusinessPage
-- but did not have activeWorkers/hoursPerDay saved to the profile.
-- Note: dailyCapacity maps to column "monthlyCapacity" via @map

-- Step 1: Backfill activeWorkers from JSON field
UPDATE "supplier_profiles"
SET
  "activeWorkers" = CAST("businessQualification"->>'qtdColaboradores' AS INTEGER)
WHERE "activeWorkers" IS NULL
  AND "businessQualification" IS NOT NULL
  AND "businessQualification"->>'qtdColaboradores' IS NOT NULL
  AND CAST("businessQualification"->>'qtdColaboradores' AS INTEGER) > 0;

-- Step 2: Set default hoursPerDay (8h) where missing
UPDATE "supplier_profiles"
SET "hoursPerDay" = 8.00
WHERE "hoursPerDay" IS NULL
  AND "activeWorkers" IS NOT NULL;

-- Step 3: Recalculate dailyCapacity (mapped to "monthlyCapacity" column)
UPDATE "supplier_profiles"
SET "monthlyCapacity" = "activeWorkers" * COALESCE("hoursPerDay", 8) * 60
WHERE "activeWorkers" IS NOT NULL
  AND ("monthlyCapacity" IS NULL OR "monthlyCapacity" = 0);
