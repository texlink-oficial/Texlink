import { Test, TestingModule } from '@nestjs/testing';
import { ContractsService } from './contracts.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  ContractStatus,
  ContractType,
  ContractRevisionStatus,
  Prisma,
} from '@prisma/client';
import * as crypto from 'crypto';
import { STORAGE_PROVIDER } from '../upload/storage.provider';

// Mock crypto and pdfkit modules
jest.mock('crypto');
jest.mock('pdfkit', () => {
  return jest.fn().mockImplementation(() => {
    const handlers: Record<string, (data?: Buffer) => void> = {};
    return {
      fontSize: jest.fn().mockReturnThis(),
      font: jest.fn().mockReturnThis(),
      text: jest.fn().mockReturnThis(),
      moveDown: jest.fn().mockReturnThis(),
      on: jest.fn((event: string, cb: (data?: Buffer) => void) => {
        handlers[event] = cb;
      }),
      end: jest.fn(() => {
        // Simulate PDF generation: emit data then end
        if (handlers['data']) {
          handlers['data'](Buffer.from('fake-pdf-content'));
        }
        if (handlers['end']) {
          handlers['end']();
        }
      }),
    };
  });
});

describe('ContractsService', () => {
  let service: ContractsService;
  let prisma: PrismaService;
  let eventEmitter: EventEmitter2;

  const mockPrisma = {
    supplierContract: {
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    contractRevision: {
      create: jest.fn(),
      update: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    supplierBrandRelationship: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    relationshipStatusHistory: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  const mockStorage = {
    upload: jest.fn().mockResolvedValue({
      url: 'http://localhost:3000/uploads/contracts/test-uuid.pdf',
      key: 'contracts/test-uuid.pdf',
    }),
    delete: jest.fn().mockResolvedValue(undefined),
    getUrl: jest.fn().mockReturnValue('http://localhost:3000/uploads/contracts/test-uuid.pdf'),
    getPresignedUrl: jest.fn().mockResolvedValue('http://localhost:3000/uploads/contracts/test-uuid.pdf'),
    resolveUrl: jest.fn().mockResolvedValue('http://localhost:3000/uploads/contracts/test-uuid.pdf'),
  };

  const mockRelationship = {
    id: 'relationship-1',
    supplierId: 'supplier-1',
    brandId: 'brand-1',
    brand: {
      tradeName: 'Test Brand',
      legalName: 'Test Brand Legal',
      document: '12345678901234',
      city: 'São Paulo',
      state: 'SP',
      street: 'Rua Teste',
      number: '123',
      neighborhood: 'Centro',
      zipCode: '01234-567',
    },
    supplier: {
      tradeName: 'Test Supplier',
      legalName: 'Test Supplier Legal',
      document: '98765432109876',
      city: 'Rio de Janeiro',
      state: 'RJ',
      street: 'Av Teste',
      number: '456',
      neighborhood: 'Zona Sul',
      zipCode: '98765-432',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContractsService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
        {
          provide: STORAGE_PROVIDER,
          useValue: mockStorage,
        },
      ],
    }).compile();

    service = module.get<ContractsService>(ContractsService);
    prisma = module.get<PrismaService>(PrismaService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);

    // Mock crypto
    const mockHash = {
      update: jest.fn().mockReturnThis(),
      digest: jest.fn().mockReturnValue('test-hash-value'),
    };
    (crypto.createHash as jest.Mock).mockReturnValue(mockHash);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createContract', () => {
    const createContractDto = {
      relationshipId: 'relationship-1',
      type: ContractType.SERVICE_AGREEMENT,
      title: 'Test Contract',
      description: 'Test description',
      value: 10000,
      validFrom: '2026-01-01',
      validUntil: '2026-12-31',
      terms: {
        paymentTerms: '30 dias',
        penaltyRate: '2%',
      },
    };

    const mockCreatedContract = {
      id: 'contract-1',
      displayId: 'CTR-20260207-0001',
      relationshipId: 'relationship-1',
      supplierId: 'supplier-1',
      brandId: 'brand-1',
      type: ContractType.SERVICE_AGREEMENT,
      title: 'Test Contract',
      description: 'Test description',
      value: new Prisma.Decimal(10000),
      validFrom: new Date('2026-01-01'),
      validUntil: new Date('2026-12-31'),
      documentUrl: '/uploads/contracts/CTR-20260207-0001.pdf',
      documentHash: 'test-hash-value',
      status: ContractStatus.DRAFT,
      brand: { tradeName: 'Test Brand', legalName: 'Test Brand Legal' },
      supplier: { tradeName: 'Test Supplier', legalName: 'Test Supplier Legal' },
    };

    it('should create contract from template successfully', async () => {
      mockPrisma.supplierBrandRelationship.findUnique.mockResolvedValue(
        mockRelationship,
      );
      mockPrisma.supplierContract.findFirst.mockResolvedValue(null);
      mockPrisma.supplierContract.create.mockResolvedValue(
        mockCreatedContract,
      );

      const result = await service.createContract(createContractDto, 'user-1');

      expect(result).toEqual(mockCreatedContract);
      expect(mockPrisma.supplierBrandRelationship.findUnique).toHaveBeenCalledWith({
        where: { id: 'relationship-1' },
        include: {
          supplier: true,
          brand: true,
        },
      });
      expect(mockPrisma.supplierContract.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          relationshipId: 'relationship-1',
          supplierId: 'supplier-1',
          brandId: 'brand-1',
          type: ContractType.SERVICE_AGREEMENT,
          title: 'Test Contract',
          status: ContractStatus.DRAFT,
          createdById: 'user-1',
        }),
        include: expect.any(Object),
      });
    });

    it('should generate correct displayId format (CTR-YYYYMMDD-XXXX)', async () => {
      mockPrisma.supplierBrandRelationship.findUnique.mockResolvedValue(
        mockRelationship,
      );
      mockPrisma.supplierContract.findFirst.mockResolvedValue(null);
      mockPrisma.supplierContract.create.mockResolvedValue(
        mockCreatedContract,
      );

      await service.createContract(createContractDto, 'user-1');

      const createCall = mockPrisma.supplierContract.create.mock.calls[0][0];
      const displayId = createCall.data.displayId;

      expect(displayId).toMatch(/^CTR-\d{8}-\d{4}$/);
      expect(displayId.startsWith('CTR-2026')).toBe(true);
    });

    it('should associate contract with correct brand and supplier', async () => {
      mockPrisma.supplierBrandRelationship.findUnique.mockResolvedValue(
        mockRelationship,
      );
      mockPrisma.supplierContract.findFirst.mockResolvedValue(null);
      mockPrisma.supplierContract.create.mockResolvedValue(
        mockCreatedContract,
      );

      const result = await service.createContract(createContractDto, 'user-1');

      expect(result.brandId).toBe('brand-1');
      expect(result.supplierId).toBe('supplier-1');
      expect(result.relationshipId).toBe('relationship-1');
    });

    it('should throw NotFoundException if relationship not found', async () => {
      mockPrisma.supplierBrandRelationship.findUnique.mockResolvedValue(null);

      await expect(
        service.createContract(createContractDto, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should calculate document hash correctly', async () => {
      mockPrisma.supplierBrandRelationship.findUnique.mockResolvedValue(
        mockRelationship,
      );
      mockPrisma.supplierContract.findFirst.mockResolvedValue(null);
      mockPrisma.supplierContract.create.mockResolvedValue(
        mockCreatedContract,
      );

      await service.createContract(createContractDto, 'user-1');

      const createCall = mockPrisma.supplierContract.create.mock.calls[0][0];
      expect(createCall.data.documentHash).toBe('test-hash-value');
      expect(crypto.createHash).toHaveBeenCalledWith('sha256');
    });
  });

  describe('uploadContract', () => {
    const uploadContractDto = {
      relationshipId: 'relationship-1',
      type: ContractType.NDA,
      title: 'NDA Contract',
      validFrom: '2026-01-01',
      validUntil: '2026-12-31',
    };

    const mockFile = {
      buffer: Buffer.from('test pdf content'),
      originalname: 'contract.pdf',
      mimetype: 'application/pdf',
    } as Express.Multer.File;

    const mockUploadedContract = {
      id: 'contract-2',
      displayId: 'CTR-20260207-0002',
      relationshipId: 'relationship-1',
      supplierId: 'supplier-1',
      brandId: 'brand-1',
      type: ContractType.NDA,
      title: 'NDA Contract',
      validFrom: new Date('2026-01-01'),
      validUntil: new Date('2026-12-31'),
      documentUrl: '/uploads/contracts/CTR-20260207-0002.pdf',
      documentHash: 'test-hash-value',
      status: ContractStatus.DRAFT,
      brand: { tradeName: 'Test Brand', legalName: 'Test Brand Legal' },
      supplier: { tradeName: 'Test Supplier', legalName: 'Test Supplier Legal' },
    };

    it('should upload contract successfully', async () => {
      mockPrisma.supplierBrandRelationship.findUnique.mockResolvedValue(
        mockRelationship,
      );
      mockPrisma.supplierContract.findFirst.mockResolvedValue(null);
      mockPrisma.supplierContract.create.mockResolvedValue(
        mockUploadedContract,
      );

      const result = await service.uploadContract(
        uploadContractDto,
        mockFile,
        'user-1',
      );

      expect(result).toEqual(mockUploadedContract);
      expect(mockStorage.upload).toHaveBeenCalledWith(
        expect.objectContaining({
          mimetype: 'application/pdf',
          buffer: expect.any(Buffer),
        }),
        'contracts',
      );
      expect(mockPrisma.supplierContract.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: ContractType.NDA,
          title: 'NDA Contract',
          status: ContractStatus.DRAFT,
          createdById: 'user-1',
        }),
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException if relationship not found', async () => {
      mockPrisma.supplierBrandRelationship.findUnique.mockResolvedValue(null);

      await expect(
        service.uploadContract(uploadContractDto, mockFile, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('sendForSignature', () => {
    const mockContract = {
      id: 'contract-1',
      displayId: 'CTR-20260207-0001',
      brandId: 'brand-1',
      supplierId: 'supplier-1',
      title: 'Test Contract',
      status: ContractStatus.DRAFT,
      brand: { tradeName: 'Test Brand', legalName: 'Test Brand Legal' },
      supplier: { tradeName: 'Test Supplier', legalName: 'Test Supplier Legal' },
    };

    const mockUpdatedContract = {
      ...mockContract,
      status: ContractStatus.PENDING_SUPPLIER_SIGNATURE,
    };

    it('should transition from DRAFT to PENDING_SUPPLIER_SIGNATURE', async () => {
      mockPrisma.supplierContract.findUnique.mockResolvedValue(mockContract);
      mockPrisma.supplierContract.update.mockResolvedValue(
        mockUpdatedContract,
      );

      const result = await service.sendForSignature(
        'contract-1',
        'user-1',
        'Please review and sign',
      );

      expect(result.status).toBe(ContractStatus.PENDING_SUPPLIER_SIGNATURE);
      expect(mockPrisma.supplierContract.update).toHaveBeenCalledWith({
        where: { id: 'contract-1' },
        data: {
          status: ContractStatus.PENDING_SUPPLIER_SIGNATURE,
        },
        include: expect.any(Object),
      });
    });

    it('should emit CONTRACT_SENT_FOR_SIGNATURE event', async () => {
      mockPrisma.supplierContract.findUnique.mockResolvedValue(mockContract);
      mockPrisma.supplierContract.update.mockResolvedValue(
        mockUpdatedContract,
      );

      await service.sendForSignature('contract-1', 'user-1');

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'contract.sent.for.signature',
        expect.objectContaining({
          contractId: 'contract-1',
          displayId: 'CTR-20260207-0001',
          brandId: 'brand-1',
          supplierId: 'supplier-1',
          sentById: 'user-1',
        }),
      );
    });

    it('should throw NotFoundException if contract not found', async () => {
      mockPrisma.supplierContract.findUnique.mockResolvedValue(null);

      await expect(
        service.sendForSignature('contract-999', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if contract is not in DRAFT status', async () => {
      const signedContract = {
        ...mockContract,
        status: ContractStatus.SIGNED,
      };
      mockPrisma.supplierContract.findUnique.mockResolvedValue(signedContract);

      await expect(
        service.sendForSignature('contract-1', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('signAsBrand', () => {
    const mockContract = {
      id: 'contract-1',
      displayId: 'CTR-20260207-0001',
      brandId: 'brand-1',
      supplierId: 'supplier-1',
      title: 'Test Contract',
      status: ContractStatus.PENDING_BRAND_SIGNATURE,
      brandSignedAt: null,
      supplierSignedAt: null,
    };

    it('should record brand signature with name, date, IP, and hash', async () => {
      mockPrisma.supplierContract.findUnique.mockResolvedValue(mockContract);
      const updatedContract = {
        ...mockContract,
        brandSignedAt: new Date(),
        brandSignedById: 'user-1',
        brandSignerName: 'John Doe',
        brandSignatureIp: '192.168.1.1',
        status: ContractStatus.PENDING_SUPPLIER_SIGNATURE,
        brand: { tradeName: 'Test Brand', legalName: 'Test Brand Legal' },
        supplier: { tradeName: 'Test Supplier', legalName: 'Test Supplier Legal' },
      };
      mockPrisma.supplierContract.update.mockResolvedValue(updatedContract);

      const result = await service.signAsBrand(
        'contract-1',
        'user-1',
        'John Doe',
        '192.168.1.1',
      );

      expect(mockPrisma.supplierContract.update).toHaveBeenCalledWith({
        where: { id: 'contract-1' },
        data: expect.objectContaining({
          brandSignedAt: expect.any(Date),
          brandSignedById: 'user-1',
          brandSignerName: 'John Doe',
          brandSignatureIp: '192.168.1.1',
        }),
        include: expect.any(Object),
      });
      expect(result.brandSignerName).toBe('John Doe');
    });

    it('should update status to SIGNED when both parties have signed', async () => {
      const contractWithSupplierSignature = {
        ...mockContract,
        supplierSignedAt: new Date(),
      };
      mockPrisma.supplierContract.findUnique.mockResolvedValue(
        contractWithSupplierSignature,
      );
      const fullySignedContract = {
        ...contractWithSupplierSignature,
        brandSignedAt: new Date(),
        brandSignedById: 'user-1',
        brandSignerName: 'John Doe',
        brandSignatureIp: '192.168.1.1',
        status: ContractStatus.SIGNED,
        brand: { tradeName: 'Test Brand', legalName: 'Test Brand Legal' },
        supplier: { tradeName: 'Test Supplier', legalName: 'Test Supplier Legal' },
      };
      mockPrisma.supplierContract.update.mockResolvedValue(fullySignedContract);

      const result = await service.signAsBrand(
        'contract-1',
        'user-1',
        'John Doe',
        '192.168.1.1',
      );

      expect(result.status).toBe(ContractStatus.SIGNED);
    });

    it('should emit CONTRACT_SIGNED event', async () => {
      mockPrisma.supplierContract.findUnique.mockResolvedValue(mockContract);
      const updatedContract = {
        ...mockContract,
        brandSignedAt: new Date(),
        status: ContractStatus.PENDING_SUPPLIER_SIGNATURE,
        brand: { tradeName: 'Test Brand', legalName: 'Test Brand Legal' },
        supplier: { tradeName: 'Test Supplier', legalName: 'Test Supplier Legal' },
      };
      mockPrisma.supplierContract.update.mockResolvedValue(updatedContract);

      await service.signAsBrand('contract-1', 'user-1', 'John Doe', '192.168.1.1');

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'contract.signed',
        expect.objectContaining({
          contractId: 'contract-1',
          signedBy: 'BRAND',
          signerName: 'John Doe',
          signerId: 'user-1',
        }),
      );
    });

    it('should emit CONTRACT_FULLY_SIGNED event when both parties signed', async () => {
      const contractWithSupplierSignature = {
        ...mockContract,
        supplierSignedAt: new Date(),
      };
      mockPrisma.supplierContract.findUnique.mockResolvedValue(
        contractWithSupplierSignature,
      );
      const fullySignedContract = {
        ...contractWithSupplierSignature,
        brandSignedAt: new Date(),
        status: ContractStatus.SIGNED,
        brand: { tradeName: 'Test Brand', legalName: 'Test Brand Legal' },
        supplier: { tradeName: 'Test Supplier', legalName: 'Test Supplier Legal' },
      };
      mockPrisma.supplierContract.update.mockResolvedValue(fullySignedContract);

      await service.signAsBrand('contract-1', 'user-1', 'John Doe', '192.168.1.1');

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'contract.fully.signed',
        expect.objectContaining({
          contractId: 'contract-1',
          displayId: 'CTR-20260207-0001',
        }),
      );
    });

    it('should throw BadRequestException if contract already signed by brand', async () => {
      const alreadySignedContract = {
        ...mockContract,
        brandSignedAt: new Date(),
      };
      mockPrisma.supplierContract.findUnique.mockResolvedValue(
        alreadySignedContract,
      );

      await expect(
        service.signAsBrand('contract-1', 'user-1', 'John Doe', '192.168.1.1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if contract not found', async () => {
      mockPrisma.supplierContract.findUnique.mockResolvedValue(null);

      await expect(
        service.signAsBrand('contract-999', 'user-1', 'John Doe', '192.168.1.1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('signAsSupplier', () => {
    const mockContract = {
      id: 'contract-1',
      displayId: 'CTR-20260207-0001',
      brandId: 'brand-1',
      supplierId: 'supplier-1',
      title: 'Test Contract',
      relationshipId: 'relationship-1',
      status: ContractStatus.PENDING_SUPPLIER_SIGNATURE,
      brandSignedAt: null,
      supplierSignedAt: null,
    };

    it('should record supplier signature', async () => {
      mockPrisma.supplierContract.findUnique.mockResolvedValue(mockContract);
      mockPrisma.contractRevision.findFirst.mockResolvedValue(null);
      const updatedContract = {
        ...mockContract,
        supplierSignedAt: new Date(),
        supplierSignedById: 'user-2',
        supplierSignerName: 'Jane Supplier',
        supplierSignatureIp: '192.168.1.2',
        status: ContractStatus.PENDING_BRAND_SIGNATURE,
        brand: { tradeName: 'Test Brand', legalName: 'Test Brand Legal' },
        supplier: { tradeName: 'Test Supplier', legalName: 'Test Supplier Legal' },
      };
      mockPrisma.supplierContract.update.mockResolvedValue(updatedContract);

      const result = await service.signAsSupplier(
        'contract-1',
        'user-2',
        'Jane Supplier',
        '192.168.1.2',
      );

      expect(mockPrisma.supplierContract.update).toHaveBeenCalledWith({
        where: { id: 'contract-1' },
        data: expect.objectContaining({
          supplierSignedAt: expect.any(Date),
          supplierSignedById: 'user-2',
          supplierSignerName: 'Jane Supplier',
          supplierSignatureIp: '192.168.1.2',
        }),
        include: expect.any(Object),
      });
    });

    it('should transition to SIGNED status when both parties have signed', async () => {
      const contractWithBrandSignature = {
        ...mockContract,
        brandSignedAt: new Date(),
      };
      mockPrisma.supplierContract.findUnique.mockResolvedValue(
        contractWithBrandSignature,
      );
      mockPrisma.contractRevision.findFirst.mockResolvedValue(null);
      const fullySignedContract = {
        ...contractWithBrandSignature,
        supplierSignedAt: new Date(),
        status: ContractStatus.SIGNED,
        brand: { tradeName: 'Test Brand', legalName: 'Test Brand Legal' },
        supplier: { tradeName: 'Test Supplier', legalName: 'Test Supplier Legal' },
      };
      mockPrisma.supplierContract.update.mockResolvedValue(fullySignedContract);
      mockPrisma.supplierBrandRelationship.update.mockResolvedValue({});

      const result = await service.signAsSupplier(
        'contract-1',
        'user-2',
        'Jane Supplier',
        '192.168.1.2',
      );

      expect(result.status).toBe(ContractStatus.SIGNED);
    });

    it('should emit CONTRACT_FULLY_SIGNED event when both parties signed', async () => {
      const contractWithBrandSignature = {
        ...mockContract,
        brandSignedAt: new Date(),
      };
      mockPrisma.supplierContract.findUnique.mockResolvedValue(
        contractWithBrandSignature,
      );
      mockPrisma.contractRevision.findFirst.mockResolvedValue(null);
      const fullySignedContract = {
        ...contractWithBrandSignature,
        supplierSignedAt: new Date(),
        status: ContractStatus.SIGNED,
        brand: { tradeName: 'Test Brand', legalName: 'Test Brand Legal' },
        supplier: { tradeName: 'Test Supplier', legalName: 'Test Supplier Legal' },
      };
      mockPrisma.supplierContract.update.mockResolvedValue(fullySignedContract);
      mockPrisma.supplierBrandRelationship.update.mockResolvedValue({});

      await service.signAsSupplier(
        'contract-1',
        'user-2',
        'Jane Supplier',
        '192.168.1.2',
      );

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'contract.fully.signed',
        expect.objectContaining({
          contractId: 'contract-1',
          displayId: 'CTR-20260207-0001',
        }),
      );
    });

    it('should activate relationship when both parties have signed', async () => {
      const contractWithBrandSignature = {
        ...mockContract,
        brandSignedAt: new Date(),
        relationshipId: 'relationship-1',
      };
      mockPrisma.supplierContract.findUnique.mockResolvedValue(
        contractWithBrandSignature,
      );
      mockPrisma.contractRevision.findFirst.mockResolvedValue(null);
      const fullySignedContract = {
        ...contractWithBrandSignature,
        supplierSignedAt: new Date(),
        status: ContractStatus.SIGNED,
        brand: { tradeName: 'Test Brand', legalName: 'Test Brand Legal' },
        supplier: { tradeName: 'Test Supplier', legalName: 'Test Supplier Legal' },
      };
      mockPrisma.supplierContract.update.mockResolvedValue(fullySignedContract);
      mockPrisma.supplierBrandRelationship.update.mockResolvedValue({});

      await service.signAsSupplier(
        'contract-1',
        'user-2',
        'Jane Supplier',
        '192.168.1.2',
      );

      expect(mockPrisma.supplierBrandRelationship.update).toHaveBeenCalledWith({
        where: { id: 'relationship-1' },
        data: {
          status: 'ACTIVE',
          activatedAt: expect.any(Date),
        },
      });
    });

    it('should throw BadRequestException if contract not in valid status', async () => {
      const draftContract = {
        ...mockContract,
        status: ContractStatus.DRAFT,
      };
      mockPrisma.supplierContract.findUnique.mockResolvedValue(draftContract);

      await expect(
        service.signAsSupplier('contract-1', 'user-2', 'Jane Supplier', '192.168.1.2'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if supplier already signed', async () => {
      const alreadySignedContract = {
        ...mockContract,
        supplierSignedAt: new Date(),
      };
      mockPrisma.supplierContract.findUnique.mockResolvedValue(
        alreadySignedContract,
      );

      await expect(
        service.signAsSupplier('contract-1', 'user-2', 'Jane Supplier', '192.168.1.2'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if pending revision exists', async () => {
      mockPrisma.supplierContract.findUnique.mockResolvedValue(mockContract);
      mockPrisma.contractRevision.findFirst.mockResolvedValue({
        id: 'revision-1',
        status: ContractRevisionStatus.PENDING,
      });

      await expect(
        service.signAsSupplier('contract-1', 'user-2', 'Jane Supplier', '192.168.1.2'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if contract not found', async () => {
      mockPrisma.supplierContract.findUnique.mockResolvedValue(null);

      await expect(
        service.signAsSupplier('contract-999', 'user-2', 'Jane Supplier', '192.168.1.2'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('requestRevision', () => {
    const mockContract = {
      id: 'contract-1',
      displayId: 'CTR-20260207-0001',
      brandId: 'brand-1',
      supplierId: 'supplier-1',
      status: ContractStatus.PENDING_SUPPLIER_SIGNATURE,
    };

    const mockRevision = {
      id: 'revision-1',
      contractId: 'contract-1',
      requestedById: 'user-2',
      message: 'Please adjust payment terms',
      status: ContractRevisionStatus.PENDING,
      requestedBy: { name: 'Jane Supplier', email: 'jane@supplier.com' },
    };

    it('should create revision request successfully', async () => {
      mockPrisma.supplierContract.findUnique.mockResolvedValue(mockContract);
      mockPrisma.contractRevision.findFirst.mockResolvedValue(null);
      mockPrisma.contractRevision.create.mockResolvedValue(mockRevision);

      const result = await service.requestRevision(
        {
          contractId: 'contract-1',
          message: 'Please adjust payment terms',
        },
        'user-2',
      );

      expect(result).toEqual(mockRevision);
      expect(mockPrisma.contractRevision.create).toHaveBeenCalledWith({
        data: {
          contractId: 'contract-1',
          requestedById: 'user-2',
          message: 'Please adjust payment terms',
          status: ContractRevisionStatus.PENDING,
        },
        include: expect.any(Object),
      });
    });

    it('should emit CONTRACT_REVISION_REQUESTED event', async () => {
      mockPrisma.supplierContract.findUnique.mockResolvedValue(mockContract);
      mockPrisma.contractRevision.findFirst.mockResolvedValue(null);
      mockPrisma.contractRevision.create.mockResolvedValue(mockRevision);

      await service.requestRevision(
        {
          contractId: 'contract-1',
          message: 'Please adjust payment terms',
        },
        'user-2',
      );

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'contract.revision.requested',
        expect.objectContaining({
          revisionId: 'revision-1',
          contractId: 'contract-1',
          requestedById: 'user-2',
          message: 'Please adjust payment terms',
        }),
      );
    });

    it('should throw NotFoundException if contract not found', async () => {
      mockPrisma.supplierContract.findUnique.mockResolvedValue(null);

      await expect(
        service.requestRevision(
          { contractId: 'contract-999', message: 'Test' },
          'user-2',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if contract not in PENDING_SUPPLIER_SIGNATURE', async () => {
      const draftContract = {
        ...mockContract,
        status: ContractStatus.DRAFT,
      };
      mockPrisma.supplierContract.findUnique.mockResolvedValue(draftContract);

      await expect(
        service.requestRevision(
          { contractId: 'contract-1', message: 'Test' },
          'user-2',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if pending revision already exists', async () => {
      mockPrisma.supplierContract.findUnique.mockResolvedValue(mockContract);
      mockPrisma.contractRevision.findFirst.mockResolvedValue({
        id: 'revision-1',
        status: ContractRevisionStatus.PENDING,
      });

      await expect(
        service.requestRevision(
          { contractId: 'contract-1', message: 'Test' },
          'user-2',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('respondToRevision', () => {
    const mockRevision = {
      id: 'revision-1',
      contractId: 'contract-1',
      status: ContractRevisionStatus.PENDING,
      contract: {
        id: 'contract-1',
        displayId: 'CTR-20260207-0001',
        brandId: 'brand-1',
        supplierId: 'supplier-1',
      },
    };

    const mockUpdatedRevision = {
      ...mockRevision,
      status: ContractRevisionStatus.ACCEPTED,
      respondedById: 'user-1',
      respondedAt: new Date(),
      responseNotes: 'Revision accepted, will update contract',
      requestedBy: { name: 'Jane Supplier', email: 'jane@supplier.com' },
      respondedBy: { name: 'John Brand', email: 'john@brand.com' },
      contract: { displayId: 'CTR-20260207-0001' },
    };

    it('should accept revision request', async () => {
      mockPrisma.contractRevision.findUnique.mockResolvedValue(mockRevision);
      mockPrisma.contractRevision.update.mockResolvedValue(mockUpdatedRevision);

      const result = await service.respondToRevision(
        {
          revisionId: 'revision-1',
          status: ContractRevisionStatus.ACCEPTED,
          responseNotes: 'Revision accepted, will update contract',
        },
        'user-1',
      );

      expect(result.status).toBe(ContractRevisionStatus.ACCEPTED);
      expect(mockPrisma.contractRevision.update).toHaveBeenCalledWith({
        where: { id: 'revision-1' },
        data: {
          status: ContractRevisionStatus.ACCEPTED,
          respondedById: 'user-1',
          respondedAt: expect.any(Date),
          responseNotes: 'Revision accepted, will update contract',
        },
        include: expect.any(Object),
      });
    });

    it('should reject revision request', async () => {
      const rejectedRevision = {
        ...mockUpdatedRevision,
        status: ContractRevisionStatus.REJECTED,
      };
      mockPrisma.contractRevision.findUnique.mockResolvedValue(mockRevision);
      mockPrisma.contractRevision.update.mockResolvedValue(rejectedRevision);

      const result = await service.respondToRevision(
        {
          revisionId: 'revision-1',
          status: ContractRevisionStatus.REJECTED,
          responseNotes: 'Cannot accommodate this change',
        },
        'user-1',
      );

      expect(result.status).toBe(ContractRevisionStatus.REJECTED);
    });

    it('should emit CONTRACT_REVISION_RESPONDED event', async () => {
      mockPrisma.contractRevision.findUnique.mockResolvedValue(mockRevision);
      mockPrisma.contractRevision.update.mockResolvedValue(mockUpdatedRevision);

      await service.respondToRevision(
        {
          revisionId: 'revision-1',
          status: ContractRevisionStatus.ACCEPTED,
          responseNotes: 'Revision accepted',
        },
        'user-1',
      );

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'contract.revision.responded',
        expect.objectContaining({
          revisionId: 'revision-1',
          contractId: 'contract-1',
          status: ContractRevisionStatus.ACCEPTED,
          respondedById: 'user-1',
        }),
      );
    });

    it('should throw NotFoundException if revision not found', async () => {
      mockPrisma.contractRevision.findUnique.mockResolvedValue(null);

      await expect(
        service.respondToRevision(
          {
            revisionId: 'revision-999',
            status: ContractRevisionStatus.ACCEPTED,
          },
          'user-1',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if revision already responded', async () => {
      const respondedRevision = {
        ...mockRevision,
        status: ContractRevisionStatus.ACCEPTED,
      };
      mockPrisma.contractRevision.findUnique.mockResolvedValue(
        respondedRevision,
      );

      await expect(
        service.respondToRevision(
          {
            revisionId: 'revision-1',
            status: ContractRevisionStatus.ACCEPTED,
          },
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancelContract', () => {
    const mockContract = {
      id: 'contract-1',
      displayId: 'CTR-20260207-0001',
      brandId: 'brand-1',
      supplierId: 'supplier-1',
      status: ContractStatus.DRAFT,
    };

    it('should cancel contract successfully', async () => {
      mockPrisma.supplierContract.findUnique.mockResolvedValue(mockContract);
      const cancelledContract = {
        ...mockContract,
        status: ContractStatus.CANCELLED,
        brand: { tradeName: 'Test Brand', legalName: 'Test Brand Legal' },
        supplier: { tradeName: 'Test Supplier', legalName: 'Test Supplier Legal' },
      };
      mockPrisma.supplierContract.update.mockResolvedValue(cancelledContract);

      const result = await service.cancelContract(
        'contract-1',
        'user-1',
        'No longer needed',
      );

      expect(result.status).toBe(ContractStatus.CANCELLED);
      expect(mockPrisma.supplierContract.update).toHaveBeenCalledWith({
        where: { id: 'contract-1' },
        data: {
          status: ContractStatus.CANCELLED,
        },
        include: expect.any(Object),
      });
    });

    it('should emit CONTRACT_CANCELLED event', async () => {
      mockPrisma.supplierContract.findUnique.mockResolvedValue(mockContract);
      const cancelledContract = {
        ...mockContract,
        status: ContractStatus.CANCELLED,
        brand: { tradeName: 'Test Brand', legalName: 'Test Brand Legal' },
        supplier: { tradeName: 'Test Supplier', legalName: 'Test Supplier Legal' },
      };
      mockPrisma.supplierContract.update.mockResolvedValue(cancelledContract);

      await service.cancelContract('contract-1', 'user-1', 'No longer needed');

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'contract.cancelled',
        expect.objectContaining({
          contractId: 'contract-1',
          cancelledById: 'user-1',
          reason: 'No longer needed',
        }),
      );
    });

    it('should throw NotFoundException if contract not found', async () => {
      mockPrisma.supplierContract.findUnique.mockResolvedValue(null);

      await expect(
        service.cancelContract('contract-999', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if contract is already SIGNED', async () => {
      const signedContract = {
        ...mockContract,
        status: ContractStatus.SIGNED,
      };
      mockPrisma.supplierContract.findUnique.mockResolvedValue(signedContract);

      await expect(
        service.cancelContract('contract-1', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if contract is already CANCELLED', async () => {
      const cancelledContract = {
        ...mockContract,
        status: ContractStatus.CANCELLED,
      };
      mockPrisma.supplierContract.findUnique.mockResolvedValue(
        cancelledContract,
      );

      await expect(
        service.cancelContract('contract-1', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findById', () => {
    const mockContract = {
      id: 'contract-1',
      displayId: 'CTR-20260207-0001',
      brandId: 'brand-1',
      supplierId: 'supplier-1',
      status: ContractStatus.SIGNED,
      brand: {
        id: 'brand-1',
        tradeName: 'Test Brand',
        legalName: 'Test Brand Legal',
        document: '12345678901234',
        city: 'São Paulo',
        state: 'SP',
      },
      supplier: {
        id: 'supplier-1',
        tradeName: 'Test Supplier',
        legalName: 'Test Supplier Legal',
        document: '98765432109876',
        city: 'Rio de Janeiro',
        state: 'RJ',
      },
      brandSignedBy: { name: 'John Doe', email: 'john@brand.com' },
      supplierSignedBy: { name: 'Jane Supplier', email: 'jane@supplier.com' },
      createdBy: { name: 'Admin', email: 'admin@texlink.com' },
      revisions: [],
      amendments: [],
      parentContract: null,
    };

    it('should return contract by id', async () => {
      mockPrisma.supplierContract.findUnique.mockResolvedValue(mockContract);

      const result = await service.findById('contract-1');

      expect(result).toEqual(mockContract);
      expect(mockPrisma.supplierContract.findUnique).toHaveBeenCalledWith({
        where: { id: 'contract-1' },
        include: expect.objectContaining({
          brand: expect.any(Object),
          supplier: expect.any(Object),
          brandSignedBy: expect.any(Object),
          supplierSignedBy: expect.any(Object),
          revisions: expect.any(Object),
          amendments: expect.any(Object),
          parentContract: expect.any(Object),
        }),
      });
    });

    it('should throw NotFoundException if contract not found', async () => {
      mockPrisma.supplierContract.findUnique.mockResolvedValue(null);

      await expect(service.findById('contract-999')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('generateDisplayId', () => {
    it('should generate displayId with CTR-YYYYMMDD-0001 format for first contract of the day', async () => {
      mockPrisma.supplierContract.findFirst.mockResolvedValue(null);

      const displayId = await service.generateDisplayId();

      expect(displayId).toMatch(/^CTR-\d{8}-0001$/);
    });

    it('should increment sequence for subsequent contracts on same day', async () => {
      const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
      mockPrisma.supplierContract.findFirst.mockResolvedValue({
        displayId: `CTR-${today}-0005`,
      });

      const displayId = await service.generateDisplayId();

      expect(displayId).toBe(`CTR-${today}-0006`);
    });

    it('should pad sequence number with zeros', async () => {
      const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
      mockPrisma.supplierContract.findFirst.mockResolvedValue({
        displayId: `CTR-${today}-0099`,
      });

      const displayId = await service.generateDisplayId();

      expect(displayId).toBe(`CTR-${today}-0100`);
    });
  });

  describe('getExpiringContracts', () => {
    it('should return contracts expiring in specified days', async () => {
      const mockContracts = [
        {
          id: 'contract-1',
          displayId: 'CTR-20260207-0001',
          validUntil: new Date('2026-02-14'),
          status: ContractStatus.SIGNED,
          brand: { tradeName: 'Test Brand', legalName: 'Test Brand Legal' },
          supplier: { tradeName: 'Test Supplier', legalName: 'Test Supplier Legal' },
        },
      ];
      mockPrisma.supplierContract.findMany.mockResolvedValue(mockContracts);

      const result = await service.getExpiringContracts(7);

      expect(result).toEqual(mockContracts);
      expect(mockPrisma.supplierContract.findMany).toHaveBeenCalledWith({
        where: {
          status: ContractStatus.SIGNED,
          validUntil: {
            gte: expect.any(Date),
            lte: expect.any(Date),
          },
        },
        include: expect.any(Object),
      });
    });
  });

  describe('markExpiredContracts', () => {
    it('should mark expired contracts', async () => {
      mockPrisma.supplierContract.updateMany.mockResolvedValue({ count: 3 });

      const result = await service.markExpiredContracts();

      expect(result.count).toBe(3);
      expect(mockPrisma.supplierContract.updateMany).toHaveBeenCalledWith({
        where: {
          status: ContractStatus.SIGNED,
          validUntil: {
            lt: expect.any(Date),
          },
        },
        data: {
          status: ContractStatus.EXPIRED,
        },
      });
    });

    it('should return zero count when no contracts expired', async () => {
      mockPrisma.supplierContract.updateMany.mockResolvedValue({ count: 0 });

      const result = await service.markExpiredContracts();

      expect(result.count).toBe(0);
    });
  });
});
