-- Add documentType to companies (defaults existing to CNPJ)
ALTER TABLE "companies" ADD COLUMN "documentType" TEXT NOT NULL DEFAULT 'CNPJ';

-- Add documentType to supplier_credentials (defaults existing to CNPJ)
ALTER TABLE "supplier_credentials" ADD COLUMN "documentType" TEXT NOT NULL DEFAULT 'CNPJ';
