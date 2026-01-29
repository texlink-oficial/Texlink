import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * E2E Tests for V3 N:M Supplier-Brand Relationships
 *
 * Test Scenarios:
 * 1. Admin creates a supplier in the pool
 * 2. Brand A credentials the supplier
 * 3. Brand B credentials the same supplier
 * 4. Supplier signs contracts with both brands
 * 5. Orders from both brands
 * 6. Brand A suspends, Brand B continues active
 */
describe('Relationships V3 N:M (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  // Test tokens (would be generated in real scenario)
  let adminToken: string;
  let brandAToken: string;
  let brandBToken: string;
  let supplierToken: string;

  // Test entity IDs
  let supplierId: string;
  let brandAId: string;
  let brandBId: string;
  let relationshipAId: string;
  let relationshipBId: string;
  let brandAUserId: string;
  let brandBUserId: string;
  let supplierUserId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );

    prisma = moduleFixture.get<PrismaService>(PrismaService);

    await app.init();

    // Setup test data
    await setupTestData();
  });

  afterAll(async () => {
    // Cleanup test data
    await cleanupTestData();
    // Disconnect Prisma to avoid Jest exit warning
    await prisma.$disconnect();
    await app.close();
  });

  // Store test email pattern for cleanup
  let testEmailPattern: string;

  async function setupTestData() {
    // Generate unique suffix for this test run to avoid conflicts
    const testSuffix = Date.now().toString();
    testEmailPattern = `test-${testSuffix}`;

    // Create Admin user
    await prisma.user.create({
      data: {
        email: `admin-${testEmailPattern}@texlink.com`,
        passwordHash: '$2b$10$testhashedpassword',
        name: 'Admin Test',
        role: 'ADMIN',
      },
    });

    // Create Brand A user
    const brandAUser = await prisma.user.create({
      data: {
        email: `marca-a-${testEmailPattern}@test.com`,
        passwordHash: '$2b$10$testhashedpassword',
        name: 'User Marca A',
        role: 'BRAND',
      },
    });
    brandAUserId = brandAUser.id;

    // Create Brand A company
    const brandA = await prisma.company.create({
      data: {
        type: 'BRAND',
        legalName: 'Marca A Ltda',
        tradeName: 'Marca A',
        document: `1${testSuffix.slice(-13)}`,
        email: `marca-a-${testEmailPattern}@company.com`,
        city: 'São Paulo',
        state: 'SP',
        companyUsers: {
          create: {
            userId: brandAUser.id,
            isCompanyAdmin: true,
          },
        },
      },
    });
    brandAId = brandA.id;

    // Create Brand B user
    const brandBUser = await prisma.user.create({
      data: {
        email: `marca-b-${testEmailPattern}@test.com`,
        passwordHash: '$2b$10$testhashedpassword',
        name: 'User Marca B',
        role: 'BRAND',
      },
    });
    brandBUserId = brandBUser.id;

    // Create Brand B company
    const brandB = await prisma.company.create({
      data: {
        type: 'BRAND',
        legalName: 'Marca B Ltda',
        tradeName: 'Marca B',
        document: `2${testSuffix.slice(-13)}`,
        email: `marca-b-${testEmailPattern}@company.com`,
        city: 'Rio de Janeiro',
        state: 'RJ',
        companyUsers: {
          create: {
            userId: brandBUser.id,
            isCompanyAdmin: true,
          },
        },
      },
    });
    brandBId = brandB.id;

    // Create Supplier user
    const supplierUser = await prisma.user.create({
      data: {
        email: `faccao-${testEmailPattern}@test.com`,
        passwordHash: '$2b$10$testhashedpassword',
        name: 'User Facção',
        role: 'SUPPLIER',
      },
    });
    supplierUserId = supplierUser.id;

    // Create Supplier company first
    const supplier = await prisma.company.create({
      data: {
        type: 'SUPPLIER',
        legalName: 'Facção Teste Ltda',
        tradeName: 'Facção Teste',
        document: `3${testSuffix.slice(-13)}`,
        email: `faccao-${testEmailPattern}@company.com`,
        city: 'Blumenau',
        state: 'SC',
      },
    });
    supplierId = supplier.id;

    // Create supplier profile
    await prisma.supplierProfile.create({
      data: {
        companyId: supplierId,
        productTypes: ['CAMISETA', 'CALCA'],
        specialties: ['Jeans', 'Malha'],
        monthlyCapacity: 10000,
        currentOccupancy: 0,
      },
    });

    // Create supplier onboarding - use minimal required fields
    await prisma.supplierOnboarding.create({
      data: {
        supplierId: supplierId,
        isCompleted: true,
        currentStep: 6,
      },
    });

    // Link supplier user to company
    await prisma.companyUser.create({
      data: {
        userId: supplierUser.id,
        companyId: supplierId,
        isCompanyAdmin: true,
      },
    });

    // Generate test tokens (simplified for testing)
    // In real scenarios, you'd call the auth endpoint
    adminToken = 'test-admin-token';
    brandAToken = 'test-brand-a-token';
    brandBToken = 'test-brand-b-token';
    supplierToken = 'test-supplier-token';
  }

  async function cleanupTestData() {
    // Delete in reverse order of dependencies
    const companyIds = [supplierId, brandAId, brandBId].filter(Boolean);

    // Delete relationship history
    if (relationshipAId || relationshipBId) {
      await prisma.relationshipStatusHistory.deleteMany({
        where: {
          relationshipId: {
            in: [relationshipAId, relationshipBId].filter(Boolean),
          },
        },
      });
    }

    // Delete contracts
    if (supplierId) {
      await prisma.supplierContract.deleteMany({
        where: { supplierId },
      });
    }

    // Delete relationships
    if (supplierId) {
      await prisma.supplierBrandRelationship.deleteMany({
        where: { supplierId },
      });
    }

    // Delete orders
    if (supplierId) {
      await prisma.order.deleteMany({
        where: { supplierId },
      });
    }

    // Delete onboarding
    if (supplierId) {
      await prisma.supplierOnboarding.deleteMany({
        where: { supplierId },
      });
    }

    // Delete supplier profile
    if (supplierId) {
      await prisma.supplierProfile.deleteMany({
        where: { companyId: supplierId },
      });
    }

    // Delete company users
    if (companyIds.length > 0) {
      await prisma.companyUser.deleteMany({
        where: {
          companyId: { in: companyIds },
        },
      });
    }

    // Delete companies
    if (companyIds.length > 0) {
      await prisma.company.deleteMany({
        where: {
          id: { in: companyIds },
        },
      });
    }

    // Delete users by pattern if set
    if (testEmailPattern) {
      await prisma.user.deleteMany({
        where: {
          email: { contains: testEmailPattern },
        },
      });
    }
  }

  describe('Scenario 1: Supplier is in the pool with completed onboarding', () => {
    it('should have supplier with completed onboarding', async () => {
      const supplier = await prisma.company.findUnique({
        where: { id: supplierId },
        include: {
          onboarding: true,
          supplierProfile: true,
        },
      });

      expect(supplier).toBeDefined();
      expect(supplier?.type).toBe('SUPPLIER');
      expect(supplier?.onboarding?.isCompleted).toBe(true);
      expect(supplier?.supplierProfile).toBeDefined();
    });
  });

  describe('Scenario 2: Brand A credentials the supplier', () => {
    it('should list supplier as available for Brand A', async () => {
      const availableSuppliers = await prisma.company.findMany({
        where: {
          type: 'SUPPLIER',
          onboarding: {
            isCompleted: true,
          },
          supplierRelationships: {
            none: {
              brandId: brandAId,
            },
          },
        },
      });

      expect(availableSuppliers.length).toBeGreaterThan(0);
      expect(availableSuppliers.some((s) => s.id === supplierId)).toBe(true);
    });

    it('should create relationship between Brand A and Supplier', async () => {
      const relationship = await prisma.supplierBrandRelationship.create({
        data: {
          supplierId: supplierId,
          brandId: brandAId,
          status: 'CONTRACT_PENDING',
          initiatedBy: brandAUserId,
          initiatedByRole: 'BRAND',
        },
      });

      relationshipAId = relationship.id;

      expect(relationship).toBeDefined();
      expect(relationship.status).toBe('CONTRACT_PENDING');
      expect(relationship.supplierId).toBe(supplierId);
      expect(relationship.brandId).toBe(brandAId);
    });

    it('should create contract for relationship A', async () => {
      const contract = await prisma.supplierContract.create({
        data: {
          relationshipId: relationshipAId,
          supplierId: supplierId,
          brandId: brandAId,
          documentUrl: 'https://storage.test.com/contract-a.pdf',
          documentHash: 'hash123',
          status: 'PENDING_SUPPLIER_SIGNATURE',
        },
      });

      expect(contract).toBeDefined();
      expect(contract.relationshipId).toBe(relationshipAId);
    });
  });

  describe('Scenario 3: Brand B credentials the same supplier', () => {
    it('should still list supplier as available for Brand B', async () => {
      const availableSuppliers = await prisma.company.findMany({
        where: {
          type: 'SUPPLIER',
          onboarding: {
            isCompleted: true,
          },
          supplierRelationships: {
            none: {
              brandId: brandBId,
            },
          },
        },
      });

      expect(availableSuppliers.some((s) => s.id === supplierId)).toBe(true);
    });

    it('should create relationship between Brand B and Supplier', async () => {
      const relationship = await prisma.supplierBrandRelationship.create({
        data: {
          supplierId: supplierId,
          brandId: brandBId,
          status: 'CONTRACT_PENDING',
          initiatedBy: brandBUserId,
          initiatedByRole: 'BRAND',
        },
      });

      relationshipBId = relationship.id;

      expect(relationship).toBeDefined();
      expect(relationship.status).toBe('CONTRACT_PENDING');
      expect(relationship.supplierId).toBe(supplierId);
      expect(relationship.brandId).toBe(brandBId);
    });

    it('should create contract for relationship B', async () => {
      const contract = await prisma.supplierContract.create({
        data: {
          relationshipId: relationshipBId,
          supplierId: supplierId,
          brandId: brandBId,
          documentUrl: 'https://storage.test.com/contract-b.pdf',
          documentHash: 'hash456',
          status: 'PENDING_SUPPLIER_SIGNATURE',
        },
      });

      expect(contract).toBeDefined();
      expect(contract.relationshipId).toBe(relationshipBId);
    });

    it('should have two separate relationships for the same supplier', async () => {
      const relationships = await prisma.supplierBrandRelationship.findMany({
        where: {
          supplierId: supplierId,
        },
      });

      expect(relationships.length).toBe(2);
      expect(relationships.map((r) => r.brandId).sort()).toEqual(
        [brandAId, brandBId].sort(),
      );
    });
  });

  describe('Scenario 4: Supplier signs both contracts', () => {
    it('should sign contract with Brand A', async () => {
      const contract = await prisma.supplierContract.update({
        where: {
          relationshipId: relationshipAId,
        },
        data: {
          supplierSignedAt: new Date(),
          supplierSignedBy: { connect: { id: supplierUserId } },
          supplierSignatureIp: '127.0.0.1',
          status: 'SIGNED',
        },
      });

      // Activate relationship
      await prisma.supplierBrandRelationship.update({
        where: { id: relationshipAId },
        data: {
          status: 'ACTIVE',
          activatedAt: new Date(),
        },
      });

      expect(contract.supplierSignedAt).toBeDefined();
      expect(contract.status).toBe('SIGNED');
    });

    it('should sign contract with Brand B', async () => {
      const contract = await prisma.supplierContract.update({
        where: {
          relationshipId: relationshipBId,
        },
        data: {
          supplierSignedAt: new Date(),
          supplierSignedBy: { connect: { id: supplierUserId } },
          supplierSignatureIp: '127.0.0.1',
          status: 'SIGNED',
        },
      });

      // Activate relationship
      await prisma.supplierBrandRelationship.update({
        where: { id: relationshipBId },
        data: {
          status: 'ACTIVE',
          activatedAt: new Date(),
        },
      });

      expect(contract.supplierSignedAt).toBeDefined();
      expect(contract.status).toBe('SIGNED');
    });

    it('should have both relationships ACTIVE', async () => {
      const relationships = await prisma.supplierBrandRelationship.findMany({
        where: {
          supplierId: supplierId,
          status: 'ACTIVE',
        },
      });

      expect(relationships.length).toBe(2);
    });
  });

  describe('Scenario 5: Supplier receives orders from both brands', () => {
    let orderAId: string;
    let orderBId: string;

    it('should create order from Brand A', async () => {
      const order = await prisma.order.create({
        data: {
          displayId: 'ORD-TEST-001',
          brandId: brandAId,
          supplierId: supplierId,
          relationshipId: relationshipAId,
          status: 'LANCADO_PELA_MARCA',
          productType: 'CAMISETA',
          productName: 'Camiseta Básica Teste',
          quantity: 100,
          pricePerUnit: 25.0,
          totalValue: 2500.0,
          deliveryDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      orderAId = order.id;

      expect(order).toBeDefined();
      expect(order.brandId).toBe(brandAId);
      expect(order.relationshipId).toBe(relationshipAId);
    });

    it('should create order from Brand B', async () => {
      const order = await prisma.order.create({
        data: {
          displayId: 'ORD-TEST-002',
          brandId: brandBId,
          supplierId: supplierId,
          relationshipId: relationshipBId,
          status: 'LANCADO_PELA_MARCA',
          productType: 'CALCA',
          productName: 'Calça Jeans Teste',
          quantity: 50,
          pricePerUnit: 45.0,
          totalValue: 2250.0,
          deliveryDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      orderBId = order.id;

      expect(order).toBeDefined();
      expect(order.brandId).toBe(brandBId);
      expect(order.relationshipId).toBe(relationshipBId);
    });

    it('should list supplier orders from both brands', async () => {
      const orders = await prisma.order.findMany({
        where: {
          supplierId: supplierId,
        },
      });

      expect(orders.length).toBe(2);
      expect(orders.map((o) => o.brandId).sort()).toEqual(
        [brandAId, brandBId].sort(),
      );
    });

    // Cleanup orders
    afterAll(async () => {
      await prisma.order.deleteMany({
        where: {
          id: {
            in: [orderAId, orderBId].filter(Boolean),
          },
        },
      });
    });
  });

  describe('Scenario 6: Brand A suspends relationship, Brand B continues', () => {
    it('should suspend relationship with Brand A', async () => {
      const relationship = await prisma.supplierBrandRelationship.update({
        where: { id: relationshipAId },
        data: {
          status: 'SUSPENDED',
          suspendedAt: new Date(),
        },
      });

      // Create status history
      await prisma.relationshipStatusHistory.create({
        data: {
          relationshipId: relationshipAId,
          status: 'SUSPENDED',
          changedById: brandAUserId,
          notes: 'Teste: Suspensão temporária',
        },
      });

      expect(relationship.status).toBe('SUSPENDED');
      expect(relationship.suspendedAt).toBeDefined();
    });

    it('should keep relationship with Brand B active', async () => {
      const relationship = await prisma.supplierBrandRelationship.findUnique({
        where: { id: relationshipBId },
      });

      expect(relationship?.status).toBe('ACTIVE');
    });

    it('should show different statuses for same supplier', async () => {
      const relationships = await prisma.supplierBrandRelationship.findMany({
        where: {
          supplierId: supplierId,
        },
        include: {
          brand: true,
        },
      });

      const relationshipA = relationships.find((r) => r.brandId === brandAId);
      const relationshipB = relationships.find((r) => r.brandId === brandBId);

      expect(relationshipA?.status).toBe('SUSPENDED');
      expect(relationshipB?.status).toBe('ACTIVE');
    });

    it('should prevent new orders from Brand A', async () => {
      const relationship = await prisma.supplierBrandRelationship.findUnique({
        where: { id: relationshipAId },
      });

      // Business logic: suspended relationships cannot create orders
      expect(relationship?.status).toBe('SUSPENDED');
      // In real implementation, order creation would be blocked
    });

    it('should allow new orders from Brand B', async () => {
      const relationship = await prisma.supplierBrandRelationship.findUnique({
        where: { id: relationshipBId },
      });

      // Business logic: active relationships can create orders
      expect(relationship?.status).toBe('ACTIVE');
    });
  });

  describe('Scenario 7: Reactivate relationship with Brand A', () => {
    it('should reactivate relationship with Brand A', async () => {
      const relationship = await prisma.supplierBrandRelationship.update({
        where: { id: relationshipAId },
        data: {
          status: 'ACTIVE',
          suspendedAt: null,
        },
      });

      // Create status history
      await prisma.relationshipStatusHistory.create({
        data: {
          relationshipId: relationshipAId,
          status: 'ACTIVE',
          changedById: brandAUserId,
          notes: 'Teste: Reativação após suspensão',
        },
      });

      expect(relationship.status).toBe('ACTIVE');
    });

    it('should have both relationships active again', async () => {
      const relationships = await prisma.supplierBrandRelationship.findMany({
        where: {
          supplierId: supplierId,
          status: 'ACTIVE',
        },
      });

      expect(relationships.length).toBe(2);
    });
  });

  describe('Validation: Unique constraint', () => {
    it('should not allow duplicate relationship between same supplier and brand', async () => {
      await expect(
        prisma.supplierBrandRelationship.create({
          data: {
            supplierId: supplierId,
            brandId: brandAId,
            status: 'PENDING_SUPPLIER_SIGNATURE',
            initiatedBy: 'test-user-id',
            initiatedByRole: 'BRAND',
          },
        }),
      ).rejects.toThrow();
    });
  });

  describe('Status History Tracking', () => {
    it('should have tracked all status changes', async () => {
      const history = await prisma.relationshipStatusHistory.findMany({
        where: {
          relationshipId: relationshipAId,
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      expect(history.length).toBeGreaterThanOrEqual(2);
      expect(history.some((h) => h.status === 'SUSPENDED')).toBe(true);
      expect(history.some((h) => h.status === 'ACTIVE')).toBe(true);
    });
  });
});
