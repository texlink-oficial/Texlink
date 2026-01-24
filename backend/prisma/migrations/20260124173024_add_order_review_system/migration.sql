-- CreateEnum
CREATE TYPE "OrderOrigin" AS ENUM ('ORIGINAL', 'REWORK');

-- CreateEnum
CREATE TYPE "ReviewType" AS ENUM ('QUALITY_CHECK', 'FINAL_REVIEW');

-- CreateEnum
CREATE TYPE "ReviewResult" AS ENUM ('APPROVED', 'PARTIAL', 'REJECTED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "OrderStatus" ADD VALUE 'EM_REVISAO';
ALTER TYPE "OrderStatus" ADD VALUE 'PARCIALMENTE_APROVADO';
ALTER TYPE "OrderStatus" ADD VALUE 'REPROVADO';
ALTER TYPE "OrderStatus" ADD VALUE 'AGUARDANDO_RETRABALHO';

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "approvalCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "origin" "OrderOrigin" NOT NULL DEFAULT 'ORIGINAL',
ADD COLUMN     "parentOrderId" TEXT,
ADD COLUMN     "rejectionCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "revisionNumber" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "secondQualityCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalReviewCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "order_reviews" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "type" "ReviewType" NOT NULL,
    "result" "ReviewResult" NOT NULL,
    "totalQuantity" INTEGER NOT NULL,
    "approvedQuantity" INTEGER NOT NULL DEFAULT 0,
    "rejectedQuantity" INTEGER NOT NULL DEFAULT 0,
    "secondQualityQuantity" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedById" TEXT NOT NULL,
    "childOrderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_rejected_items" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "defectDescription" TEXT,
    "requiresRework" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "review_rejected_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "second_quality_items" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "reviewId" TEXT,
    "quantity" INTEGER NOT NULL,
    "defectType" TEXT NOT NULL,
    "defectDescription" TEXT,
    "originalUnitValue" DECIMAL(10,2) NOT NULL,
    "discountPercentage" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "finalUnitValue" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "second_quality_items_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_parentOrderId_fkey" FOREIGN KEY ("parentOrderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_reviews" ADD CONSTRAINT "order_reviews_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_reviews" ADD CONSTRAINT "order_reviews_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_rejected_items" ADD CONSTRAINT "review_rejected_items_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "order_reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "second_quality_items" ADD CONSTRAINT "second_quality_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
