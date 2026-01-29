import { Test, TestingModule } from '@nestjs/testing';
import { RelationshipsService } from './relationships.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ForbiddenException,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { UserRole, CompanyType, RelationshipStatus } from '@prisma/client';

describe('RelationshipsService', () => {
  let service: RelationshipsService;
  let prisma: PrismaService;

  const mockPrisma = {
    company: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    supplierBrandRelationship: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    relationshipStatusHistory: {
      create: jest.fn(),
    },
  };

  const mockAdminUser = {
    id: 'admin-id',
    email: 'admin@test.com',
    name: 'Admin',
    role: UserRole.ADMIN,
  };

  const mockBrandUser = {
    id: 'brand-user-id',
    email: 'brand@test.com',
    name: 'Brand User',
    role: UserRole.BRAND,
    brandId: 'brand-id',
  };

  const mockSupplierUser = {
    id: 'supplier-user-id',
    email: 'supplier@test.com',
    name: 'Supplier User',
    role: UserRole.SUPPLIER,
    supplierId: 'supplier-id',
  };

  const mockSupplier = {
    id: 'supplier-id',
    type: CompanyType.SUPPLIER,
    tradeName: 'Facção Teste',
    legalName: 'Facção Teste Ltda',
    supplierProfile: {
      id: 'profile-id',
      productTypes: ['CAMISETA'],
    },
    onboarding: {
      id: 'onboarding-id',
      isCompleted: true,
    },
  };

  const mockBrand = {
    id: 'brand-id',
    type: CompanyType.BRAND,
    tradeName: 'Marca Teste',
    legalName: 'Marca Teste Ltda',
  };

  const mockRelationship = {
    id: 'relationship-id',
    supplierId: 'supplier-id',
    brandId: 'brand-id',
    status: RelationshipStatus.ACTIVE,
    initiatedBy: 'brand-user-id',
    initiatedByRole: UserRole.BRAND,
    createdAt: new Date(),
    updatedAt: new Date(),
    supplier: mockSupplier,
    brand: mockBrand,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RelationshipsService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<RelationshipsService>(RelationshipsService);
    prisma = module.get<PrismaService>(PrismaService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto = {
      supplierId: 'supplier-id',
      brandId: 'brand-id',
      internalCode: 'FAC-001',
    };

    it('should create a relationship successfully', async () => {
      mockPrisma.company.findUnique
        .mockResolvedValueOnce(mockSupplier)
        .mockResolvedValueOnce(mockBrand);
      mockPrisma.supplierBrandRelationship.findUnique.mockResolvedValue(null);
      mockPrisma.supplierBrandRelationship.create.mockResolvedValue(
        mockRelationship,
      );
      mockPrisma.relationshipStatusHistory.create.mockResolvedValue({});

      const result = await service.create(createDto, mockBrandUser);

      expect(result).toBeDefined();
      expect(mockPrisma.supplierBrandRelationship.create).toHaveBeenCalled();
      expect(mockPrisma.relationshipStatusHistory.create).toHaveBeenCalled();
    });

    it('should throw ForbiddenException when brand tries to credential for another brand', async () => {
      const otherBrandUser = { ...mockBrandUser, brandId: 'other-brand-id' };

      await expect(service.create(createDto, otherBrandUser)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException when supplier not found', async () => {
      mockPrisma.company.findUnique.mockResolvedValueOnce(null);

      await expect(service.create(createDto, mockBrandUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when supplier onboarding not completed', async () => {
      const incompleteSupplier = {
        ...mockSupplier,
        onboarding: { ...mockSupplier.onboarding, isCompleted: false },
      };
      mockPrisma.company.findUnique.mockResolvedValueOnce(incompleteSupplier);

      await expect(service.create(createDto, mockBrandUser)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw ConflictException when relationship already exists', async () => {
      mockPrisma.company.findUnique
        .mockResolvedValueOnce(mockSupplier)
        .mockResolvedValueOnce(mockBrand);
      mockPrisma.supplierBrandRelationship.findUnique.mockResolvedValue(
        mockRelationship,
      );

      await expect(service.create(createDto, mockBrandUser)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should allow admin to create relationship for any brand', async () => {
      mockPrisma.company.findUnique
        .mockResolvedValueOnce(mockSupplier)
        .mockResolvedValueOnce(mockBrand);
      mockPrisma.supplierBrandRelationship.findUnique.mockResolvedValue(null);
      mockPrisma.supplierBrandRelationship.create.mockResolvedValue(
        mockRelationship,
      );
      mockPrisma.relationshipStatusHistory.create.mockResolvedValue({});

      const result = await service.create(createDto, mockAdminUser);

      expect(result).toBeDefined();
    });
  });

  describe('findByBrand', () => {
    it('should return relationships for brand', async () => {
      mockPrisma.supplierBrandRelationship.findMany.mockResolvedValue([
        mockRelationship,
      ]);

      const result = await service.findByBrand('brand-id', mockBrandUser);

      expect(result).toHaveLength(1);
      expect(mockPrisma.supplierBrandRelationship.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { brandId: 'brand-id' },
        }),
      );
    });

    it('should throw ForbiddenException when brand tries to see other brand suppliers', async () => {
      const otherBrandUser = { ...mockBrandUser, brandId: 'other-brand-id' };

      await expect(
        service.findByBrand('brand-id', otherBrandUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow admin to see any brand suppliers', async () => {
      mockPrisma.supplierBrandRelationship.findMany.mockResolvedValue([]);

      await service.findByBrand('brand-id', mockAdminUser);

      expect(
        mockPrisma.supplierBrandRelationship.findMany,
      ).toHaveBeenCalled();
    });
  });

  describe('findBySupplier', () => {
    it('should return relationships for supplier', async () => {
      mockPrisma.supplierBrandRelationship.findMany.mockResolvedValue([
        mockRelationship,
      ]);

      const result = await service.findBySupplier(
        'supplier-id',
        mockSupplierUser,
      );

      expect(result).toHaveLength(1);
    });

    it('should throw ForbiddenException when supplier tries to see other supplier brands', async () => {
      const otherSupplierUser = {
        ...mockSupplierUser,
        supplierId: 'other-supplier-id',
      };

      await expect(
        service.findBySupplier('supplier-id', otherSupplierUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findAvailableForBrand', () => {
    it('should return suppliers not yet credentialed for brand', async () => {
      mockPrisma.supplierBrandRelationship.findMany.mockResolvedValue([]);
      mockPrisma.company.findMany.mockResolvedValue([mockSupplier]);

      const result = await service.findAvailableForBrand(
        'brand-id',
        mockBrandUser,
      );

      expect(result).toHaveLength(1);
      expect(mockPrisma.company.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: CompanyType.SUPPLIER,
            onboarding: { isCompleted: true },
          }),
        }),
      );
    });
  });

  describe('suspend', () => {
    const suspendDto = { reason: 'Teste de suspensão' };

    it('should suspend an active relationship', async () => {
      mockPrisma.supplierBrandRelationship.findUnique.mockResolvedValue(
        mockRelationship,
      );
      mockPrisma.supplierBrandRelationship.update.mockResolvedValue({
        ...mockRelationship,
        status: RelationshipStatus.SUSPENDED,
      });
      mockPrisma.relationshipStatusHistory.create.mockResolvedValue({});

      const result = await service.suspend(
        'relationship-id',
        suspendDto,
        mockBrandUser,
      );

      expect(result.status).toBe(RelationshipStatus.SUSPENDED);
    });

    it('should throw NotFoundException when relationship not found', async () => {
      mockPrisma.supplierBrandRelationship.findUnique.mockResolvedValue(null);

      await expect(
        service.suspend('non-existent-id', suspendDto, mockBrandUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when brand tries to suspend other brand relationship', async () => {
      const otherBrandUser = { ...mockBrandUser, brandId: 'other-brand-id' };
      mockPrisma.supplierBrandRelationship.findUnique.mockResolvedValue(
        mockRelationship,
      );

      await expect(
        service.suspend('relationship-id', suspendDto, otherBrandUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('reactivate', () => {
    it('should reactivate a suspended relationship', async () => {
      const suspendedRelationship = {
        ...mockRelationship,
        status: RelationshipStatus.SUSPENDED,
      };
      mockPrisma.supplierBrandRelationship.findUnique.mockResolvedValue(
        suspendedRelationship,
      );
      mockPrisma.supplierBrandRelationship.update.mockResolvedValue({
        ...mockRelationship,
        status: RelationshipStatus.ACTIVE,
      });
      mockPrisma.relationshipStatusHistory.create.mockResolvedValue({});

      const result = await service.reactivate('relationship-id', mockBrandUser);

      expect(result.status).toBe(RelationshipStatus.ACTIVE);
    });
  });

  describe('terminate', () => {
    const terminateDto = { reason: 'Encerramento de contrato' };

    it('should terminate a relationship', async () => {
      mockPrisma.supplierBrandRelationship.findUnique.mockResolvedValue(
        mockRelationship,
      );
      mockPrisma.supplierBrandRelationship.update.mockResolvedValue({
        ...mockRelationship,
        status: RelationshipStatus.TERMINATED,
      });
      mockPrisma.relationshipStatusHistory.create.mockResolvedValue({});

      const result = await service.terminate(
        'relationship-id',
        terminateDto,
        mockBrandUser,
      );

      expect(result.status).toBe(RelationshipStatus.TERMINATED);
    });
  });

  describe('activate', () => {
    it('should activate a relationship with signed contract', async () => {
      const pendingRelationship = {
        ...mockRelationship,
        status: RelationshipStatus.CONTRACT_PENDING,
        contract: {
          supplierSignedAt: new Date(),
        },
      };
      mockPrisma.supplierBrandRelationship.findUnique.mockResolvedValue(
        pendingRelationship,
      );
      mockPrisma.supplierBrandRelationship.update.mockResolvedValue({
        ...mockRelationship,
        status: RelationshipStatus.ACTIVE,
      });
      mockPrisma.relationshipStatusHistory.create.mockResolvedValue({});

      const result = await service.activate('relationship-id', mockBrandUser);

      expect(result.status).toBe(RelationshipStatus.ACTIVE);
    });

    it('should throw BadRequestException when contract not signed', async () => {
      const pendingRelationship = {
        ...mockRelationship,
        status: RelationshipStatus.CONTRACT_PENDING,
        contract: {
          supplierSignedAt: null,
        },
      };
      mockPrisma.supplierBrandRelationship.findUnique.mockResolvedValue(
        pendingRelationship,
      );

      await expect(
        service.activate('relationship-id', mockBrandUser),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
