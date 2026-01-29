-- ==================== MIGRATION: Multi-Brand Relationships (N:M) ====================
-- Transforma arquitetura de 1:1 (credential -> brand) para N:M (supplier <-> brands)
-- Uma facção pode trabalhar para múltiplas marcas simultaneamente

-- ==================== 1. CRIAR NOVO ENUM ====================

CREATE TYPE "RelationshipStatus" AS ENUM (
  'PENDING',
  'CONTRACT_PENDING',
  'ACTIVE',
  'SUSPENDED',
  'TERMINATED'
);

-- ==================== 2. CRIAR TABELA SUPPLIER_BRAND_RELATIONSHIPS ====================

CREATE TABLE "supplier_brand_relationships" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "supplierId" TEXT NOT NULL,
  "brandId" TEXT NOT NULL,
  "status" "RelationshipStatus" NOT NULL DEFAULT 'PENDING',
  "initiatedBy" TEXT NOT NULL,
  "initiatedByRole" "UserRole" NOT NULL,
  "internalCode" TEXT,
  "notes" TEXT,
  "priority" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "activatedAt" TIMESTAMP(3),
  "suspendedAt" TIMESTAMP(3),
  "terminatedAt" TIMESTAMP(3),
  CONSTRAINT "fk_supplier_relationships" FOREIGN KEY ("supplierId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "fk_brand_suppliers" FOREIGN KEY ("brandId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "fk_initiated_by" FOREIGN KEY ("initiatedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "unique_supplier_brand" UNIQUE ("supplierId", "brandId")
);

CREATE INDEX "supplier_brand_relationships_supplierId_idx" ON "supplier_brand_relationships"("supplierId");
CREATE INDEX "supplier_brand_relationships_brandId_idx" ON "supplier_brand_relationships"("brandId");
CREATE INDEX "supplier_brand_relationships_status_idx" ON "supplier_brand_relationships"("status");

-- ==================== 3. CRIAR TABELA RELATIONSHIP_STATUS_HISTORY ====================

CREATE TABLE "relationship_status_history" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "relationshipId" TEXT NOT NULL,
  "status" "RelationshipStatus" NOT NULL,
  "notes" TEXT,
  "changedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "fk_relationship_status_history" FOREIGN KEY ("relationshipId") REFERENCES "supplier_brand_relationships"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "fk_status_changed_by" FOREIGN KEY ("changedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "relationship_status_history_relationshipId_idx" ON "relationship_status_history"("relationshipId");

-- ==================== 4. CRIAR TABELA BRAND_SPECIFIC_DOCUMENTS ====================

CREATE TABLE "brand_specific_documents" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "relationshipId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "isRequired" BOOLEAN NOT NULL DEFAULT false,
  "fileName" TEXT NOT NULL,
  "fileUrl" TEXT NOT NULL,
  "fileSize" INTEGER NOT NULL,
  "mimeType" TEXT NOT NULL,
  "isValid" BOOLEAN,
  "validationNotes" TEXT,
  "validatedAt" TIMESTAMP(3),
  "validatedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "fk_brand_specific_docs_relationship" FOREIGN KEY ("relationshipId") REFERENCES "supplier_brand_relationships"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "fk_brand_docs_validated_by" FOREIGN KEY ("validatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "brand_specific_documents_relationshipId_idx" ON "brand_specific_documents"("relationshipId");

-- ==================== 5. MODIFICAR SUPPLIER_ONBOARDINGS ====================

-- Adicionar nova coluna supplierId (vincula diretamente ao supplier)
ALTER TABLE "supplier_onboardings" ADD COLUMN "supplierId" TEXT;
ALTER TABLE "supplier_onboardings" ADD COLUMN "isCompleted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "supplier_onboardings" ADD COLUMN "supplierOnboardingId" TEXT;

-- Migrar dados: preencher supplierId baseado no credentialId
UPDATE "supplier_onboardings" so
SET "supplierId" = (
  SELECT sc."supplierId"
  FROM "supplier_credentials" sc
  WHERE sc."id" = so."credentialId"
  AND sc."supplierId" IS NOT NULL
)
WHERE "supplierId" IS NULL;

-- Marcar como completo se contractCompletedAt existe
UPDATE "supplier_onboardings"
SET "isCompleted" = true
WHERE "contractCompletedAt" IS NOT NULL;

-- Tornar supplierId NOT NULL após migração de dados
-- NOTA: Deixar como nullable por enquanto para compatibilidade
-- ALTER TABLE "supplier_onboardings" ALTER COLUMN "supplierId" SET NOT NULL;

-- Adicionar constraint UNIQUE em supplierId
-- CREATE UNIQUE INDEX "supplier_onboardings_supplierId_key" ON "supplier_onboardings"("supplierId");

-- Adicionar FK para supplier
ALTER TABLE "supplier_onboardings"
  ADD CONSTRAINT "fk_supplier_onboarding"
  FOREIGN KEY ("supplierId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Remover constraint antiga credentialId UNIQUE (mas manter coluna para histórico)
-- ALTER TABLE "supplier_onboardings" DROP CONSTRAINT IF EXISTS "supplier_onboardings_credentialId_key";

-- ==================== 6. MODIFICAR SUPPLIER_CONTRACTS ====================

-- Adicionar novas colunas
ALTER TABLE "supplier_contracts" ADD COLUMN "relationshipId" TEXT;
ALTER TABLE "supplier_contracts" ADD COLUMN "supplierId" TEXT;
ALTER TABLE "supplier_contracts" ADD COLUMN "brandId" TEXT;

-- Tornar credentialId nullable (era UNIQUE NOT NULL)
ALTER TABLE "supplier_contracts" ALTER COLUMN "credentialId" DROP NOT NULL;

-- Migrar dados: criar relationships para contratos existentes e vincular
DO $$
DECLARE
  contract_record RECORD;
  new_relationship_id TEXT;
BEGIN
  FOR contract_record IN
    SELECT
      cont."id" as contract_id,
      sc."supplierId",
      sc."brandId",
      sc."createdById",
      sc."createdAt",
      sc."updatedAt"
    FROM "supplier_contracts" cont
    INNER JOIN "supplier_credentials" sc ON cont."credentialId" = sc."id"
    WHERE cont."relationshipId" IS NULL
    AND sc."supplierId" IS NOT NULL
    AND sc."brandId" IS NOT NULL
  LOOP
    -- Verificar se já existe relacionamento
    SELECT "id" INTO new_relationship_id
    FROM "supplier_brand_relationships"
    WHERE "supplierId" = contract_record."supplierId"
    AND "brandId" = contract_record."brandId";

    -- Se não existe, criar
    IF new_relationship_id IS NULL THEN
      new_relationship_id := gen_random_uuid()::TEXT;

      INSERT INTO "supplier_brand_relationships" (
        "id",
        "supplierId",
        "brandId",
        "status",
        "initiatedBy",
        "initiatedByRole",
        "createdAt",
        "updatedAt"
      ) VALUES (
        new_relationship_id,
        contract_record."supplierId",
        contract_record."brandId",
        'ACTIVE', -- Contratos existentes assumimos ativos
        contract_record."createdById",
        'BRAND', -- Assumir que foi marca que iniciou
        contract_record."createdAt",
        contract_record."updatedAt"
      );

      -- Criar histórico
      INSERT INTO "relationship_status_history" (
        "id",
        "relationshipId",
        "status",
        "notes",
        "changedById",
        "createdAt"
      ) VALUES (
        gen_random_uuid()::TEXT,
        new_relationship_id,
        'ACTIVE',
        'Migrado de credencial existente',
        contract_record."createdById",
        contract_record."createdAt"
      );
    END IF;

    -- Atualizar contrato com relationshipId, supplierId e brandId
    UPDATE "supplier_contracts"
    SET
      "relationshipId" = new_relationship_id,
      "supplierId" = contract_record."supplierId",
      "brandId" = contract_record."brandId"
    WHERE "id" = contract_record.contract_id;
  END LOOP;
END $$;

-- Adicionar FKs
ALTER TABLE "supplier_contracts"
  ADD CONSTRAINT "fk_contract_relationship"
  FOREIGN KEY ("relationshipId") REFERENCES "supplier_brand_relationships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "supplier_contracts"
  ADD CONSTRAINT "fk_contract_supplier"
  FOREIGN KEY ("supplierId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "supplier_contracts"
  ADD CONSTRAINT "fk_contract_brand"
  FOREIGN KEY ("brandId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Adicionar UNIQUE constraint em relationshipId (um contrato por relacionamento)
CREATE UNIQUE INDEX "supplier_contracts_relationshipId_key" ON "supplier_contracts"("relationshipId") WHERE "relationshipId" IS NOT NULL;

-- ==================== 7. MODIFICAR ORDERS ====================

-- Adicionar relationshipId
ALTER TABLE "orders" ADD COLUMN "relationshipId" TEXT;

-- Migrar dados: vincular pedidos aos relationships
UPDATE "orders" o
SET "relationshipId" = (
  SELECT sbr."id"
  FROM "supplier_brand_relationships" sbr
  WHERE sbr."supplierId" = o."supplierId"
  AND sbr."brandId" = o."brandId"
  LIMIT 1
)
WHERE o."supplierId" IS NOT NULL AND o."brandId" IS NOT NULL;

-- Adicionar FK
ALTER TABLE "orders"
  ADD CONSTRAINT "fk_order_relationship"
  FOREIGN KEY ("relationshipId") REFERENCES "supplier_brand_relationships"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "orders_relationshipId_idx" ON "orders"("relationshipId");

-- ==================== 8. ATUALIZAR SUPPLIER_CREDENTIALS ====================

-- Adicionar supplierOnboardingId para manter compatibilidade
ALTER TABLE "supplier_credentials" ADD COLUMN "supplierOnboardingId" TEXT;

-- Migrar dados: vincular credential ao onboarding via supplierId
UPDATE "supplier_credentials" sc
SET "supplierOnboardingId" = (
  SELECT so."id"
  FROM "supplier_onboardings" so
  WHERE so."supplierId" = sc."supplierId"
  LIMIT 1
)
WHERE "supplierId" IS NOT NULL;

-- Adicionar FK
ALTER TABLE "supplier_credentials"
  ADD CONSTRAINT "fk_credential_onboarding"
  FOREIGN KEY ("supplierOnboardingId") REFERENCES "supplier_onboardings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ==================== 9. COMENTÁRIOS E DOCUMENTAÇÃO ====================

COMMENT ON TABLE "supplier_brand_relationships" IS 'Relacionamento N:M entre fornecedor e marca. Uma facção pode trabalhar para múltiplas marcas.';
COMMENT ON TABLE "relationship_status_history" IS 'Histórico de mudanças de status dos relacionamentos marca-facção';
COMMENT ON TABLE "brand_specific_documents" IS 'Documentos específicos exigidos por uma marca para um fornecedor';

COMMENT ON COLUMN "supplier_onboardings"."supplierId" IS 'Onboarding agora é por supplier (1:1), não por credential';
COMMENT ON COLUMN "supplier_onboardings"."isCompleted" IS 'Flag indicando se onboarding foi completado';

COMMENT ON COLUMN "supplier_contracts"."relationshipId" IS 'Contrato agora é vinculado ao relacionamento marca-facção';
COMMENT ON COLUMN "supplier_contracts"."credentialId" IS 'Mantido para compatibilidade/histórico, mas novos contratos usam relationshipId';

COMMENT ON COLUMN "orders"."relationshipId" IS 'Pedido vinculado ao relacionamento marca-facção específico';

-- ==================== FIM DA MIGRATION ====================
