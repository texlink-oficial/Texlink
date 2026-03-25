import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { STORAGE_PROVIDER } from '../upload/storage.provider';

/**
 * Unit tests for dynamic platform fee calculation.
 *
 * Rule:
 *  - 0% fee when the supplier was INVITED by the brand placing the order
 *  - 10% fee for all other cases (self-registered, invited by a different brand, no profile)
 */
describe('OrdersService – calculatePlatformFeePercentage', () => {
  let service: OrdersService;
  let prisma: PrismaService;

  const mockPrisma = {
    order: { create: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
    companyUser: { findFirst: jest.fn() },
    orderTargetSupplier: { updateMany: jest.fn() },
    user: { findUnique: jest.fn() },
    orderReview: { create: jest.fn(), findMany: jest.fn() },
    secondQualityItem: { createMany: jest.fn(), findMany: jest.fn() },
    supplierProfile: { findUnique: jest.fn() },
    credentialSettings: { findUnique: jest.fn() },
  };

  const mockEventEmitter = { emit: jest.fn() };
  const mockStorage = {
    upload: jest.fn(),
    delete: jest.fn(),
    getUrl: jest.fn(),
    getPresignedUrl: jest.fn(),
    resolveUrl: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: STORAGE_PROVIDER, useValue: mockStorage },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  // Access private method via bracket notation for testing
  const callCalculateFee = (
    svc: OrdersService,
    brandId: string,
    supplierId: string,
  ): Promise<number> => {
    return (svc as any).calculatePlatformFeePercentage(brandId, supplierId);
  };

  it('should return 0 (0% fee) when supplier was invited by the same brand', async () => {
    mockPrisma.supplierProfile.findUnique.mockResolvedValue({
      origin: 'INVITED',
      invitedByCompanyId: 'brand-1',
    });

    const fee = await callCalculateFee(service, 'brand-1', 'supplier-1');

    expect(fee).toBe(0);
    expect(mockPrisma.supplierProfile.findUnique).toHaveBeenCalledWith({
      where: { companyId: 'supplier-1' },
      select: { origin: true, invitedByCompanyId: true },
    });
  });

  it('should return 0.1 (10% fee) for a self-registered supplier', async () => {
    mockPrisma.supplierProfile.findUnique.mockResolvedValue({
      origin: 'SELF_REGISTERED',
      invitedByCompanyId: null,
    });

    const fee = await callCalculateFee(service, 'brand-1', 'supplier-2');

    expect(fee).toBe(0.1);
  });

  it('should return 0.1 (10% fee) when supplier was invited by a DIFFERENT brand', async () => {
    mockPrisma.supplierProfile.findUnique.mockResolvedValue({
      origin: 'INVITED',
      invitedByCompanyId: 'brand-other',
    });

    const fee = await callCalculateFee(service, 'brand-1', 'supplier-3');

    expect(fee).toBe(0.1);
  });

  it('should return 0.1 (10% fee) when supplier has no profile (safe default)', async () => {
    mockPrisma.supplierProfile.findUnique.mockResolvedValue(null);

    const fee = await callCalculateFee(service, 'brand-1', 'supplier-unknown');

    expect(fee).toBe(0.1);
  });
});
