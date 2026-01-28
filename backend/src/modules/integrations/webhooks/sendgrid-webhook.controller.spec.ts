import { Test, TestingModule } from '@nestjs/testing';
import { SendGridWebhookController } from './sendgrid-webhook.controller';
import { PrismaService } from '../../../prisma/prisma.service';
import { SupplierCredentialStatus } from '@prisma/client';

describe('SendGridWebhookController', () => {
    let controller: SendGridWebhookController;
    let prisma: PrismaService;

    const mockPrismaService = {
        credentialInvitation: {
            findFirst: jest.fn(),
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

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [SendGridWebhookController],
            providers: [
                {
                    provide: PrismaService,
                    useValue: mockPrismaService,
                },
            ],
        }).compile();

        controller = module.get<SendGridWebhookController>(SendGridWebhookController);
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
            const events = [
                {
                    event: 'delivered',
                    email: 'test@example.com',
                    timestamp: Math.floor(Date.now() / 1000),
                    sg_message_id: 'msg-123',
                },
            ];

            const mockInvitation = {
                id: 'invitation-1',
                credentialId: 'credential-1',
                type: 'EMAIL',
            };

            mockPrismaService.credentialInvitation.findFirst.mockResolvedValue(mockInvitation);
            mockPrismaService.credentialInvitation.update.mockResolvedValue({});

            const result = await controller.handleWebhook(events, '', '');

            expect(result.success).toBe(true);
            expect(result.processed).toBe(1);
            expect(prisma.credentialInvitation.update).toHaveBeenCalled();
        });

        it('should process opened event and update credential status', async () => {
            const events = [
                {
                    event: 'open',
                    email: 'test@example.com',
                    timestamp: Math.floor(Date.now() / 1000),
                    sg_message_id: 'msg-123',
                },
            ];

            const mockInvitation = {
                id: 'invitation-1',
                credentialId: 'credential-1',
                type: 'EMAIL',
            };

            const mockCredential = {
                id: 'credential-1',
                status: SupplierCredentialStatus.INVITATION_SENT,
            };

            mockPrismaService.credentialInvitation.findFirst.mockResolvedValue(mockInvitation);
            mockPrismaService.credentialInvitation.update.mockResolvedValue({});
            mockPrismaService.supplierCredential.findUnique.mockResolvedValue(mockCredential);
            mockPrismaService.supplierCredential.update.mockResolvedValue({});
            mockPrismaService.credentialStatusHistory.create.mockResolvedValue({});

            const result = await controller.handleWebhook(events, '', '');

            expect(result.success).toBe(true);
            expect(result.processed).toBe(1);
            expect(prisma.supplierCredential.update).toHaveBeenCalledWith({
                where: { id: 'credential-1' },
                data: { status: SupplierCredentialStatus.INVITATION_OPENED },
            });
        });

        it('should process click event and start onboarding', async () => {
            const events = [
                {
                    event: 'click',
                    email: 'test@example.com',
                    timestamp: Math.floor(Date.now() / 1000),
                    url: 'https://example.com/onboarding/token',
                },
            ];

            const mockInvitation = {
                id: 'invitation-1',
                credentialId: 'credential-1',
                type: 'EMAIL',
            };

            const mockCredential = {
                id: 'credential-1',
                status: SupplierCredentialStatus.INVITATION_OPENED,
            };

            mockPrismaService.credentialInvitation.findFirst.mockResolvedValue(mockInvitation);
            mockPrismaService.credentialInvitation.update.mockResolvedValue({});
            mockPrismaService.supplierCredential.findUnique.mockResolvedValue(mockCredential);
            mockPrismaService.supplierCredential.update.mockResolvedValue({});
            mockPrismaService.credentialStatusHistory.create.mockResolvedValue({});

            const result = await controller.handleWebhook(events, '', '');

            expect(result.processed).toBe(1);
            expect(prisma.supplierCredential.update).toHaveBeenCalledWith({
                where: { id: 'credential-1' },
                data: { status: SupplierCredentialStatus.ONBOARDING_STARTED },
            });
        });

        it('should handle bounce event', async () => {
            const events = [
                {
                    event: 'bounce',
                    email: 'test@example.com',
                    timestamp: Math.floor(Date.now() / 1000),
                    reason: 'Invalid email',
                    status: '550',
                },
            ];

            const mockInvitation = {
                id: 'invitation-1',
                credentialId: 'credential-1',
                type: 'EMAIL',
            };

            mockPrismaService.credentialInvitation.findFirst.mockResolvedValue(mockInvitation);
            mockPrismaService.credentialInvitation.update.mockResolvedValue({});

            const result = await controller.handleWebhook(events, '', '');

            expect(result.processed).toBe(1);
            expect(prisma.credentialInvitation.update).toHaveBeenCalledWith({
                where: { id: 'invitation-1' },
                data: {
                    errorMessage: expect.stringContaining('bounce'),
                    isActive: false,
                },
            });
        });

        it('should skip duplicate events', async () => {
            const events = [
                {
                    event: 'delivered',
                    email: 'test@example.com',
                    timestamp: 1234567890,
                    sg_message_id: 'msg-123',
                },
            ];

            const mockInvitation = {
                id: 'invitation-1',
                credentialId: 'credential-1',
                type: 'EMAIL',
            };

            mockPrismaService.credentialInvitation.findFirst.mockResolvedValue(mockInvitation);
            mockPrismaService.credentialInvitation.update.mockResolvedValue({});

            // Process first time
            await controller.handleWebhook(events, '', '');

            // Process second time (should be skipped)
            const result = await controller.handleWebhook(events, '', '');

            expect(result.skipped).toBe(1);
        });

        it('should handle invitation not found', async () => {
            const events = [
                {
                    event: 'delivered',
                    email: 'unknown@example.com',
                    timestamp: Math.floor(Date.now() / 1000),
                },
            ];

            mockPrismaService.credentialInvitation.findFirst.mockResolvedValue(null);

            const result = await controller.handleWebhook(events, '', '');

            expect(result.processed).toBe(0);
        });

        it('should process multiple events', async () => {
            const events = [
                {
                    event: 'delivered',
                    email: 'test1@example.com',
                    timestamp: Math.floor(Date.now() / 1000),
                    sg_message_id: 'msg-1',
                },
                {
                    event: 'open',
                    email: 'test2@example.com',
                    timestamp: Math.floor(Date.now() / 1000),
                    sg_message_id: 'msg-2',
                },
            ];

            mockPrismaService.credentialInvitation.findFirst.mockResolvedValue({
                id: 'invitation-1',
                credentialId: 'credential-1',
                type: 'EMAIL',
            });
            mockPrismaService.credentialInvitation.update.mockResolvedValue({});
            mockPrismaService.supplierCredential.findUnique.mockResolvedValue({
                id: 'credential-1',
                status: SupplierCredentialStatus.INVITATION_SENT,
            });
            mockPrismaService.supplierCredential.update.mockResolvedValue({});
            mockPrismaService.credentialStatusHistory.create.mockResolvedValue({});

            const result = await controller.handleWebhook(events, '', '');

            expect(result.processed).toBe(2);
        });
    });
});
