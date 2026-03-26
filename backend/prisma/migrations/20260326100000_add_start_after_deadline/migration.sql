-- AlterTable: Add startAfterDeadline flag to orders
ALTER TABLE "orders" ADD COLUMN "startAfterDeadline" BOOLEAN NOT NULL DEFAULT false;
