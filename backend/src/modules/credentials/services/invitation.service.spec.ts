import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { InvitationService } from './invitation.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { IntegrationService } from '../../integrations/services/integration.service';
import { SupplierCredentialStatus, InvitationType } from '@prisma/client';
import { InvitationChannel } from '../dto';

describe('InvitationService', () => {
  let service: InvitationService;
  let prisma: PrismaService;
  let integrationService: IntegrationService;

  const mockPrismaService = {
    supplierCredential: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    credentialInvitation: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    credentialStatusHistory: {
      create: jest.fn(),
    },
    credentialSettings: {
      findUnique: jest.fn(),
    },
  };

  const mockIntegrationService = {
    sendEmail: jest.fn(),
    sendWhatsApp: jest.fn(),
  };

  const mockUser = {
    id: 'user-123',
    companyId: 'brand-123',
    brandId: 'brand-123',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvitationService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: IntegrationService,
          useValue: mockIntegrationService,
        },
      ],
    }).compile();

    service = module.get<InvitationService>(InvitationService);
    prisma = module.get<PrismaService>(PrismaService);
    integrationService = module.get<IntegrationService>(IntegrationService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendInvitation', () => {
    const mockCredential = {
      id: 'cred-123',
      cnpj: '12345678000190',
      tradeName: 'Facção Teste',
      contactName: 'João Silva',
      contactEmail: 'joao@example.com',
      contactPhone: '11987654321',
      contactWhatsapp: '11987654321',
      status: SupplierCredentialStatus.INVITATION_PENDING,
      brandId: 'brand-123',
      brand: {
        id: 'brand-123',
        tradeName: 'Marca Teste',
      },
    };

    beforeEach(() => {
      mockPrismaService.supplierCredential.findUnique.mockResolvedValue(
        mockCredential,
      );
      mockPrismaService.credentialStatusHistory.create.mockResolvedValue({});
      mockPrismaService.supplierCredential.update.mockResolvedValue({});
    });

    it('should send email invitation successfully', async () => {
      mockIntegrationService.sendEmail.mockResolvedValue({
        success: true,
        messageId: 'msg-123',
      });
      mockPrismaService.credentialInvitation.create.mockResolvedValue({});

      const dto = {
        channel: InvitationChannel.EMAIL,
      };

      const result = await service.sendInvitation('cred-123', dto, mockUser);

      expect(result.results.email?.success).toBe(true);
      expect(mockIntegrationService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'joao@example.com',
        }),
      );
      expect(mockPrismaService.credentialInvitation.create).toHaveBeenCalled();
    });

    it('should send WhatsApp invitation successfully', async () => {
      mockIntegrationService.sendWhatsApp.mockResolvedValue({
        success: true,
        messageId: 'whats-123',
      });
      mockPrismaService.credentialInvitation.create.mockResolvedValue({});

      const dto = {
        channel: InvitationChannel.WHATSAPP,
      };

      const result = await service.sendInvitation('cred-123', dto, mockUser);

      expect(result.results.whatsapp?.success).toBe(true);
      expect(mockIntegrationService.sendWhatsApp).toHaveBeenCalled();
    });

    it('should send both email and WhatsApp', async () => {
      mockIntegrationService.sendEmail.mockResolvedValue({
        success: true,
        messageId: 'email-123',
      });
      mockIntegrationService.sendWhatsApp.mockResolvedValue({
        success: true,
        messageId: 'whats-123',
      });
      mockPrismaService.credentialInvitation.create.mockResolvedValue({});

      const dto = {
        channel: InvitationChannel.BOTH,
      };

      const result = await service.sendInvitation('cred-123', dto, mockUser);

      expect(result.results.email?.success).toBe(true);
      expect(result.results.whatsapp?.success).toBe(true);
      expect(mockIntegrationService.sendEmail).toHaveBeenCalled();
      expect(mockIntegrationService.sendWhatsApp).toHaveBeenCalled();
    });

    it('should throw BadRequestException if status not allowed', async () => {
      mockPrismaService.supplierCredential.findUnique.mockResolvedValue({
        ...mockCredential,
        status: SupplierCredentialStatus.ACTIVE,
      });

      const dto = {
        channel: InvitationChannel.EMAIL,
      };

      await expect(
        service.sendInvitation('cred-123', dto, mockUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if email missing for email channel', async () => {
      mockPrismaService.supplierCredential.findUnique.mockResolvedValue({
        ...mockCredential,
        contactEmail: null,
      });

      const dto = {
        channel: InvitationChannel.EMAIL,
      };

      await expect(
        service.sendInvitation('cred-123', dto, mockUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update credential status after sending', async () => {
      mockIntegrationService.sendEmail.mockResolvedValue({
        success: true,
      });
      mockPrismaService.credentialInvitation.create.mockResolvedValue({});

      const dto = {
        channel: InvitationChannel.EMAIL,
      };

      await service.sendInvitation('cred-123', dto, mockUser);

      expect(mockPrismaService.supplierCredential.update).toHaveBeenCalledWith({
        where: { id: 'cred-123' },
        data: { status: SupplierCredentialStatus.INVITATION_SENT },
      });
    });

    it('should create invitation record even on send failure', async () => {
      mockIntegrationService.sendEmail.mockResolvedValue({
        success: false,
        error: 'Send failed',
      });
      mockPrismaService.credentialInvitation.create.mockResolvedValue({});

      const dto = {
        channel: InvitationChannel.EMAIL,
      };

      const result = await service.sendInvitation('cred-123', dto, mockUser);

      expect(result.results.email?.success).toBe(false);
      expect(
        mockPrismaService.credentialInvitation.create,
      ).toHaveBeenCalledWith({
        data: expect.objectContaining({
          errorMessage: 'Send failed',
        }),
      });
    });
  });

  describe('validateInvitationToken', () => {
    const mockInvitation = {
      id: 'inv-123',
      credentialId: 'cred-123',
      token: 'token-123',
      type: InvitationType.EMAIL,
      isActive: true,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      openedAt: null,
      sentAt: new Date(),
      credential: {
        id: 'cred-123',
        cnpj: '12345678000190',
        tradeName: 'Facção Teste',
        legalName: 'Facção Teste Ltda',
        contactName: 'João',
        contactEmail: 'joao@example.com',
        contactPhone: '11987654321',
        status: SupplierCredentialStatus.INVITATION_SENT,
        brand: {
          id: 'brand-123',
          tradeName: 'Marca Teste',
          legalName: 'Marca Teste Ltda',
          logoUrl: 'https://...',
          city: 'São Paulo',
          state: 'SP',
        },
        onboarding: null,
      },
    };

    it('should validate token and return credential data', async () => {
      mockPrismaService.credentialInvitation.findUnique.mockResolvedValue(
        mockInvitation,
      );
      mockPrismaService.credentialInvitation.update.mockResolvedValue({});
      mockPrismaService.supplierCredential.update.mockResolvedValue({});
      mockPrismaService.credentialStatusHistory.create.mockResolvedValue({});

      const result = await service.validateInvitationToken('token-123');

      expect(result.valid).toBe(true);
      expect(result.brand).toBeDefined();
      expect(result.brand.tradeName).toBe('Marca Teste');
      expect(result.credential).toBeDefined();
      expect(result.credential.cnpj).toBe('12345678000190');
    });

    it('should throw NotFoundException for invalid token', async () => {
      mockPrismaService.credentialInvitation.findUnique.mockResolvedValue(null);

      await expect(
        service.validateInvitationToken('invalid-token'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for inactive token', async () => {
      mockPrismaService.credentialInvitation.findUnique.mockResolvedValue({
        ...mockInvitation,
        isActive: false,
      });

      await expect(
        service.validateInvitationToken('token-123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for expired token', async () => {
      mockPrismaService.credentialInvitation.findUnique.mockResolvedValue({
        ...mockInvitation,
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
      });
      mockPrismaService.credentialInvitation.update.mockResolvedValue({});
      mockPrismaService.supplierCredential.update.mockResolvedValue({});
      mockPrismaService.credentialStatusHistory.create.mockResolvedValue({});

      await expect(
        service.validateInvitationToken('token-123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update openedAt on first validation', async () => {
      mockPrismaService.credentialInvitation.findUnique.mockResolvedValue(
        mockInvitation,
      );
      mockPrismaService.credentialInvitation.update.mockResolvedValue({});
      mockPrismaService.supplierCredential.update.mockResolvedValue({});
      mockPrismaService.credentialStatusHistory.create.mockResolvedValue({});

      await service.validateInvitationToken('token-123');

      expect(
        mockPrismaService.credentialInvitation.update,
      ).toHaveBeenCalledWith({
        where: { id: 'inv-123' },
        data: expect.objectContaining({
          openedAt: expect.any(Date),
        }),
      });
    });

    it('should not update openedAt if already opened', async () => {
      mockPrismaService.credentialInvitation.findUnique.mockResolvedValue({
        ...mockInvitation,
        openedAt: new Date(),
      });

      await service.validateInvitationToken('token-123');

      expect(
        mockPrismaService.credentialInvitation.update,
      ).not.toHaveBeenCalled();
    });
  });

  describe('resendInvitation', () => {
    const mockCredential = {
      id: 'cred-123',
      brandId: 'brand-123',
      contactEmail: 'joao@example.com',
      contactName: 'João Silva',
      status: SupplierCredentialStatus.INVITATION_SENT,
      brand: { tradeName: 'Marca Teste' },
    };

    const mockLastInvitation = {
      id: 'inv-123',
      credentialId: 'cred-123',
      type: InvitationType.EMAIL,
      attemptCount: 1,
      templateId: null,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    };

    const mockCredentialSettings = {
      maxInvitationAttempts: 3,
      invitationExpiryDays: 7,
    };

    beforeEach(() => {
      mockPrismaService.supplierCredential.findUnique.mockResolvedValue(
        mockCredential,
      );
      mockPrismaService.credentialInvitation.findFirst.mockResolvedValue(
        mockLastInvitation,
      );
      mockPrismaService.credentialSettings.findUnique.mockResolvedValue(
        mockCredentialSettings,
      );
      mockIntegrationService.sendEmail.mockResolvedValue({
        success: true,
        messageId: 'msg-123',
      });
      mockPrismaService.credentialInvitation.create.mockResolvedValue({});
      mockPrismaService.credentialInvitation.update.mockResolvedValue({});
    });

    it('should resend invitation successfully', async () => {
      const result = await service.resendInvitation('cred-123', mockUser);

      expect(result.attemptNumber).toBe(2);
      expect(mockIntegrationService.sendEmail).toHaveBeenCalled();
      expect(
        mockPrismaService.credentialInvitation.update,
      ).toHaveBeenCalledWith({
        where: { id: 'inv-123' },
        data: { isActive: false },
      });
    });

    it('should throw BadRequestException if no previous invitation', async () => {
      mockPrismaService.credentialInvitation.findFirst.mockResolvedValue(null);

      await expect(
        service.resendInvitation('cred-123', mockUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if max attempts reached', async () => {
      mockPrismaService.credentialInvitation.findFirst.mockResolvedValue({
        ...mockLastInvitation,
        attemptCount: 3, // Equal to maxInvitationAttempts (3)
      });

      await expect(
        service.resendInvitation('cred-123', mockUser),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('markInvitationClicked', () => {
    const mockInvitation = {
      id: 'inv-123',
      credentialId: 'cred-123',
      token: 'token-123',
      clickedAt: null,
      credential: {
        id: 'cred-123',
        status: SupplierCredentialStatus.INVITATION_SENT,
      },
    };

    it('should mark invitation as clicked', async () => {
      mockPrismaService.credentialInvitation.findUnique.mockResolvedValue(
        mockInvitation,
      );
      mockPrismaService.credentialInvitation.update.mockResolvedValue({});
      mockPrismaService.supplierCredential.update.mockResolvedValue({});
      mockPrismaService.credentialStatusHistory.create.mockResolvedValue({});

      const result = await service.markInvitationClicked('token-123');

      expect(result.success).toBe(true);
      expect(
        mockPrismaService.credentialInvitation.update,
      ).toHaveBeenCalledWith({
        where: { id: 'inv-123' },
        data: { clickedAt: expect.any(Date) },
      });
    });

    it('should update credential status to ONBOARDING_STARTED', async () => {
      mockPrismaService.credentialInvitation.findUnique.mockResolvedValue(
        mockInvitation,
      );
      mockPrismaService.credentialInvitation.update.mockResolvedValue({});
      mockPrismaService.supplierCredential.update.mockResolvedValue({});
      mockPrismaService.credentialStatusHistory.create.mockResolvedValue({});

      await service.markInvitationClicked('token-123');

      expect(mockPrismaService.supplierCredential.update).toHaveBeenCalledWith({
        where: { id: 'cred-123' },
        data: { status: SupplierCredentialStatus.ONBOARDING_STARTED },
      });
    });

    it('should not update if already clicked', async () => {
      mockPrismaService.credentialInvitation.findUnique.mockResolvedValue({
        ...mockInvitation,
        clickedAt: new Date(),
      });

      await service.markInvitationClicked('token-123');

      expect(
        mockPrismaService.credentialInvitation.update,
      ).not.toHaveBeenCalled();
    });
  });
});
