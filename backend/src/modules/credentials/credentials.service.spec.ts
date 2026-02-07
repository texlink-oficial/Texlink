import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { CredentialsService } from './credentials.service';
import { PrismaService } from '../../prisma/prisma.service';
import { SupplierCredentialStatus } from '@prisma/client';

describe('CredentialsService', () => {
  let service: CredentialsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    supplierCredential: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    credentialStatusHistory: {
      create: jest.fn(),
    },
    credentialValidation: {
      updateMany: jest.fn(),
    },
    credentialSettings: {
      findUnique: jest.fn(),
    },
    supplierContract: {
      findUnique: jest.fn(),
    },
    supplierOnboarding: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    onboardingDocument: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockUser = {
    id: 'user-123',
    companyId: 'brand-123',
    brandId: 'brand-123',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CredentialsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<CredentialsService>(CredentialsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const validDto = {
      cnpj: '12.345.678/0001-90',
      contactName: 'João Silva',
      contactEmail: 'joao@example.com',
      contactPhone: '(11) 98765-4321',
    };

    it('should create a new credential successfully', async () => {
      // Mock no existing credential
      mockPrismaService.supplierCredential.findFirst.mockResolvedValue(null);

      // Mock successful creation
      const mockCreated = {
        id: 'cred-123',
        cnpj: '12345678000190',
        ...validDto,
        status: SupplierCredentialStatus.DRAFT,
        brand: { id: 'brand-123', tradeName: 'Marca Teste' },
        createdBy: { id: 'user-123', name: 'User Test' },
      };
      mockPrismaService.supplierCredential.create.mockResolvedValue(
        mockCreated,
      );
      mockPrismaService.credentialStatusHistory.create.mockResolvedValue({});

      const result = await service.create(validDto, mockUser);

      expect(result).toEqual(mockCreated);
      expect(
        mockPrismaService.supplierCredential.findFirst,
      ).toHaveBeenCalledWith({
        where: {
          brandId: 'brand-123',
          cnpj: '12345678000190',
          status: { notIn: [SupplierCredentialStatus.BLOCKED] },
        },
      });
      expect(mockPrismaService.supplierCredential.create).toHaveBeenCalled();
      expect(
        mockPrismaService.credentialStatusHistory.create,
      ).toHaveBeenCalled();
    });

    it('should throw ConflictException if CNPJ already exists for brand', async () => {
      // Mock existing credential
      mockPrismaService.supplierCredential.findFirst.mockResolvedValue({
        id: 'existing-123',
        cnpj: '12345678000190',
      });

      await expect(service.create(validDto, mockUser)).rejects.toThrow(
        ConflictException,
      );
      expect(
        mockPrismaService.supplierCredential.create,
      ).not.toHaveBeenCalled();
    });

    it('should clean CNPJ formatting', async () => {
      mockPrismaService.supplierCredential.findFirst.mockResolvedValue(null);
      mockPrismaService.supplierCredential.create.mockResolvedValue({
        id: 'cred-123',
        cnpj: '12345678000190',
      });
      mockPrismaService.credentialStatusHistory.create.mockResolvedValue({});

      await service.create(
        { ...validDto, cnpj: '12.345.678/0001-90' },
        mockUser,
      );

      const createCall =
        mockPrismaService.supplierCredential.create.mock.calls[0][0];
      expect(createCall.data.cnpj).toBe('12345678000190');
    });
  });

  describe('update', () => {
    const existingCredential = {
      id: 'cred-123',
      cnpj: '12345678000190',
      status: SupplierCredentialStatus.DRAFT,
      brandId: 'brand-123',
      contactName: 'Old Name',
      contactEmail: 'old@example.com',
    };

    beforeEach(() => {
      mockPrismaService.supplierCredential.findUnique.mockResolvedValue(
        existingCredential,
      );
    });

    it('should update credential in DRAFT status', async () => {
      const updateDto = {
        contactName: 'New Name',
        contactEmail: 'new@example.com',
      };

      mockPrismaService.supplierCredential.update.mockResolvedValue({
        ...existingCredential,
        ...updateDto,
      });

      const result = await service.update('cred-123', updateDto, mockUser);

      expect(result.contactName).toBe('New Name');
      expect(mockPrismaService.supplierCredential.update).toHaveBeenCalled();
    });

    it('should throw BadRequestException if status does not allow editing', async () => {
      mockPrismaService.supplierCredential.findUnique.mockResolvedValue({
        ...existingCredential,
        status: SupplierCredentialStatus.ACTIVE,
      });

      await expect(
        service.update('cred-123', { contactName: 'New' }, mockUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reset validations if CNPJ changes', async () => {
      const updateDto = {
        cnpj: '98765432000100',
      };

      mockPrismaService.supplierCredential.findFirst.mockResolvedValue(null);
      mockPrismaService.supplierCredential.update.mockResolvedValue({
        ...existingCredential,
        cnpj: '98765432000100',
      });
      mockPrismaService.credentialValidation.updateMany.mockResolvedValue({});
      mockPrismaService.credentialStatusHistory.create.mockResolvedValue({});

      await service.update('cred-123', updateDto, mockUser);

      expect(
        mockPrismaService.credentialValidation.updateMany,
      ).toHaveBeenCalledWith({
        where: { credentialId: 'cred-123' },
        data: { isValid: false },
      });
    });

    it('should detect duplicate CNPJ when updating', async () => {
      const updateDto = {
        cnpj: '98765432000100',
      };

      // Mock another credential with same CNPJ
      mockPrismaService.supplierCredential.findFirst.mockResolvedValue({
        id: 'other-cred',
        cnpj: '98765432000100',
      });

      await expect(
        service.update('cred-123', updateDto, mockUser),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('should soft delete credential in DRAFT status', async () => {
      const credential = {
        id: 'cred-123',
        status: SupplierCredentialStatus.DRAFT,
        brandId: 'brand-123',
      };

      mockPrismaService.supplierCredential.findUnique.mockResolvedValue(
        credential,
      );
      mockPrismaService.credentialStatusHistory.create.mockResolvedValue({});
      mockPrismaService.supplierCredential.update.mockResolvedValue({
        ...credential,
        status: SupplierCredentialStatus.BLOCKED,
      });

      const result = await service.remove('cred-123', mockUser);

      expect(result.success).toBe(true);
      expect(mockPrismaService.supplierCredential.update).toHaveBeenCalledWith({
        where: { id: 'cred-123' },
        data: { status: SupplierCredentialStatus.BLOCKED },
      });
    });

    it('should throw BadRequestException if status does not allow removal', async () => {
      mockPrismaService.supplierCredential.findUnique.mockResolvedValue({
        id: 'cred-123',
        status: SupplierCredentialStatus.ACTIVE,
        brandId: 'brand-123',
      });

      await expect(service.remove('cred-123', mockUser)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', async () => {
      mockPrismaService.supplierCredential.groupBy.mockResolvedValue([
        { status: SupplierCredentialStatus.DRAFT, _count: { id: 5 } },
        { status: SupplierCredentialStatus.ACTIVE, _count: { id: 10 } },
      ]);

      mockPrismaService.supplierCredential.count
        .mockResolvedValueOnce(3) // thisMonth
        .mockResolvedValueOnce(2) // completedThisMonth
        .mockResolvedValueOnce(5) // pendingAction
        .mockResolvedValueOnce(7); // awaitingResponse

      const stats = await service.getStats('brand-123');

      expect(stats.total).toBe(15);
      expect(stats.activeCount).toBe(10);
      expect(stats.byStatus[SupplierCredentialStatus.DRAFT]).toBe(5);
      expect(stats.byStatus[SupplierCredentialStatus.ACTIVE]).toBe(10);
      expect(stats.conversionRate).toBeCloseTo(66.67, 1);
    });
  });

  describe('changeStatus', () => {
    it('should change status and create history record', async () => {
      mockPrismaService.supplierCredential.findUnique.mockResolvedValue({
        id: 'cred-123',
        status: SupplierCredentialStatus.DRAFT,
      });

      mockPrismaService.credentialStatusHistory.create.mockResolvedValue({});
      mockPrismaService.supplierCredential.update.mockResolvedValue({
        id: 'cred-123',
        status: SupplierCredentialStatus.PENDING_VALIDATION,
      });

      await service.changeStatus(
        'cred-123',
        SupplierCredentialStatus.PENDING_VALIDATION,
        'user-123',
        'Test reason',
      );

      expect(
        mockPrismaService.credentialStatusHistory.create,
      ).toHaveBeenCalledWith({
        data: {
          credentialId: 'cred-123',
          fromStatus: SupplierCredentialStatus.DRAFT,
          toStatus: SupplierCredentialStatus.PENDING_VALIDATION,
          performedById: 'user-123',
          reason: 'Test reason',
        },
      });

      expect(mockPrismaService.supplierCredential.update).toHaveBeenCalledWith({
        where: { id: 'cred-123' },
        data: expect.objectContaining({
          status: SupplierCredentialStatus.PENDING_VALIDATION,
        }),
      });
    });

    it('should set completedAt when status becomes ACTIVE', async () => {
      mockPrismaService.supplierCredential.findUnique.mockResolvedValue({
        id: 'cred-123',
        status: SupplierCredentialStatus.CONTRACT_SIGNED,
      });

      mockPrismaService.credentialStatusHistory.create.mockResolvedValue({});
      mockPrismaService.supplierCredential.update.mockResolvedValue({});

      await service.changeStatus(
        'cred-123',
        SupplierCredentialStatus.ACTIVE,
        'user-123',
      );

      const updateCall =
        mockPrismaService.supplierCredential.update.mock.calls[0][0];
      expect(updateCall.data.completedAt).toBeDefined();
    });

    it('should throw NotFoundException if credential not found', async () => {
      mockPrismaService.supplierCredential.findUnique.mockResolvedValue(null);

      await expect(
        service.changeStatus(
          'non-existent',
          SupplierCredentialStatus.ACTIVE,
          'user-123',
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('validateDocument', () => {
    const mockCredential = {
      id: 'cred-123',
      brandId: 'brand-123',
      supplierId: 'supplier-123',
    };

    const mockDocument = {
      id: 'doc-123',
      onboardingId: 'onboarding-123',
      isValid: null,
      onboarding: {
        supplierId: 'supplier-123',
      },
    };

    beforeEach(() => {
      mockPrismaService.supplierCredential.findUnique.mockResolvedValue(
        mockCredential,
      );
      mockPrismaService.onboardingDocument.findUnique.mockResolvedValue(
        mockDocument,
      );
    });

    it('should approve document successfully', async () => {
      const updatedDoc = {
        ...mockDocument,
        isValid: true,
        validatedById: 'user-123',
        validatedAt: new Date(),
      };

      mockPrismaService.onboardingDocument.update.mockResolvedValue(updatedDoc);
      mockPrismaService.onboardingDocument.findMany.mockResolvedValue([
        updatedDoc,
      ]);
      mockPrismaService.supplierOnboarding.update.mockResolvedValue({});

      const result = await service.validateDocument(
        'cred-123',
        'doc-123',
        true,
        'Document approved',
        mockUser,
      );

      expect(result.isValid).toBe(true);
      expect(mockPrismaService.onboardingDocument.update).toHaveBeenCalledWith({
        where: { id: 'doc-123' },
        data: {
          isValid: true,
          validationNotes: 'Document approved',
          validatedById: 'user-123',
          validatedAt: expect.any(Date),
        },
      });
    });

    it('should reject document successfully', async () => {
      const rejectedDoc = {
        ...mockDocument,
        isValid: false,
        validationNotes: 'Invalid signature',
      };

      mockPrismaService.onboardingDocument.update.mockResolvedValue(
        rejectedDoc,
      );
      mockPrismaService.onboardingDocument.findMany.mockResolvedValue([
        rejectedDoc,
      ]);

      const result = await service.validateDocument(
        'cred-123',
        'doc-123',
        false,
        'Invalid signature',
        mockUser,
      );

      expect(result.isValid).toBe(false);
      expect(result.validationNotes).toBe('Invalid signature');
    });

    it('should throw NotFoundException if credential not found', async () => {
      mockPrismaService.supplierCredential.findUnique.mockResolvedValue(null);

      await expect(
        service.validateDocument(
          'non-existent',
          'doc-123',
          true,
          undefined,
          mockUser,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if document not found', async () => {
      mockPrismaService.onboardingDocument.findUnique.mockResolvedValue(null);

      await expect(
        service.validateDocument(
          'cred-123',
          'non-existent',
          true,
          undefined,
          mockUser,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if credential belongs to another brand', async () => {
      mockPrismaService.supplierCredential.findUnique.mockResolvedValue({
        ...mockCredential,
        brandId: 'other-brand',
      });

      await expect(
        service.validateDocument(
          'cred-123',
          'doc-123',
          true,
          undefined,
          mockUser,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if document belongs to different credential', async () => {
      mockPrismaService.onboardingDocument.findUnique.mockResolvedValue({
        ...mockDocument,
        onboarding: {
          supplierId: 'different-supplier',
        },
      });

      await expect(
        service.validateDocument(
          'cred-123',
          'doc-123',
          true,
          undefined,
          mockUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException if user is not from a brand', async () => {
      const supplierUser = { ...mockUser, brandId: undefined };

      await expect(
        service.validateDocument(
          'cred-123',
          'doc-123',
          true,
          undefined,
          supplierUser,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should update onboarding lastActivityAt when all docs approved', async () => {
      const approvedDoc = {
        ...mockDocument,
        isValid: true,
      };

      mockPrismaService.onboardingDocument.update.mockResolvedValue(
        approvedDoc,
      );
      mockPrismaService.onboardingDocument.findMany.mockResolvedValue([
        approvedDoc,
      ]);
      mockPrismaService.supplierOnboarding.update.mockResolvedValue({});

      await service.validateDocument(
        'cred-123',
        'doc-123',
        true,
        undefined,
        mockUser,
      );

      expect(mockPrismaService.supplierOnboarding.update).toHaveBeenCalledWith({
        where: { id: 'onboarding-123' },
        data: {
          lastActivityAt: expect.any(Date),
        },
      });
    });

    it('should not update onboarding if some docs are rejected', async () => {
      const rejectedDoc = {
        ...mockDocument,
        isValid: false,
      };

      mockPrismaService.onboardingDocument.update.mockResolvedValue(
        rejectedDoc,
      );
      mockPrismaService.onboardingDocument.findMany.mockResolvedValue([
        rejectedDoc,
        { ...mockDocument, id: 'doc-2', isValid: true },
      ]);

      await service.validateDocument(
        'cred-123',
        'doc-123',
        false,
        undefined,
        mockUser,
      );

      expect(
        mockPrismaService.supplierOnboarding.update,
      ).not.toHaveBeenCalled();
    });
  });

  describe('activateSupplier', () => {
    const mockCredential = {
      id: 'cred-123',
      brandId: 'brand-123',
      supplierId: 'supplier-123',
      status: SupplierCredentialStatus.CONTRACT_SIGNED,
    };

    const mockContract = {
      id: 'contract-123',
      credentialId: 'cred-123',
      supplierSignedAt: new Date(),
    };

    const mockOnboarding = {
      id: 'onboarding-123',
      supplierId: 'supplier-123',
      documents: [
        { id: 'doc-1', isValid: true },
        { id: 'doc-2', isValid: true },
      ],
    };

    beforeEach(() => {
      mockPrismaService.supplierCredential.findUnique.mockResolvedValue(
        mockCredential,
      );
      mockPrismaService.supplierContract.findUnique.mockResolvedValue(
        mockContract,
      );
      mockPrismaService.supplierOnboarding.findUnique.mockResolvedValue(
        mockOnboarding,
      );
    });

    it('should activate supplier successfully', async () => {
      mockPrismaService.supplierCredential.update.mockResolvedValue({
        ...mockCredential,
        status: SupplierCredentialStatus.ACTIVE,
      });
      mockPrismaService.credentialStatusHistory.create.mockResolvedValue({});

      const result = await service.activateSupplier('cred-123', mockUser);

      expect(result.status).toBe(SupplierCredentialStatus.ACTIVE);
      expect(mockPrismaService.supplierCredential.update).toHaveBeenCalledWith({
        where: { id: 'cred-123' },
        data: {
          status: SupplierCredentialStatus.ACTIVE,
        },
      });
      expect(
        mockPrismaService.credentialStatusHistory.create,
      ).toHaveBeenCalledWith({
        data: {
          credentialId: 'cred-123',
          fromStatus: SupplierCredentialStatus.CONTRACT_SIGNED,
          toStatus: SupplierCredentialStatus.ACTIVE,
          performedById: 'user-123',
          reason: 'Fornecedor ativado manualmente pela marca',
        },
      });
    });

    it('should throw NotFoundException if credential not found', async () => {
      mockPrismaService.supplierCredential.findUnique.mockResolvedValue(null);

      await expect(
        service.activateSupplier('non-existent', mockUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if credential belongs to another brand', async () => {
      mockPrismaService.supplierCredential.findUnique.mockResolvedValue({
        ...mockCredential,
        brandId: 'other-brand',
      });

      await expect(
        service.activateSupplier('cred-123', mockUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if user is not from a brand', async () => {
      const supplierUser = { ...mockUser, brandId: undefined };

      await expect(
        service.activateSupplier('cred-123', supplierUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if contract not found', async () => {
      mockPrismaService.supplierContract.findUnique.mockResolvedValue(null);

      await expect(
        service.activateSupplier('cred-123', mockUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if contract not signed', async () => {
      mockPrismaService.supplierContract.findUnique.mockResolvedValue({
        ...mockContract,
        supplierSignedAt: null,
      });

      await expect(
        service.activateSupplier('cred-123', mockUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if not all documents approved', async () => {
      mockPrismaService.supplierOnboarding.findUnique.mockResolvedValue({
        ...mockOnboarding,
        documents: [
          { id: 'doc-1', isValid: true },
          { id: 'doc-2', isValid: false },
        ],
      });

      await expect(
        service.activateSupplier('cred-123', mockUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('should succeed if no onboarding exists', async () => {
      mockPrismaService.supplierOnboarding.findUnique.mockResolvedValue(null);
      mockPrismaService.supplierCredential.update.mockResolvedValue({
        ...mockCredential,
        status: SupplierCredentialStatus.ACTIVE,
      });
      mockPrismaService.credentialStatusHistory.create.mockResolvedValue({});

      const result = await service.activateSupplier('cred-123', mockUser);

      expect(result.status).toBe(SupplierCredentialStatus.ACTIVE);
    });
  });

  describe('getDocuments', () => {
    const mockCredential = {
      id: 'cred-123',
      brandId: 'brand-123',
      supplierId: 'supplier-123',
    };

    const mockDocuments = [
      { id: 'doc-1', name: 'Document 1', isValid: null },
      { id: 'doc-2', name: 'Document 2', isValid: true },
    ];

    beforeEach(() => {
      mockPrismaService.supplierCredential.findUnique.mockResolvedValue(
        mockCredential,
      );
    });

    it('should return documents for valid credential', async () => {
      mockPrismaService.onboardingDocument.findMany.mockResolvedValue(
        mockDocuments,
      );

      const result = await service.getDocuments('cred-123', mockUser);

      expect(result).toEqual(mockDocuments);
      expect(mockPrismaService.onboardingDocument.findMany).toHaveBeenCalledWith(
        {
          where: {
            onboarding: {
              supplierId: 'supplier-123',
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      );
    });

    it('should return empty array if credential has no supplier', async () => {
      mockPrismaService.supplierCredential.findUnique.mockResolvedValue({
        ...mockCredential,
        supplierId: null,
      });

      const result = await service.getDocuments('cred-123', mockUser);

      expect(result).toEqual([]);
      expect(
        mockPrismaService.onboardingDocument.findMany,
      ).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if credential not found', async () => {
      mockPrismaService.supplierCredential.findUnique.mockResolvedValue(null);

      await expect(service.getDocuments('non-existent', mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if credential belongs to another brand', async () => {
      mockPrismaService.supplierCredential.findUnique.mockResolvedValue({
        ...mockCredential,
        brandId: 'other-brand',
      });

      await expect(service.getDocuments('cred-123', mockUser)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('getCredentialsWithPendingDocuments', () => {
    it('should return credentials with pending documents', async () => {
      const mockCredentials = [
        {
          id: 'cred-1',
          onboarding: {
            documents: [{ id: 'doc-1', isValid: null }],
          },
        },
        {
          id: 'cred-2',
          onboarding: {
            documents: [{ id: 'doc-2', isValid: null }],
          },
        },
      ];

      mockPrismaService.supplierCredential.findMany.mockResolvedValue(
        mockCredentials,
      );

      const result = await service.getCredentialsWithPendingDocuments(mockUser);

      expect(result).toHaveLength(2);
      expect(mockPrismaService.supplierCredential.findMany).toHaveBeenCalledWith(
        {
          where: {
            brandId: 'brand-123',
            status: {
              in: [
                SupplierCredentialStatus.ONBOARDING_STARTED,
                SupplierCredentialStatus.ONBOARDING_IN_PROGRESS,
              ],
            },
          },
          include: {
            onboarding: {
              include: {
                documents: {
                  where: {
                    isValid: null,
                  },
                  orderBy: { createdAt: 'asc' },
                },
              },
            },
          },
        },
      );
    });

    it('should filter out credentials with no pending documents', async () => {
      const mockCredentials = [
        {
          id: 'cred-1',
          onboarding: {
            documents: [{ id: 'doc-1', isValid: null }],
          },
        },
        {
          id: 'cred-2',
          onboarding: {
            documents: [], // No pending documents
          },
        },
        {
          id: 'cred-3',
          onboarding: null, // No onboarding
        },
      ];

      mockPrismaService.supplierCredential.findMany.mockResolvedValue(
        mockCredentials,
      );

      const result = await service.getCredentialsWithPendingDocuments(mockUser);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('cred-1');
    });

    it('should throw ForbiddenException if user has no brandId', async () => {
      const supplierUser = { ...mockUser, brandId: undefined };

      await expect(
        service.getCredentialsWithPendingDocuments(supplierUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findOne', () => {
    const mockCredential = {
      id: 'cred-123',
      brandId: 'brand-123',
      cnpj: '12345678000190',
      contactName: 'John Doe',
      brand: { id: 'brand-123', tradeName: 'Test Brand' },
      supplier: null,
      createdBy: { id: 'user-123', name: 'Admin' },
      validations: [],
      compliance: null,
      invitations: [],
      onboarding: null,
      contract: null,
      statusHistory: [],
    };

    it('should return credential with all relationships', async () => {
      mockPrismaService.supplierCredential.findUnique.mockResolvedValue(
        mockCredential,
      );

      const result = await service.findOne('cred-123', 'brand-123');

      expect(result).toEqual(mockCredential);
      expect(mockPrismaService.supplierCredential.findUnique).toHaveBeenCalledWith(
        {
          where: { id: 'cred-123' },
          include: expect.objectContaining({
            brand: expect.any(Object),
            supplier: expect.any(Object),
            createdBy: expect.any(Object),
            validations: expect.any(Object),
            compliance: expect.any(Object),
            invitations: expect.any(Object),
            onboarding: true,
            contract: true,
            statusHistory: expect.any(Object),
          }),
        },
      );
    });

    it('should throw NotFoundException if credential not found', async () => {
      mockPrismaService.supplierCredential.findUnique.mockResolvedValue(null);

      await expect(
        service.findOne('non-existent', 'brand-123'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if credential belongs to another brand', async () => {
      mockPrismaService.supplierCredential.findUnique.mockResolvedValue({
        ...mockCredential,
        brandId: 'other-brand',
      });

      await expect(service.findOne('cred-123', 'brand-123')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('findAll', () => {
    const mockCredentials = [
      {
        id: 'cred-1',
        cnpj: '12345678000190',
        contactName: 'John Doe',
        status: SupplierCredentialStatus.DRAFT,
        createdAt: new Date('2026-01-01'),
      },
      {
        id: 'cred-2',
        cnpj: '98765432000100',
        contactName: 'Jane Smith',
        status: SupplierCredentialStatus.ACTIVE,
        createdAt: new Date('2026-01-02'),
      },
    ];

    it('should return paginated credentials with default params', async () => {
      mockPrismaService.supplierCredential.count.mockResolvedValue(2);
      mockPrismaService.supplierCredential.findMany.mockResolvedValue(
        mockCredentials,
      );

      const result = await service.findAll('brand-123', {});

      expect(result.data).toEqual(mockCredentials);
      expect(result.meta).toEqual({
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      });
    });

    it('should filter by search term', async () => {
      mockPrismaService.supplierCredential.count.mockResolvedValue(1);
      mockPrismaService.supplierCredential.findMany.mockResolvedValue([
        mockCredentials[0],
      ]);

      await service.findAll('brand-123', { search: 'John' });

      expect(mockPrismaService.supplierCredential.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ contactName: expect.any(Object) }),
            ]),
          }),
        }),
      );
    });

    it('should filter by status', async () => {
      mockPrismaService.supplierCredential.count.mockResolvedValue(1);
      mockPrismaService.supplierCredential.findMany.mockResolvedValue([
        mockCredentials[1],
      ]);

      await service.findAll('brand-123', {
        status: SupplierCredentialStatus.ACTIVE,
      });

      expect(mockPrismaService.supplierCredential.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: SupplierCredentialStatus.ACTIVE,
          }),
        }),
      );
    });

    it('should handle pagination correctly', async () => {
      mockPrismaService.supplierCredential.count.mockResolvedValue(25);
      mockPrismaService.supplierCredential.findMany.mockResolvedValue(
        mockCredentials,
      );

      const result = await service.findAll('brand-123', {
        page: 2,
        limit: 10,
      });

      expect(result.meta.page).toBe(2);
      expect(result.meta.totalPages).toBe(3);
      expect(result.meta.hasNextPage).toBe(true);
      expect(result.meta.hasPreviousPage).toBe(true);
      expect(mockPrismaService.supplierCredential.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        }),
      );
    });

    it('should filter by date range', async () => {
      mockPrismaService.supplierCredential.count.mockResolvedValue(1);
      mockPrismaService.supplierCredential.findMany.mockResolvedValue([
        mockCredentials[0],
      ]);

      await service.findAll('brand-123', {
        createdFrom: '2026-01-01',
        createdTo: '2026-01-15',
      });

      const whereClause =
        mockPrismaService.supplierCredential.findMany.mock.calls[0][0].where;
      expect(whereClause.createdAt).toBeDefined();
      expect(whereClause.createdAt.gte).toEqual(new Date('2026-01-01'));
      expect(whereClause.createdAt.lte).toBeDefined();
    });
  });
});
