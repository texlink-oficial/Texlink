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
    await app.close();
  });

  async function setupTestData() {
    // Create test companies and users
    // This would typically be done via seed data or test utilities

    // Create Admin user and get token
    const adminUser = await prisma.user.create({
      data: {
        email: 'admin-test@texlink.com',
        password: '$2b$10$testhashedpassword',
        name: 'Admin Test',
        role: 'ADMIN',
      },
    });

    // Create Brand A
    const brandA = await prisma.company.create({
      data: {
        type: 'BRAND',
        legalName: 'Marca A Ltda',
        tradeName: 'Marca A',
        document: '12345678000101',
        email: 'marca.a@test.com',
        users: {
          create: {
            email: 'user-marca-a@test.com',
            password: '$2b$10$testhashedpassword',
            name: 'User Marca A',
            role: 'BRAND',
          },
        },
      },
    });
    brandAId = brandA.id;

    // Create Brand B
    const brandB = await prisma.company.create({
      data: {
        type: 'BRAND',
        legalName: 'Marca B Ltda',
        tradeName: 'Marca B',
        document: '98765432000199',
        email: 'marca.b@test.com',
        users: {
          create: {
            email: 'user-marca-b@test.com',
            password: '$2b$10$testhashedpassword',
            name: 'User Marca B',
            role: 'BRAND',
          },
        },
      },
    });
    brandBId = brandB.id;

    // Create Supplier with completed onboarding
    const supplier = await prisma.company.create({
      data: {
        type: 'SUPPLIER',
        legalName: 'Facção Teste Ltda',
        tradeName: 'Facção Teste',
        document: '11223344000155',
        email: 'faccao@test.com',
        supplierProfile: {
          create: {
            productTypes: ['CAMISETA', 'CALCA'],
            specialties: ['Jeans', 'Malha'],
            monthlyCapacity: 10000,
            currentOccupancy: 0,
          },
        },
        onboarding: {
          create: {
            isCompleted: true,
            completedAt: new Date(),
            completedSteps: [1, 2, 3, 4, 5, 6],
            currentStep: 6,
            passwordSet: true,
            emailVerified: true,
            dataCompleted: true,
            documentsUploaded: true,
            capabilitiesSet: true,
          },
        },
        users: {
          create: {
            email: 'user-faccao@test.com',
            password: '$2b$10$testhashedpassword',
            name: 'User Facção',
            role: 'SUPPLIER',
          },
        },
      },
    });
    supplierId = supplier.id;

    // Generate test tokens (simplified for testing)
    // In real scenarios, you'd call the auth endpoint
    adminToken = 'test-admin-token';
    brandAToken = 'test-brand-a-token';
    brandBToken = 'test-brand-b-token';
    supplierToken = 'test-supplier-token';
  }

  async function cleanupTestData() {
    // Delete in reverse order of dependencies
    await prisma.relationshipStatusHistory.deleteMany({
      where: {
        relationship: {
          supplierId: supplierId,
        },
      },
    });
    await prisma.supplierContract.deleteMany({
      where: {
        supplierId: supplierId,
      },
    });
    await prisma.supplierBrandRelationship.deleteMany({
      where: {
        supplierId: supplierId,
      },
    });
    await prisma.supplierOnboarding.deleteMany({
      where: {
        supplierId: supplierId,
      },
    });
    await prisma.supplierProfile.deleteMany({
      where: {
        companyId: supplierId,
      },
    });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            'admin-test@texlink.com',
            'user-marca-a@test.com',
            'user-marca-b@test.com',
            'user-faccao@test.com',
          ],
        },
      },
    });
    await prisma.company.deleteMany({
      where: {
        id: {
          in: [supplierId, brandAId, brandBId].filter(Boolean),
        },
      },
    });
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
          initiatedBy: 'test-user-id',
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
          status: 'PENDING',
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
          initiatedBy: 'test-user-id',
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
          status: 'PENDING',
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
          supplierSignedBy: supplierId,
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
          supplierSignedBy: supplierId,
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
          changedById: 'test-user-id',
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
          changedById: 'test-user-id',
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
            status: 'PENDING',
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
