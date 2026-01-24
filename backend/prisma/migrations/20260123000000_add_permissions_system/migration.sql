-- CreateEnum
CREATE TYPE "CompanyRole" AS ENUM ('ADMIN', 'OPERATIONS_MANAGER', 'FINANCIAL_MANAGER', 'SALES', 'PRODUCTION_MANAGER', 'VIEWER');

-- CreateEnum
CREATE TYPE "Permission" AS ENUM ('ORDERS_VIEW', 'ORDERS_CREATE', 'ORDERS_EDIT', 'ORDERS_DELETE', 'ORDERS_ACCEPT_REJECT', 'ORDERS_UPDATE_STATUS', 'SUPPLIERS_VIEW', 'SUPPLIERS_ADD', 'SUPPLIERS_REMOVE', 'SUPPLIERS_RATE', 'FINANCIAL_VIEW', 'FINANCIAL_MANAGE', 'FINANCIAL_EXPORT', 'MESSAGES_VIEW', 'MESSAGES_SEND', 'REPORTS_VIEW', 'REPORTS_EXPORT', 'TEAM_VIEW', 'TEAM_INVITE', 'TEAM_MANAGE', 'TEAM_MANAGE_PERMISSIONS', 'SETTINGS_VIEW', 'SETTINGS_EDIT', 'CAPACITY_VIEW', 'CAPACITY_MANAGE');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'CANCELLED');

-- AlterTable: Add new columns to company_users with defaults for existing rows
ALTER TABLE "company_users" ADD COLUMN "companyRole" "CompanyRole" NOT NULL DEFAULT 'VIEWER';
ALTER TABLE "company_users" ADD COLUMN "isCompanyAdmin" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "company_users" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Migrate existing data: Set OWNER role users as ADMIN with isCompanyAdmin = true
UPDATE "company_users" SET "companyRole" = 'ADMIN', "isCompanyAdmin" = true WHERE "role" = 'OWNER';

-- Migrate existing data: Set MANAGER role users as OPERATIONS_MANAGER
UPDATE "company_users" SET "companyRole" = 'OPERATIONS_MANAGER' WHERE "role" = 'MANAGER';

-- Migrate existing data: Set MEMBER role users as VIEWER (already default)
-- No action needed as VIEWER is the default

-- CreateTable
CREATE TABLE "company_user_permissions" (
    "id" TEXT NOT NULL,
    "companyUserId" TEXT NOT NULL,
    "permission" "Permission" NOT NULL,
    "granted" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_user_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitations" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "companyRole" "CompanyRole" NOT NULL DEFAULT 'VIEWER',
    "invitedById" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "company_user_permissions_companyUserId_permission_key" ON "company_user_permissions"("companyUserId", "permission");

-- CreateIndex
CREATE UNIQUE INDEX "invitations_token_key" ON "invitations"("token");

-- CreateIndex
CREATE UNIQUE INDEX "invitations_companyId_email_status_key" ON "invitations"("companyId", "email", "status");

-- AddForeignKey
ALTER TABLE "company_user_permissions" ADD CONSTRAINT "company_user_permissions_companyUserId_fkey" FOREIGN KEY ("companyUserId") REFERENCES "company_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
