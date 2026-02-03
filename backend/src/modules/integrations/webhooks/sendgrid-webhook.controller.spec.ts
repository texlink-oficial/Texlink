import { Test, TestingModule } from '@nestjs/testing';
import { SendGridWebhookController } from './sendgrid-webhook.controller';
import { PrismaService } from '../../../prisma/prisma.service';
import { SendGridSignatureService } from './sendgrid-signature.service';
import { SupplierCredentialStatus } from '@prisma/client';

describe('SendGridWebhookController', () => {
  let controller: SendGridWebhookController;
  let prisma: PrismaService;

  const mockPrismaService = {
    credentialInvitation: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    supplierCredential: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    credentialStatusHistory: {
      create: jest.fn(),
    },
  };

  const mockSendGridSignatureService = {
    verifySignature: jest.fn().mockReturnValue(true),
    extractTimestamp: jest.fn().mockReturnValue(null),
    validateSignature: jest.fn(),
  };

  // Mock request object
  const createMockRequest = (events: any[]) => ({
    rawBody: Buffer.from(JSON.stringify(events)),
  });

  // Helper to create events with invitationId in category
  const createEventWithInvitationId = (
    eventType: string,
    invitationId: string,
    extra: Record<string, any> = {},
  ) => ({
    event: eventType,
    email: 'test@example.com',
    timestamp: Math.floor(Date.now() / 1000),
    sg_message_id: `msg-${Date.now()}`,
    category: [`invitationId:${invitationId}`],
    ...extra,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SendGridWebhookController],
      providers: [
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: SendGridSignatureService,
          useValue: mockSendGridSignatureService,
        },
      ],
    }).compile();

    controller = module.get<SendGridWebhookController>(
      SendGridWebhookController,
    );
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();

    // Mock environment variables
    process.env.SENDGRID_WEBHOOK_VERIFY = 'false';
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('handleWebhook', () => {
    it('should process delivered event', async () => {
      const events = [createEventWithInvitationId('delivered', 'invitation-1')];

      const mockInvitation = {
        id: 'invitation-1',
        credentialId: 'credential-1',
        credential: { id: 'credential-1' },
      };

      mockPrismaService.credentialInvitation.findUnique.mockResolvedValue(
        mockInvitation,
      );
      mockPrismaService.credentialInvitation.update.mockResolvedValue({});

      const result = await controller.handleWebhook(
        createMockRequest(events) as any,
        events,
        '',
        '',
      );

      expect(result.success).toBe(true);
      expect(result.processed).toBe(1);
      expect(prisma.credentialInvitation.update).toHaveBeenCalledWith({
        where: { id: 'invitation-1' },
        data: { deliveredAt: expect.any(Date) },
      });
    });

    it('should process opened event and update credential status', async () => {
      const events = [createEventWithInvitationId('open', 'invitation-1')];

      const mockInvitation = {
        id: 'invitation-1',
        credentialId: 'credential-1',
        credential: { id: 'credential-1' },
      };

      const mockCredential = {
        id: 'credential-1',
        status: SupplierCredentialStatus.INVITATION_SENT,
      };

      mockPrismaService.credentialInvitation.findUnique.mockResolvedValue(
        mockInvitation,
      );
      mockPrismaService.credentialInvitation.update.mockResolvedValue({});
      mockPrismaService.supplierCredential.findUnique.mockResolvedValue(
        mockCredential,
      );
      mockPrismaService.supplierCredential.update.mockResolvedValue({});

      const result = await controller.handleWebhook(
        createMockRequest(events) as any,
        events,
        '',
        '',
      );

      expect(result.success).toBe(true);
      expect(result.processed).toBe(1);
      expect(prisma.supplierCredential.update).toHaveBeenCalledWith({
        where: { id: 'credential-1' },
        data: { status: SupplierCredentialStatus.INVITATION_OPENED },
      });
    });

    it('should process click event', async () => {
      const events = [
        createEventWithInvitationId('click', 'invitation-1', {
          url: 'https://example.com/onboarding/token',
        }),
      ];

      const mockInvitation = {
        id: 'invitation-1',
        credentialId: 'credential-1',
        credential: { id: 'credential-1' },
      };

      mockPrismaService.credentialInvitation.findUnique.mockResolvedValue(
        mockInvitation,
      );
      mockPrismaService.credentialInvitation.update.mockResolvedValue({});

      const result = await controller.handleWebhook(
        createMockRequest(events) as any,
        events,
        '',
        '',
      );

      expect(result.processed).toBe(1);
      expect(prisma.credentialInvitation.update).toHaveBeenCalledWith({
        where: { id: 'invitation-1' },
        data: { clickedAt: expect.any(Date) },
      });
    });

    it('should handle bounce event', async () => {
      const events = [
        createEventWithInvitationId('bounce', 'invitation-1', {
          reason: 'Invalid email',
          status: '550',
        }),
      ];

      const mockInvitation = {
        id: 'invitation-1',
        credentialId: 'credential-1',
        credential: { id: 'credential-1' },
      };

      mockPrismaService.credentialInvitation.findUnique.mockResolvedValue(
        mockInvitation,
      );
      mockPrismaService.credentialInvitation.update.mockResolvedValue({});

      const result = await controller.handleWebhook(
        createMockRequest(events) as any,
        events,
        '',
        '',
      );

      expect(result.processed).toBe(1);
      expect(prisma.credentialInvitation.update).toHaveBeenCalledWith({
        where: { id: 'invitation-1' },
        data: {
          isActive: false,
          errorMessage: expect.stringContaining('bounce'),
        },
      });
    });

    it('should handle events without invitationId gracefully', async () => {
      const events = [
        {
          event: 'delivered',
          email: 'unknown@example.com',
          timestamp: Math.floor(Date.now() / 1000),
          sg_message_id: 'msg-no-id',
          // No category with invitationId
        },
      ];

      const result = await controller.handleWebhook(
        createMockRequest(events) as any,
        events,
        '',
        '',
      );

      // Event is processed but nothing happens (no invitationId extracted)
      expect(result.success).toBe(true);
      expect(prisma.credentialInvitation.findUnique).not.toHaveBeenCalled();
    });

    it('should handle invitation not found', async () => {
      const events = [
        createEventWithInvitationId('delivered', 'non-existent-id'),
      ];

      mockPrismaService.credentialInvitation.findUnique.mockResolvedValue(null);

      const result = await controller.handleWebhook(
        createMockRequest(events) as any,
        events,
        '',
        '',
      );

      expect(result.success).toBe(true);
      // Event is processed but update is not called because invitation not found
      expect(prisma.credentialInvitation.update).not.toHaveBeenCalled();
    });

    it('should process multiple events', async () => {
      const events = [
        createEventWithInvitationId('delivered', 'invitation-1'),
        createEventWithInvitationId('open', 'invitation-2'),
      ];

      const mockInvitation1 = {
        id: 'invitation-1',
        credentialId: 'credential-1',
        credential: { id: 'credential-1' },
      };

      const mockInvitation2 = {
        id: 'invitation-2',
        credentialId: 'credential-2',
        credential: { id: 'credential-2' },
      };

      mockPrismaService.credentialInvitation.findUnique
        .mockResolvedValueOnce(mockInvitation1)
        .mockResolvedValueOnce(mockInvitation2);
      mockPrismaService.credentialInvitation.update.mockResolvedValue({});
      mockPrismaService.supplierCredential.findUnique.mockResolvedValue({
        id: 'credential-2',
        status: SupplierCredentialStatus.INVITATION_SENT,
      });
      mockPrismaService.supplierCredential.update.mockResolvedValue({});

      const result = await controller.handleWebhook(
        createMockRequest(events) as any,
        events,
        '',
        '',
      );

      expect(result.processed).toBe(2);
    });
  });
});
