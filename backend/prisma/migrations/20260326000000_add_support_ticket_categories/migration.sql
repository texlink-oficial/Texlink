-- AlterEnum: Add missing SupportTicketCategory values
-- These were added to schema.prisma but never had a dedicated migration
ALTER TYPE "SupportTicketCategory" ADD VALUE IF NOT EXISTS 'FORNECEDORES';
ALTER TYPE "SupportTicketCategory" ADD VALUE IF NOT EXISTS 'RELATORIOS';
ALTER TYPE "SupportTicketCategory" ADD VALUE IF NOT EXISTS 'SUGESTAO';
